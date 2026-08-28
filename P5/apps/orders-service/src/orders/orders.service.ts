import { Injectable, Logger } from '@nestjs/common';
import { OrderStatus as PrismaOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsClientService } from '../products-client/products-client.service';
import { RabbitmqPublisherService } from '../rabbitmq/rabbitmq-publisher.service';
import { CreateOrderInput } from './dto/create-order.input';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly productsClient: ProductsClientService,
    private readonly publisher: RabbitmqPublisherService,
  ) {}

  async findAll() {
    return this.prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
  }

  /**
   * Orquesta la creación de una orden: valida cada producto contra
   * products-service (vía GraphQL), descuenta stock allí mismo, calcula el
   * total con los precios "server-side" (nunca confía en el precio del
   * cliente) y persiste la orden + sus líneas en la base de datos propia.
   */
  async create(input: CreateOrderInput) {
    const resolvedItems = [];
    let total = 0;

    for (const item of input.items) {
      const product = await this.productsClient.getProduct(item.productId);
      await this.productsClient.decreaseStock(item.productId, item.quantity);

      const unitPrice = product.price;
      total += unitPrice * item.quantity;

      resolvedItems.push({
        productId: product.id,
        productName: product.name,
        unitPrice,
        quantity: item.quantity,
      });
    }

    const order = await this.prisma.order.create({
      data: {
        userId: input.userId,
        status: PrismaOrderStatus.CONFIRMED,
        total,
        items: { create: resolvedItems },
      },
      include: { items: true },
    });

    // Flujo asíncrono (Práctica 5, sección D): la orden ya quedó persistida
    // de forma síncrona arriba; publicar el evento es "fire and forget" — no
    // se espera aquí a que notifications-service lo procese, solo a que el
    // broker confirme la publicación (y eso ni siquiera bloquea la
    // respuesta: no se hace `await`).
    void this.publisher.publish('order.created', {
      orderId: order.id,
      userId: order.userId,
      total: Number(order.total),
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        unitPrice: Number(item.unitPrice),
        quantity: item.quantity,
      })),
      createdAt: order.createdAt.toISOString(),
    });

    this.logger.log(`Orden ${order.id} creada, evento order.created encolado`);

    return order;
  }
}

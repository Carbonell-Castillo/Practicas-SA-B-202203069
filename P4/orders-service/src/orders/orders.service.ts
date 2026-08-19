import { Injectable } from '@nestjs/common';
import { OrderStatus as PrismaOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsClientService } from '../products-client/products-client.service';
import { CreateOrderInput } from './dto/create-order.input';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsClient: ProductsClientService,
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

    return this.prisma.order.create({
      data: {
        userId: input.userId,
        status: PrismaOrderStatus.CONFIRMED,
        total,
        items: { create: resolvedItems },
      },
      include: { items: true },
    });
  }
}

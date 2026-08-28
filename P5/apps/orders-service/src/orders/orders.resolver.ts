import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { OrdersService } from './orders.service';
import { OrderModel } from './models/order.model';
import { CreateOrderInput } from './dto/create-order.input';

@Resolver(() => OrderModel)
export class OrdersResolver {
  constructor(private readonly ordersService: OrdersService) {}

  @Query(() => [OrderModel], { description: 'Lista todas las órdenes.' })
  orders() {
    return this.ordersService.findAll();
  }

  @Query(() => OrderModel, { nullable: true, description: 'Obtiene una orden por id.' })
  order(@Args('id', { type: () => ID }) id: string) {
    return this.ordersService.findOne(id);
  }

  @Mutation(() => OrderModel, { description: 'Crea una orden validando stock/precio contra products-service.' })
  createOrder(@Args('input') input: CreateOrderInput) {
    return this.ordersService.create(input);
  }
}

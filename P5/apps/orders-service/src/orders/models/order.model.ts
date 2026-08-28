import { Field, Float, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

registerEnumType(OrderStatus, { name: 'OrderStatus' });

@ObjectType()
export class OrderItemModel {
  @Field(() => ID)
  id: string;

  @Field(() => Int)
  productId: number;

  @Field()
  productName: string;

  @Field(() => Float)
  unitPrice: number;

  @Field(() => Int)
  quantity: number;
}

@ObjectType()
export class OrderModel {
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field(() => OrderStatus)
  status: OrderStatus;

  @Field(() => Float)
  total: number;

  @Field(() => [OrderItemModel])
  items: OrderItemModel[];

  @Field()
  createdAt: Date;
}

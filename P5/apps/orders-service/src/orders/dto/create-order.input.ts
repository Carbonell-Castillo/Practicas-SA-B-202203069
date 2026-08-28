import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsInt, IsNotEmpty, IsString, Min, ValidateNested } from 'class-validator';

@InputType()
export class OrderItemInput {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  productId: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  quantity: number;
}

@InputType()
export class CreateOrderInput {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  userId: string;

  @Field(() => [OrderItemInput])
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  @ArrayMinSize(1)
  items: OrderItemInput[];
}

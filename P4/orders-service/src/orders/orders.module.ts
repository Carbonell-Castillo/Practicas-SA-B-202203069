import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductsClientModule } from '../products-client/products-client.module';
import { OrdersService } from './orders.service';
import { OrdersResolver } from './orders.resolver';
import { OrdersController } from './orders.controller';

@Module({
  imports: [PrismaModule, ProductsClientModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersResolver],
})
export class OrdersModule {}

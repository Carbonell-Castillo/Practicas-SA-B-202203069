import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProductsClientService } from './products-client.service';

@Module({
  imports: [HttpModule],
  providers: [ProductsClientService],
  exports: [ProductsClientService],
})
export class ProductsClientModule {}

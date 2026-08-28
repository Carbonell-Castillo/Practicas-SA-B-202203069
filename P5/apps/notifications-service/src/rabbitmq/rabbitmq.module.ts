import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RabbitmqConsumerService } from './rabbitmq-consumer.service';

@Module({
  imports: [PrismaModule],
  providers: [RabbitmqConsumerService],
})
export class RabbitmqModule {}

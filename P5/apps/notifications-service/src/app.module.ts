import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { RabbitmqModule } from './rabbitmq/rabbitmq.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, RabbitmqModule],
  controllers: [HealthController],
})
export class AppModule {}

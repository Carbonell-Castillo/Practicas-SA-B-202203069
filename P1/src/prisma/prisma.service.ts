import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/** Única puerta de entrada al cliente de Prisma; gestiona su ciclo de vida junto con Nest. */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Conexión a la base de datos establecida.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

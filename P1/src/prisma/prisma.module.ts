import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/** Global: PrismaService se inyecta en cualquier módulo sin volver a declararlo. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

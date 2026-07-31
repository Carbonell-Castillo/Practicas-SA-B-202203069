import { Module } from '@nestjs/common';
import { SOLICITUD_OPERATIVA_REPOSITORY } from './repositories/solicitud-operativa.repository.interface';
import { SolicitudOperativaRepository } from './repositories/solicitud-operativa.repository';
import { SolicitudesController } from './solicitudes.controller';
import { SolicitudesService } from './solicitudes.service';

@Module({
  controllers: [SolicitudesController],
  providers: [
    SolicitudesService,
    {
      provide: SOLICITUD_OPERATIVA_REPOSITORY,
      useClass: SolicitudOperativaRepository,
    },
  ],
})
export class SolicitudesModule {}

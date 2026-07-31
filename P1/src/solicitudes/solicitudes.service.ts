import { Inject, Injectable } from '@nestjs/common';
import { EstadoSolicitud } from '@prisma/client';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { SolicitudResponseDto } from './dto/solicitud-response.dto';
import { UpdateEstadoSolicitudDto } from './dto/update-estado-solicitud.dto';
import { UpdateSolicitudDto } from './dto/update-solicitud.dto';
import { toSolicitudResponseDto } from './mappers/solicitud.mapper';
import type { ISolicitudOperativaRepository } from './repositories/solicitud-operativa.repository.interface';
import { SOLICITUD_OPERATIVA_REPOSITORY } from './repositories/solicitud-operativa.repository.interface';

/** Casos de uso del módulo. No conoce HTTP ni Prisma: solo el contrato del repositorio. */
@Injectable()
export class SolicitudesService {
  constructor(
    @Inject(SOLICITUD_OPERATIVA_REPOSITORY)
    private readonly repository: ISolicitudOperativaRepository,
  ) {}

  async findAll(): Promise<SolicitudResponseDto[]> {
    const solicitudes = await this.repository.findAllOrderedByRecent();
    return solicitudes.map(toSolicitudResponseDto);
  }

  async create(dto: CreateSolicitudDto): Promise<SolicitudResponseDto> {
    const created = await this.repository.create({
      titulo: dto.titulo,
      areaSolicitante: dto.areaSolicitante,
      prioridad: dto.prioridad,
      costoEstimado: dto.costoEstimado,
      estado: dto.estado ?? EstadoSolicitud.REGISTRADA,
    });
    return toSolicitudResponseDto(created);
  }

  async update(
    id: string,
    dto: UpdateSolicitudDto,
  ): Promise<SolicitudResponseDto> {
    const updated = await this.repository.update(id, {
      titulo: dto.titulo,
      areaSolicitante: dto.areaSolicitante,
      prioridad: dto.prioridad,
      costoEstimado: dto.costoEstimado,
      estado: dto.estado,
    });
    return toSolicitudResponseDto(updated);
  }

  async updateEstado(
    id: string,
    dto: UpdateEstadoSolicitudDto,
  ): Promise<SolicitudResponseDto> {
    const updated = await this.repository.updateEstado(id, dto.estado);
    return toSolicitudResponseDto(updated);
  }

  async remove(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}

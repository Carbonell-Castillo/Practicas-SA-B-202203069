import { SolicitudOperativa } from '@prisma/client';
import { SolicitudResponseDto } from '../dto/solicitud-response.dto';

/**
 * Prisma.Decimal no es serializable a número de forma segura por defecto
 * (se serializa a string). Aquí es el único lugar donde se decide esa conversión.
 */
export function toSolicitudResponseDto(
  entity: SolicitudOperativa,
): SolicitudResponseDto {
  return {
    id: entity.id,
    titulo: entity.titulo,
    areaSolicitante: entity.areaSolicitante,
    prioridad: entity.prioridad,
    costoEstimado: entity.costoEstimado.toNumber(),
    estado: entity.estado,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

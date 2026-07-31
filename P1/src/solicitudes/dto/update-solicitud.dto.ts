import { ApiProperty, OmitType } from '@nestjs/swagger';
import { EstadoSolicitud } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { CreateSolicitudDto } from './create-solicitud.dto';
import { ESTADO_SOLICITUD_INVALIDO } from './estado-solicitud.messages';

/**
 * Reemplazo completo del recurso (PUT): reutiliza las reglas de titulo,
 * areaSolicitante, prioridad y costoEstimado de CreateSolicitudDto, pero aquí
 * estado es obligatorio, no opcional, ya que PUT no admite actualizaciones parciales.
 */
export class UpdateSolicitudDto extends OmitType(CreateSolicitudDto, [
  'estado',
] as const) {
  @ApiProperty({
    description:
      'Estado de la solicitud. Obligatorio: PUT reemplaza el recurso completo',
    enum: EstadoSolicitud,
    example: EstadoSolicitud.EN_PROCESO,
  })
  @IsEnum(EstadoSolicitud, { message: ESTADO_SOLICITUD_INVALIDO })
  estado!: EstadoSolicitud;
}

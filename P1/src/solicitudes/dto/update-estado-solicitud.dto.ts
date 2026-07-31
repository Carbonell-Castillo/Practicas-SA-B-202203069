import { ApiProperty } from '@nestjs/swagger';
import { EstadoSolicitud } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { ESTADO_SOLICITUD_INVALIDO } from './estado-solicitud.messages';

/**
 * Único campo declarado a propósito: junto con forbidNonWhitelisted global,
 * cualquier otra propiedad en el body (titulo, prioridad, etc.) se rechaza con 400.
 */
export class UpdateEstadoSolicitudDto {
  @ApiProperty({
    description: 'Nuevo estado de la solicitud',
    enum: EstadoSolicitud,
    example: EstadoSolicitud.FINALIZADA,
  })
  @IsEnum(EstadoSolicitud, { message: ESTADO_SOLICITUD_INVALIDO })
  estado!: EstadoSolicitud;
}

import { ApiProperty } from '@nestjs/swagger';
import { EstadoSolicitud } from '@prisma/client';

export class SolicitudResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  id!: string;

  @ApiProperty({ example: 'Adquisición de nuevo servidor' })
  titulo!: string;

  @ApiProperty({ example: 'Infraestructura TI' })
  areaSolicitante!: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 3 })
  prioridad!: number;

  @ApiProperty({ example: 2500.0 })
  costoEstimado!: number;

  @ApiProperty({ enum: EstadoSolicitud, example: EstadoSolicitud.REGISTRADA })
  estado!: EstadoSolicitud;

  @ApiProperty({ example: '2026-07-30T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-07-30T12:00:00.000Z' })
  updatedAt!: Date;
}

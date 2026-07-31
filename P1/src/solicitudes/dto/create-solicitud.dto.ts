import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoSolicitud } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { trimTransform } from '../../common/transformers/trim.transformer';
import { ESTADO_SOLICITUD_INVALIDO } from './estado-solicitud.messages';

/** costo_estimado es DECIMAL(12,2) en la base: 10 dígitos enteros + 2 decimales como máximo. */
export const COSTO_ESTIMADO_MAXIMO = 9_999_999_999.99;

export class CreateSolicitudDto {
  @ApiProperty({
    description: 'Título de la solicitud operativa',
    maxLength: 150,
    example: 'Adquisición de nuevo servidor',
  })
  @Transform(trimTransform)
  @IsString()
  @IsNotEmpty({ message: 'titulo no puede estar vacío' })
  @MaxLength(150)
  titulo!: string;

  @ApiProperty({
    description: 'Área que origina la solicitud',
    maxLength: 100,
    example: 'Infraestructura TI',
  })
  @Transform(trimTransform)
  @IsString()
  @IsNotEmpty({ message: 'areaSolicitante no puede estar vacío' })
  @MaxLength(100)
  areaSolicitante!: string;

  @ApiProperty({
    description: 'Prioridad de la solicitud, de 1 (baja) a 5 (alta)',
    minimum: 1,
    maximum: 5,
    example: 3,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  prioridad!: number;

  @ApiProperty({
    description: 'Costo estimado, mayor o igual a cero, máximo dos decimales',
    minimum: 0,
    maximum: COSTO_ESTIMADO_MAXIMO,
    example: 2500.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(COSTO_ESTIMADO_MAXIMO)
  costoEstimado!: number;

  @ApiPropertyOptional({
    description:
      'Estado inicial de la solicitud. Si se omite, se asigna REGISTRADA',
    enum: EstadoSolicitud,
    default: EstadoSolicitud.REGISTRADA,
    example: EstadoSolicitud.REGISTRADA,
  })
  @IsOptional()
  @IsEnum(EstadoSolicitud, { message: ESTADO_SOLICITUD_INVALIDO })
  estado?: EstadoSolicitud;
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { SolicitudResponseDto } from './dto/solicitud-response.dto';
import { UpdateEstadoSolicitudDto } from './dto/update-estado-solicitud.dto';
import { UpdateSolicitudDto } from './dto/update-solicitud.dto';
import { SolicitudesService } from './solicitudes.service';

/** Solo recibe peticiones HTTP y devuelve respuestas; toda la lógica vive en el service. */
@ApiTags('solicitudes')
@Controller('solicitudes')
export class SolicitudesController {
  constructor(private readonly solicitudesService: SolicitudesService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lista todas las solicitudes operativas, de la más reciente a la más antigua',
  })
  @ApiOkResponse({ type: SolicitudResponseDto, isArray: true })
  findAll(): Promise<SolicitudResponseDto[]> {
    return this.solicitudesService.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registra una nueva solicitud operativa' })
  @ApiBody({ type: CreateSolicitudDto })
  @ApiCreatedResponse({
    type: SolicitudResponseDto,
    description: 'Solicitud creada',
  })
  @ApiBadRequestResponse({ description: 'Datos de entrada inválidos' })
  create(@Body() dto: CreateSolicitudDto): Promise<SolicitudResponseDto> {
    return this.solicitudesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Reemplaza por completo una solicitud operativa existente',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Id de la solicitud' })
  @ApiBody({ type: UpdateSolicitudDto })
  @ApiOkResponse({
    type: SolicitudResponseDto,
    description: 'Solicitud actualizada',
  })
  @ApiNotFoundResponse({ description: 'No existe una solicitud con ese id' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSolicitudDto,
  ): Promise<SolicitudResponseDto> {
    return this.solicitudesService.update(id, dto);
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Actualiza únicamente el estado de una solicitud' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Id de la solicitud' })
  @ApiBody({ type: UpdateEstadoSolicitudDto })
  @ApiOkResponse({
    type: SolicitudResponseDto,
    description: 'Estado actualizado',
  })
  @ApiNotFoundResponse({ description: 'No existe una solicitud con ese id' })
  updateEstado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEstadoSolicitudDto,
  ): Promise<SolicitudResponseDto> {
    return this.solicitudesService.updateEstado(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina una solicitud operativa' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Id de la solicitud' })
  @ApiNoContentResponse({
    description: 'Eliminada correctamente, sin cuerpo de respuesta',
  })
  @ApiNotFoundResponse({ description: 'No existe una solicitud con ese id' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.solicitudesService.remove(id);
  }
}

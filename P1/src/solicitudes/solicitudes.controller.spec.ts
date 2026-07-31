import { EstadoSolicitud } from '@prisma/client';
import { SolicitudResponseDto } from './dto/solicitud-response.dto';
import { SolicitudesController } from './solicitudes.controller';
import { SolicitudesService } from './solicitudes.service';

function buildResponseDto(
  overrides: Partial<SolicitudResponseDto> = {},
): SolicitudResponseDto {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    titulo: 'Adquisición de nuevo servidor',
    areaSolicitante: 'Infraestructura TI',
    prioridad: 3,
    costoEstimado: 2500,
    estado: EstadoSolicitud.REGISTRADA,
    createdAt: new Date('2026-07-01T10:00:00.000Z'),
    updatedAt: new Date('2026-07-01T10:00:00.000Z'),
    ...overrides,
  };
}

function buildServiceMock(): jest.Mocked<SolicitudesService> {
  return {
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateEstado: jest.fn(),
    remove: jest.fn(),
  } as unknown as jest.Mocked<SolicitudesService>;
}

/**
 * El controlador no tiene lógica propia; estas pruebas solo verifican que
 * cada método delega en el service correcto con los argumentos correctos.
 * La validación de DTOs y los códigos HTTP reales se cubren en e2e.
 */
describe('SolicitudesController', () => {
  let service: jest.Mocked<SolicitudesService>;
  let controller: SolicitudesController;

  beforeEach(() => {
    service = buildServiceMock();
    controller = new SolicitudesController(service);
  });

  it('findAll delega en service.findAll', async () => {
    const solicitudes = [buildResponseDto()];
    service.findAll.mockResolvedValue(solicitudes);

    await expect(controller.findAll()).resolves.toBe(solicitudes);
    expect(service.findAll).toHaveBeenCalledTimes(1);
  });

  it('create delega en service.create con el DTO recibido', async () => {
    const dto = {
      titulo: 'Adquisición de nuevo servidor',
      areaSolicitante: 'Infraestructura TI',
      prioridad: 3,
      costoEstimado: 2500,
    };
    service.create.mockResolvedValue(buildResponseDto());

    await controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('update delega en service.update con el id y el DTO recibidos', async () => {
    const dto = {
      titulo: 'Actualizado',
      areaSolicitante: 'Infraestructura TI',
      prioridad: 5,
      costoEstimado: 100,
      estado: EstadoSolicitud.EN_PROCESO,
    };
    service.update.mockResolvedValue(buildResponseDto(dto));

    await controller.update('11111111-1111-4111-8111-111111111111', dto);

    expect(service.update).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      dto,
    );
  });

  it('updateEstado delega en service.updateEstado con el id y el DTO recibidos', async () => {
    const dto = { estado: EstadoSolicitud.FINALIZADA };
    service.updateEstado.mockResolvedValue(buildResponseDto(dto));

    await controller.updateEstado('11111111-1111-4111-8111-111111111111', dto);

    expect(service.updateEstado).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      dto,
    );
  });

  it('remove delega en service.remove con el id recibido', async () => {
    service.remove.mockResolvedValue(undefined);

    await controller.remove('11111111-1111-4111-8111-111111111111');

    expect(service.remove).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
    );
  });
});

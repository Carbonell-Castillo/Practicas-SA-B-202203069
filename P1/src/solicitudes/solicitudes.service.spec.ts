import { EstadoSolicitud, Prisma, SolicitudOperativa } from '@prisma/client';
import { SolicitudNotFoundError } from './errors/solicitud-not-found.error';
import type { ISolicitudOperativaRepository } from './repositories/solicitud-operativa.repository.interface';
import { SolicitudesService } from './solicitudes.service';

function buildSolicitud(
  overrides: Partial<SolicitudOperativa> = {},
): SolicitudOperativa {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    titulo: 'Adquisición de nuevo servidor',
    areaSolicitante: 'Infraestructura TI',
    prioridad: 3,
    costoEstimado: new Prisma.Decimal('2500.00'),
    estado: EstadoSolicitud.REGISTRADA,
    createdAt: new Date('2026-07-01T10:00:00.000Z'),
    updatedAt: new Date('2026-07-01T10:00:00.000Z'),
    ...overrides,
  };
}

function buildRepositoryMock(): jest.Mocked<ISolicitudOperativaRepository> {
  return {
    findAllOrderedByRecent: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateEstado: jest.fn(),
    delete: jest.fn(),
  };
}

describe('SolicitudesService', () => {
  let repository: jest.Mocked<ISolicitudOperativaRepository>;
  let service: SolicitudesService;

  beforeEach(() => {
    repository = buildRepositoryMock();
    service = new SolicitudesService(repository);
  });

  describe('findAll', () => {
    it('devuelve las solicitudes del repositorio con costoEstimado convertido a number', async () => {
      // Arrange
      repository.findAllOrderedByRecent.mockResolvedValue([
        buildSolicitud({
          id: 'a',
          costoEstimado: new Prisma.Decimal('1800.50'),
        }),
      ]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(repository.findAllOrderedByRecent).toHaveBeenCalledTimes(1);
      expect(result).toEqual([
        expect.objectContaining({ id: 'a', costoEstimado: 1800.5 }),
      ]);
    });
  });

  describe('create', () => {
    it('asigna REGISTRADA cuando el DTO no trae estado', async () => {
      repository.create.mockResolvedValue(buildSolicitud());

      await service.create({
        titulo: 'Adquisición de nuevo servidor',
        areaSolicitante: 'Infraestructura TI',
        prioridad: 3,
        costoEstimado: 2500,
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ estado: EstadoSolicitud.REGISTRADA }),
      );
    });

    it('respeta el estado del DTO cuando se provee explícitamente', async () => {
      repository.create.mockResolvedValue(
        buildSolicitud({ estado: EstadoSolicitud.EN_PROCESO }),
      );

      await service.create({
        titulo: 'Adquisición de nuevo servidor',
        areaSolicitante: 'Infraestructura TI',
        prioridad: 3,
        costoEstimado: 2500,
        estado: EstadoSolicitud.EN_PROCESO,
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ estado: EstadoSolicitud.EN_PROCESO }),
      );
    });
  });

  describe('update', () => {
    it('reemplaza todos los campos y propaga SolicitudNotFoundError si el repositorio la lanza', async () => {
      repository.update.mockRejectedValue(
        new SolicitudNotFoundError('id-inexistente'),
      );

      await expect(
        service.update('id-inexistente', {
          titulo: 'Actualizado',
          areaSolicitante: 'Infraestructura TI',
          prioridad: 5,
          costoEstimado: 100,
          estado: EstadoSolicitud.FINALIZADA,
        }),
      ).rejects.toBeInstanceOf(SolicitudNotFoundError);
    });
  });

  describe('updateEstado', () => {
    it('solo envía el nuevo estado al repositorio, sin tocar el resto de campos', async () => {
      repository.updateEstado.mockResolvedValue(
        buildSolicitud({ estado: EstadoSolicitud.FINALIZADA }),
      );

      const result = await service.updateEstado(
        '11111111-1111-4111-8111-111111111111',
        {
          estado: EstadoSolicitud.FINALIZADA,
        },
      );

      expect(repository.updateEstado).toHaveBeenCalledWith(
        '11111111-1111-4111-8111-111111111111',
        EstadoSolicitud.FINALIZADA,
      );
      expect(repository.updateEstado).toHaveBeenCalledTimes(1);
      expect(result.estado).toBe(EstadoSolicitud.FINALIZADA);
    });

    it('propaga SolicitudNotFoundError si el repositorio la lanza', async () => {
      repository.updateEstado.mockRejectedValue(
        new SolicitudNotFoundError('id-inexistente'),
      );

      await expect(
        service.updateEstado('id-inexistente', {
          estado: EstadoSolicitud.FINALIZADA,
        }),
      ).rejects.toBeInstanceOf(SolicitudNotFoundError);
    });
  });

  describe('remove', () => {
    it('delega la eliminación en el repositorio', async () => {
      repository.delete.mockResolvedValue(undefined);

      await service.remove('11111111-1111-4111-8111-111111111111');

      expect(repository.delete).toHaveBeenCalledWith(
        '11111111-1111-4111-8111-111111111111',
      );
    });

    it('propaga SolicitudNotFoundError si el repositorio la lanza', async () => {
      repository.delete.mockRejectedValue(
        new SolicitudNotFoundError('id-inexistente'),
      );

      await expect(service.remove('id-inexistente')).rejects.toBeInstanceOf(
        SolicitudNotFoundError,
      );
    });
  });
});

import { EstadoSolicitud, Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { SolicitudNotFoundError } from '../errors/solicitud-not-found.error';
import { SolicitudOperativaRepository } from './solicitud-operativa.repository';
import type { UpdateSolicitudData } from './solicitud-operativa.repository.interface';

function buildPrismaError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    'Record to update not found.',
    {
      code,
      clientVersion: '6.19.3',
    },
  );
}

function buildPrismaServiceMock(): {
  prisma: PrismaService;
  update: jest.Mock;
  delete: jest.Mock;
} {
  const update = jest.fn();
  const del = jest.fn();
  const prisma = {
    solicitudOperativa: { update, delete: del },
  } as unknown as PrismaService;
  return { prisma, update, delete: del };
}

const datosDeActualizacion: UpdateSolicitudData = {
  titulo: 'Actualización de prueba',
  areaSolicitante: 'Infraestructura TI',
  prioridad: 3,
  costoEstimado: 100,
  estado: EstadoSolicitud.REGISTRADA,
};

/**
 * Única pieza de lógica propia del repositorio: traducir P2025 (Prisma) en
 * SolicitudNotFoundError (dominio) y dejar cualquier otro error intacto para
 * que el filtro global lo sanee como 500. Antes solo se ejercitaba
 * indirectamente vía e2e contra una base real.
 */
describe('SolicitudOperativaRepository', () => {
  it('convierte P2025 en SolicitudNotFoundError al actualizar un id inexistente', async () => {
    const { prisma, update } = buildPrismaServiceMock();
    update.mockRejectedValue(buildPrismaError('P2025'));
    const repository = new SolicitudOperativaRepository(prisma);

    await expect(
      repository.update('id-inexistente', datosDeActualizacion),
    ).rejects.toBeInstanceOf(SolicitudNotFoundError);
  });

  it('convierte P2025 en SolicitudNotFoundError al eliminar un id inexistente', async () => {
    const { prisma, delete: del } = buildPrismaServiceMock();
    del.mockRejectedValue(buildPrismaError('P2025'));
    const repository = new SolicitudOperativaRepository(prisma);

    await expect(repository.delete('id-inexistente')).rejects.toBeInstanceOf(
      SolicitudNotFoundError,
    );
  });

  it('no traduce otros códigos de error de Prisma: los propaga sin modificar', async () => {
    const { prisma, update } = buildPrismaServiceMock();
    const otroError = buildPrismaError('P2000');
    update.mockRejectedValue(otroError);
    const repository = new SolicitudOperativaRepository(prisma);

    await expect(
      repository.update('algun-id', datosDeActualizacion),
    ).rejects.toBe(otroError);
  });
});

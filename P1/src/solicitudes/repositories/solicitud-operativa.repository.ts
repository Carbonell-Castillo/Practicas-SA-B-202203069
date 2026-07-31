import { Injectable } from '@nestjs/common';
import { EstadoSolicitud, Prisma, SolicitudOperativa } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SolicitudNotFoundError } from '../errors/solicitud-not-found.error';
import {
  CreateSolicitudData,
  ISolicitudOperativaRepository,
  UpdateSolicitudData,
} from './solicitud-operativa.repository.interface';

const RECORD_NOT_FOUND = 'P2025';

/** Única clase que conoce Prisma; consultas siempre parametrizadas vía el query builder. */
@Injectable()
export class SolicitudOperativaRepository implements ISolicitudOperativaRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllOrderedByRecent(): Promise<SolicitudOperativa[]> {
    // Desempate por id: dos registros con el mismo createdAt (mismo
    // milisegundo) no tienen, si no, un orden determinista en Postgres.
    return this.prisma.solicitudOperativa.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  create(data: CreateSolicitudData): Promise<SolicitudOperativa> {
    return this.prisma.solicitudOperativa.create({ data });
  }

  async update(
    id: string,
    data: UpdateSolicitudData,
  ): Promise<SolicitudOperativa> {
    try {
      return await this.prisma.solicitudOperativa.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.rethrowKnownErrors(error, id);
    }
  }

  async updateEstado(
    id: string,
    estado: EstadoSolicitud,
  ): Promise<SolicitudOperativa> {
    try {
      return await this.prisma.solicitudOperativa.update({
        where: { id },
        data: { estado },
      });
    } catch (error) {
      this.rethrowKnownErrors(error, id);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.solicitudOperativa.delete({ where: { id } });
    } catch (error) {
      this.rethrowKnownErrors(error, id);
    }
  }

  /**
   * Un solo lugar para traducir el "no encontrado" de Prisma (P2025) a un error
   * de dominio. Así update/updateEstado/delete resuelven la existencia en la
   * misma consulta que hacen su trabajo, sin un findById previo redundante.
   */
  private rethrowKnownErrors(error: unknown, id: string): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === RECORD_NOT_FOUND
    ) {
      throw new SolicitudNotFoundError(id);
    }
    throw error;
  }
}

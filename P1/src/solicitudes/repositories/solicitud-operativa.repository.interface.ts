import { EstadoSolicitud, SolicitudOperativa } from '@prisma/client';

export interface CreateSolicitudData {
  titulo: string;
  areaSolicitante: string;
  prioridad: number;
  costoEstimado: number;
  estado: EstadoSolicitud;
}

export type UpdateSolicitudData = CreateSolicitudData;

/** Contrato del repositorio: el resto de la app depende de esto, nunca de Prisma directamente. */
export interface ISolicitudOperativaRepository {
  findAllOrderedByRecent(): Promise<SolicitudOperativa[]>;
  create(data: CreateSolicitudData): Promise<SolicitudOperativa>;
  /** Debe lanzar SolicitudNotFoundError si el id no existe. */
  update(id: string, data: UpdateSolicitudData): Promise<SolicitudOperativa>;
  /** Debe lanzar SolicitudNotFoundError si el id no existe. */
  updateEstado(
    id: string,
    estado: EstadoSolicitud,
  ): Promise<SolicitudOperativa>;
  /** Debe lanzar SolicitudNotFoundError si el id no existe. */
  delete(id: string): Promise<void>;
}

export const SOLICITUD_OPERATIVA_REPOSITORY = Symbol(
  'SOLICITUD_OPERATIVA_REPOSITORY',
);

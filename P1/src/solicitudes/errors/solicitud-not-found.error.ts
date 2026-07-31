/**
 * Error de dominio, independiente de HTTP y de Prisma.
 * El AllExceptionsFilter es el único responsable de traducirlo a un 404.
 */
export class SolicitudNotFoundError extends Error {
  constructor(id: string) {
    super(`No existe una solicitud operativa con id "${id}".`);
    this.name = 'SolicitudNotFoundError';
  }
}

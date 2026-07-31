export interface SolicitudApiResponse {
  id: string;
  titulo: string;
  areaSolicitante: string;
  prioridad: number;
  costoEstimado: number;
  estado: 'REGISTRADA' | 'EN_PROCESO' | 'FINALIZADA';
  createdAt: string;
  updatedAt: string;
}

/** Forma del cuerpo de error que arma AllExceptionsFilter (ver src/common/filters). */
export interface ErrorApiResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

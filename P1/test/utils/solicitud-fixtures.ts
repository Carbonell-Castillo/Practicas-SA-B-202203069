export interface SolicitudPayloadOverrides {
  titulo?: string;
  areaSolicitante?: string;
  prioridad?: number;
  costoEstimado?: number;
  estado?: string;
}

/**
 * Payload base descriptivo y realista. Todas las specs parten de esto y
 * solo sobrescriben el campo que quieren poner a prueba.
 */
export function buildCreateSolicitudPayload(
  overrides: SolicitudPayloadOverrides = {},
): SolicitudPayloadOverrides {
  return {
    titulo: 'Compra de licencias antivirus',
    areaSolicitante: 'Seguridad de la Información',
    prioridad: 4,
    costoEstimado: 1875.5,
    ...overrides,
  };
}

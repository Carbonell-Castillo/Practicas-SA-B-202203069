import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  buildCreateSolicitudPayload,
  SolicitudPayloadOverrides,
} from './solicitud-fixtures';
import { SolicitudApiResponse } from './types';

/** Crea una solicitud vía HTTP real y devuelve el cuerpo tipado; falla el test si no responde 201. */
export async function createSolicitud(
  app: INestApplication<App>,
  overrides: SolicitudPayloadOverrides = {},
): Promise<SolicitudApiResponse> {
  const response = await request(app.getHttpServer())
    .post('/solicitudes')
    .send(buildCreateSolicitudPayload(overrides))
    .expect(201);

  return response.body as SolicitudApiResponse;
}

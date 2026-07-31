import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp } from './utils/create-test-app';
import { prismaTestClient } from './utils/prisma-test-client';
import { buildCreateSolicitudPayload } from './utils/solicitud-fixtures';

describe('Manejo de errores de /solicitudes (e2e)', () => {
  let app: INestApplication<App>;
  const idInexistente = '99999999-9999-4999-8999-999999999999';

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await prismaTestClient.solicitudOperativa.deleteMany();
  });

  afterAll(async () => {
    await app.close();
    await prismaTestClient.$disconnect();
  });

  it('responde 404 al actualizar (PUT) un registro inexistente', () => {
    return request(app.getHttpServer())
      .put(`/solicitudes/${idInexistente}`)
      .send(buildCreateSolicitudPayload({ estado: 'REGISTRADA' }))
      .expect(404);
  });

  it('responde 404 al actualizar el estado (PATCH) de un registro inexistente', () => {
    return request(app.getHttpServer())
      .patch(`/solicitudes/${idInexistente}/estado`)
      .send({ estado: 'FINALIZADA' })
      .expect(404);
  });

  it('responde 404 al eliminar un registro inexistente', () => {
    return request(app.getHttpServer())
      .delete(`/solicitudes/${idInexistente}`)
      .expect(404);
  });

  it('responde 400 (no 500) ante un id con formato de UUID inválido en PUT', () => {
    return request(app.getHttpServer())
      .put('/solicitudes/no-es-un-uuid')
      .send(buildCreateSolicitudPayload({ estado: 'REGISTRADA' }))
      .expect(400);
  });

  it('responde 400 ante un id con formato de UUID inválido en PATCH /estado', () => {
    return request(app.getHttpServer())
      .patch('/solicitudes/no-es-un-uuid/estado')
      .send({ estado: 'REGISTRADA' })
      .expect(400);
  });

  it('responde 400 ante un id con formato de UUID inválido en DELETE', () => {
    return request(app.getHttpServer()).delete('/solicitudes/123').expect(400);
  });
});

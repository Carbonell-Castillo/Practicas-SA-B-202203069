import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createSolicitud } from './utils/api';
import { createTestApp } from './utils/create-test-app';
import { prismaTestClient } from './utils/prisma-test-client';

describe('DELETE /solicitudes/:id (e2e)', () => {
  let app: INestApplication<App>;

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

  it('elimina una solicitud existente y responde 204 sin cuerpo', async () => {
    const creada = await createSolicitud(app);

    const response = await request(app.getHttpServer())
      .delete(`/solicitudes/${creada.id}`)
      .expect(204);

    expect(response.body).toEqual({});
    const eliminada = await prismaTestClient.solicitudOperativa.findUnique({
      where: { id: creada.id },
    });
    expect(eliminada).toBeNull();
  });
});

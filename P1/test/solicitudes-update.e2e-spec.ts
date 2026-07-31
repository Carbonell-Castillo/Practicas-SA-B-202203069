import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createSolicitud } from './utils/api';
import { createTestApp } from './utils/create-test-app';
import { prismaTestClient } from './utils/prisma-test-client';
import { buildCreateSolicitudPayload } from './utils/solicitud-fixtures';
import { ErrorApiResponse, SolicitudApiResponse } from './utils/types';

describe('PUT /solicitudes/:id (e2e)', () => {
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

  it('actualiza completamente una solicitud existente y responde 200', async () => {
    const creada = await createSolicitud(app);

    const response = await request(app.getHttpServer())
      .put(`/solicitudes/${creada.id}`)
      .send(
        buildCreateSolicitudPayload({
          titulo: 'Compra de licencias antivirus (revisión)',
          prioridad: 5,
          costoEstimado: 2100.75,
          estado: 'EN_PROCESO',
        }),
      )
      .expect(200);

    expect(response.body).toMatchObject({
      id: creada.id,
      titulo: 'Compra de licencias antivirus (revisión)',
      prioridad: 5,
      costoEstimado: 2100.75,
      estado: 'EN_PROCESO',
    });
  });

  it('rechaza un PUT incompleto (sin costoEstimado) con 400 y no modifica el registro', async () => {
    const creada = await createSolicitud(app);
    const completo = buildCreateSolicitudPayload({ estado: 'EN_PROCESO' });
    const incompleto = {
      titulo: completo.titulo,
      areaSolicitante: completo.areaSolicitante,
      prioridad: completo.prioridad,
      estado: completo.estado,
      // costoEstimado deliberadamente omitido: PUT no admite parciales
    };

    await request(app.getHttpServer())
      .put(`/solicitudes/${creada.id}`)
      .send(incompleto)
      .expect(400);

    const sinCambios =
      await prismaTestClient.solicitudOperativa.findUniqueOrThrow({
        where: { id: creada.id },
      });
    expect(sinCambios.estado).toBe('REGISTRADA');
  });
});

describe('PATCH /solicitudes/:id/estado (e2e)', () => {
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

  it('actualiza únicamente el estado y responde 200', async () => {
    const creada = await createSolicitud(app);

    const response = await request(app.getHttpServer())
      .patch(`/solicitudes/${creada.id}/estado`)
      .send({ estado: 'FINALIZADA' })
      .expect(200);

    const body = response.body as SolicitudApiResponse;
    expect(body.estado).toBe('FINALIZADA');
  });

  it('no modifica titulo, areaSolicitante, prioridad ni costoEstimado', async () => {
    const creada = await createSolicitud(app);

    const response = await request(app.getHttpServer())
      .patch(`/solicitudes/${creada.id}/estado`)
      .send({ estado: 'EN_PROCESO' })
      .expect(200);

    expect(response.body).toMatchObject({
      titulo: creada.titulo,
      areaSolicitante: creada.areaSolicitante,
      prioridad: creada.prioridad,
      costoEstimado: creada.costoEstimado,
    });
  });

  it('rechaza campos adicionales en el body con 400', async () => {
    const creada = await createSolicitud(app);

    const response = await request(app.getHttpServer())
      .patch(`/solicitudes/${creada.id}/estado`)
      .send({ estado: 'EN_PROCESO', prioridad: 1 })
      .expect(400);

    const body = response.body as ErrorApiResponse;
    expect((body.message as string[]).join(' ')).toContain('prioridad');
  });
});

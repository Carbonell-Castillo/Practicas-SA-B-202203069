import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { COSTO_ESTIMADO_MAXIMO } from '../src/solicitudes/dto/create-solicitud.dto';
import { createTestApp } from './utils/create-test-app';
import { prismaTestClient } from './utils/prisma-test-client';
import { buildCreateSolicitudPayload } from './utils/solicitud-fixtures';
import { ErrorApiResponse, SolicitudApiResponse } from './utils/types';

describe('POST /solicitudes (e2e)', () => {
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

  it('registra una solicitud válida y responde 201 con estado REGISTRADA por defecto', async () => {
    // Arrange
    const payload = buildCreateSolicitudPayload();

    // Act
    const response = await request(app.getHttpServer())
      .post('/solicitudes')
      .send(payload)
      .expect(201);

    // Assert
    const body = response.body as SolicitudApiResponse;
    expect(body).toMatchObject({
      titulo: 'Compra de licencias antivirus',
      areaSolicitante: 'Seguridad de la Información',
      prioridad: 4,
      costoEstimado: 1875.5,
      estado: 'REGISTRADA',
    });
    expect(body.id).toEqual(expect.any(String));

    const guardada = await prismaTestClient.solicitudOperativa.findUnique({
      where: { id: body.id },
    });
    expect(guardada?.estado).toBe('REGISTRADA');
  });

  it('rechaza prioridad menor que 1 con 400 y no crea el registro', async () => {
    const response = await request(app.getHttpServer())
      .post('/solicitudes')
      .send(buildCreateSolicitudPayload({ prioridad: 0 }))
      .expect(400);

    const body = response.body as ErrorApiResponse;
    expect(body.message).toEqual(
      expect.arrayContaining([expect.stringContaining('prioridad')]),
    );
    await expect(prismaTestClient.solicitudOperativa.count()).resolves.toBe(0);
  });

  it('rechaza prioridad mayor que 5 con 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/solicitudes')
      .send(buildCreateSolicitudPayload({ prioridad: 6 }))
      .expect(400);

    const body = response.body as ErrorApiResponse;
    expect(body.message).toEqual(
      expect.arrayContaining([expect.stringContaining('prioridad')]),
    );
  });

  it('rechaza un costo estimado negativo con 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/solicitudes')
      .send(buildCreateSolicitudPayload({ costoEstimado: -0.01 }))
      .expect(400);

    const body = response.body as ErrorApiResponse;
    expect(body.message).toEqual(
      expect.arrayContaining([expect.stringContaining('costoEstimado')]),
    );
  });

  it('rechaza un costo estimado que excede la precisión DECIMAL(12,2) de la base con 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/solicitudes')
      .send(
        buildCreateSolicitudPayload({
          costoEstimado: COSTO_ESTIMADO_MAXIMO + 1,
        }),
      )
      .expect(400);

    const body = response.body as ErrorApiResponse;
    expect(body.message).toEqual(
      expect.arrayContaining([expect.stringContaining('costoEstimado')]),
    );
  });

  it('rechaza un titulo que excede los 150 caracteres con 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/solicitudes')
      .send(buildCreateSolicitudPayload({ titulo: 'a'.repeat(151) }))
      .expect(400);

    const body = response.body as ErrorApiResponse;
    expect(body.message).toEqual(
      expect.arrayContaining([expect.stringContaining('titulo')]),
    );
  });

  it('rechaza una areaSolicitante que excede los 100 caracteres con 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/solicitudes')
      .send(buildCreateSolicitudPayload({ areaSolicitante: 'a'.repeat(101) }))
      .expect(400);

    const body = response.body as ErrorApiResponse;
    expect(body.message).toEqual(
      expect.arrayContaining([expect.stringContaining('areaSolicitante')]),
    );
  });

  it('rechaza un titulo compuesto únicamente de espacios (tras recortarlos) con 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/solicitudes')
      .send(buildCreateSolicitudPayload({ titulo: '     ' }))
      .expect(400);

    const body = response.body as ErrorApiResponse;
    expect(body.message).toEqual(
      expect.arrayContaining([expect.stringContaining('titulo')]),
    );
  });

  it('recorta los espacios de titulo y areaSolicitante antes de guardarlos', async () => {
    const response = await request(app.getHttpServer())
      .post('/solicitudes')
      .send(
        buildCreateSolicitudPayload({
          titulo: '   Compra de licencias antivirus   ',
          areaSolicitante: '  Seguridad de la Información  ',
        }),
      )
      .expect(201);

    const body = response.body as SolicitudApiResponse;
    expect(body.titulo).toBe('Compra de licencias antivirus');
    expect(body.areaSolicitante).toBe('Seguridad de la Información');
  });

  it('rechaza un estado fuera del enum permitido con 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/solicitudes')
      .send(buildCreateSolicitudPayload({ estado: 'CANCELADA' }))
      .expect(400);

    const body = response.body as ErrorApiResponse;
    expect(body.message).toEqual(
      expect.arrayContaining([expect.stringContaining('estado')]),
    );
  });

  it('rechaza propiedades no declaradas en el DTO con 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/solicitudes')
      .send({ ...buildCreateSolicitudPayload(), aprobadoPor: 'gerencia-ti' })
      .expect(400);

    const body = response.body as ErrorApiResponse;
    expect((body.message as string[]).join(' ')).toContain('aprobadoPor');
  });
});

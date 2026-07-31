import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createSolicitud } from './utils/api';
import { createTestApp } from './utils/create-test-app';
import { prismaTestClient } from './utils/prisma-test-client';

describe('GET /solicitudes (e2e)', () => {
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

  it('devuelve una lista vacía con 200 cuando no hay solicitudes registradas', async () => {
    const response = await request(app.getHttpServer())
      .get('/solicitudes')
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it('devuelve todas las solicitudes, de la más reciente a la más antigua, con 200', async () => {
    // Arrange: se crean en orden y luego se fuerza el createdAt de la más
    // antigua hacia el pasado -- determinista, sin esperas arbitrarias, para
    // que un posible empate de milisegundos no vuelva la prueba inestable.
    const antigua = await createSolicitud(app, {
      titulo: 'Reemplazo de switches de red',
    });
    const reciente = await createSolicitud(app, {
      titulo: 'Capacitación en ciberseguridad',
    });
    await prismaTestClient.solicitudOperativa.update({
      where: { id: antigua.id },
      data: { createdAt: new Date(Date.now() - 60_000) },
    });

    // Act
    const response = await request(app.getHttpServer())
      .get('/solicitudes')
      .expect(200);

    // Assert
    const ids = (response.body as { id: string }[]).map((s) => s.id);
    expect(ids).toEqual([reciente.id, antigua.id]);
  });
});

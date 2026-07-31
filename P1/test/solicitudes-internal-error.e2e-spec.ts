import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { SOLICITUD_OPERATIVA_REPOSITORY } from '../src/solicitudes/repositories/solicitud-operativa.repository.interface';
import type { ISolicitudOperativaRepository } from '../src/solicitudes/repositories/solicitud-operativa.repository.interface';
import { applyGlobalHttpConfig } from './utils/create-test-app';
import { buildCreateSolicitudPayload } from './utils/solicitud-fixtures';

/**
 * No hay ninguna clave de negocio única expuesta por la API pública con la
 * que provocar de forma natural un error real de Prisma (P2002, conexión
 * caída, etc.), y derribar la base de datos real de pruebas para simularlo
 * sería frágil y afectaría al resto de la suite. Por eso, y solo aquí, se
 * sustituye el repositorio por un doble que falla de forma controlada: es la
 * única manera de ejercer el camino de error inesperado con determinismo.
 */
const SENSITIVE_DETAIL =
  'password authentication failed for user "solicitudes_user" at host 10.0.4.12';

describe('Sanitización de errores internos inesperados (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const failingRepository: Partial<ISolicitudOperativaRepository> = {
      create: jest.fn().mockRejectedValue(new Error(SENSITIVE_DETAIL)),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SOLICITUD_OPERATIVA_REPOSITORY)
      .useValue(failingRepository)
      .compile();

    app = moduleRef.createNestApplication();
    applyGlobalHttpConfig(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde 500 genérico y nunca filtra el mensaje interno original', async () => {
    const response = await request(app.getHttpServer())
      .post('/solicitudes')
      .send(buildCreateSolicitudPayload())
      .expect(500);

    expect(JSON.stringify(response.body)).not.toContain(SENSITIVE_DETAIL);
    expect(response.body).toMatchObject({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Ha ocurrido un error interno. Intenta nuevamente más tarde.',
    });
  });
});

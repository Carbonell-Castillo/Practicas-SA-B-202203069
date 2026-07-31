import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';

/**
 * Replica exactamente la configuración global de main.ts (pipes + filtro).
 * Debe mantenerse en sincronía a mano: un TestingModule armado solo con
 * AppModule NO hereda lo que bootstrap() configura sobre la instancia de Nest.
 */
export function applyGlobalHttpConfig(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
}

export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>();
  applyGlobalHttpConfig(app);
  await app.init();
  return app;
}

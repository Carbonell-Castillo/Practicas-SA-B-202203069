import { LogLevel, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

const LOG_LEVELS: Record<string, LogLevel[]> = {
  debug: ['error', 'warn', 'log', 'debug', 'verbose'],
  log: ['error', 'warn', 'log'],
  info: ['error', 'warn', 'log'],
  warn: ['error', 'warn'],
  error: ['error'],
};

async function bootstrap(): Promise<void> {
  const logger = LOG_LEVELS[process.env.LOG_LEVEL ?? 'log'] ?? LOG_LEVELS.log;
  const app = await NestFactory.create(AppModule, { logger });

  app.setGlobalPrefix('api', { exclude: ['graphql'] });

  app.enableCors({ origin: true, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Orders Service API')
    .setDescription('Contrato REST del microservicio de órdenes (Práctica 4). El API GraphQL vive en /graphql.')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.PORT ?? 4003);
  await app.listen(port);

  console.log(`Orders service ejecutándose en http://localhost:${port}/api (GraphQL en /graphql)`);
}

void bootstrap();

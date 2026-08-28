import { LogLevel, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

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

  app.use(cookieParser());

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Auth Service API')
    .setDescription('Contrato REST del microservicio de autenticación (Práctica 4): registro, login, rutas protegidas por rol.')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.PORT ?? 4000);

  await app.listen(port);

  console.log(`Backend ejecutándose en http://localhost:${port}/api`);
}

void bootstrap();
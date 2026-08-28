import { LogLevel, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

function resolveLogLevels(level?: string): LogLevel[] {
  const order: LogLevel[] = ['error', 'warn', 'log', 'debug', 'verbose'];
  const idx = order.indexOf((level as LogLevel) ?? 'log');
  return order.slice(0, idx === -1 ? 3 : idx + 1);
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: resolveLogLevels(process.env.LOG_LEVEL),
  });

  app.setGlobalPrefix('api');

  app.enableCors({ origin: true, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Notifications Service API')
    .setDescription(
      'Contrato REST del microservicio de notificaciones (Práctica 5). Consume eventos order.created y cron.summary desde RabbitMQ (sa.events) de forma asíncrona.',
    )
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.PORT ?? 4004);
  await app.listen(port);

  console.log(`Notifications service ejecutándose en http://localhost:${port}/api`);
}

void bootstrap();

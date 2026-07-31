import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger expone el esquema completo de la API; en producción no debe
  // quedar accesible sin autenticación.
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Sistema de Solicitudes Operativas')
      .setDescription(
        'API REST para el registro y seguimiento de solicitudes operativas',
      )
      .setVersion('1.0')
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, swaggerDocument);
  }

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

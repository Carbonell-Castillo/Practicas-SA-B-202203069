import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Role } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? 'Administrador';

  if (!email || !password) {
    console.error(
      'Define ADMIN_EMAIL y ADMIN_PASSWORD en backend/.env antes de correr el seed.',
    );
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  const usersService = app.get(UsersService);

  const existing = await usersService.findByEmail(email);
  if (existing) {
    console.log(`Ya existe un usuario con el correo ${email}, no se creó nada.`);
    await app.close();
    return;
  }

  await usersService.create({ name, email, password }, Role.ADMIN);
  console.log(`Admin creado correctamente: ${email}`);

  await app.close();
}

main().catch((error) => {
  console.error('Error al ejecutar el seed:', error);
  process.exit(1);
});

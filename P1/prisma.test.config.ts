// Config de Prisma exclusiva para la CLI en el contexto de pruebas e2e.
// Solo la usan los comandos `prisma migrate ...` invocados con
// `--config prisma.test.config.ts` (ver el script "pretest:e2e" de package.json).
// El proceso de Nest/Jest en sí NO lee este archivo: su DATABASE_URL sale de
// test/setup-env.ts, que carga .env.test directamente en process.env.
import { resolve } from 'node:path';
import { config } from 'dotenv';

config({ path: resolve(__dirname, '.env.test'), override: true });

import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  engine: 'classic',
  datasource: {
    url: env('DATABASE_URL'),
  },
});

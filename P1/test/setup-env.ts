// Se ejecuta antes de que se cargue cualquier archivo *.e2e-spec.ts (ver
// "setupFiles" en jest-e2e.json). Es la ÚNICA fuente de DATABASE_URL para el
// proceso de Jest: nada más en la app carga .env fuera de la CLI de Prisma.
import { resolve } from 'node:path';
import { config } from 'dotenv';

config({ path: resolve(__dirname, '..', '.env.test'), override: true });

const databaseUrl = process.env.DATABASE_URL ?? '';

if (!databaseUrl.includes('test')) {
  throw new Error(
    'Las pruebas e2e deben apuntar a una base de datos de pruebas: ' +
      'DATABASE_URL no contiene "test". Verifica que exista .env.test ' +
      '(copia .env.test.example) y que apunte al servicio "postgres-test".',
  );
}

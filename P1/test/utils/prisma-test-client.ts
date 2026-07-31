import { PrismaClient } from '@prisma/client';

/**
 * Cliente Prisma independiente del que usa la app, para arrange/assert/cleanup
 * directo en la base de pruebas (test/setup-env.ts ya garantizó que
 * DATABASE_URL apunta ahí antes de que este módulo se importe).
 */
export const prismaTestClient = new PrismaClient();

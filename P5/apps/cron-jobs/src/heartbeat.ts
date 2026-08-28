import { PrismaService } from './prisma/prisma.service';

/**
 * Modo "heartbeat" del CronJob: inserta una fila en cron_executions dejando
 * que Prisma calcule executedAt (@default(now())). Se invoca cada 2 minutos
 * desde el CronJob de Kubernetes correspondiente.
 */
export async function runHeartbeat(prisma: PrismaService): Promise<void> {
  const carnet = process.env.STUDENT_CARNET ?? '202203069';

  await prisma.cronExecution.create({
    data: { carnet },
  });

  console.log(`[cron-heartbeat] inserted execution carnet=${carnet} at ${new Date().toISOString()}`);
}

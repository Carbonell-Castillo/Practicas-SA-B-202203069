import { LogLevel } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { runHeartbeat } from './heartbeat';
import { runSummary } from './summary';

/**
 * Traduce LOG_LEVEL a la lista acumulativa que espera Nest: cada nivel
 * incluye los anteriores (p.ej. "debug" habilita error+warn+log+debug).
 * Se replica igual en los demás servicios de esta práctica.
 */
export function resolveLogLevels(level?: string): LogLevel[] {
  const order: LogLevel[] = ['error', 'warn', 'log', 'debug', 'verbose'];
  const normalized = (level ?? 'log').toLowerCase() as LogLevel;
  const index = order.indexOf(normalized);
  return index === -1 ? order.slice(0, 3) : order.slice(0, index + 1);
}

async function bootstrap(): Promise<void> {
  const mode = process.argv[2];

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: resolveLogLevels(process.env.LOG_LEVEL),
  });

  const prisma = app.get(PrismaService);

  try {
    if (mode === 'heartbeat') {
      await runHeartbeat(prisma);
    } else if (mode === 'summary') {
      await runSummary(prisma);
    } else {
      console.error(`Unknown mode "${mode}", expected "heartbeat" or "summary"`);
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('[cron-jobs] job failed:', err);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();

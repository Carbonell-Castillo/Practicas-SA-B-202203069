import * as amqplib from 'amqplib';
import { PrismaService } from './prisma/prisma.service';

const EXCHANGE = 'sa.events';
const ROUTING_KEY = 'cron.summary';

const CONNECT_MAX_ATTEMPTS = 5;
const CONNECT_MIN_BACKOFF_MS = 1000;
const CONNECT_MAX_BACKOFF_MS = 3000;

interface HourBucket {
  hour: string;
  count: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function truncateToHour(date: Date): string {
  return `${date.toISOString().slice(0, 13)}:00:00.000Z`;
}

/**
 * Conecta a RabbitMQ con un pequeño retry loop acotado: este job corre una
 * sola vez por invocación (one-shot), así que no tiene sentido reintentar
 * indefinidamente. Si tras CONNECT_MAX_ATTEMPTS intentos no logra conectar,
 * propaga el error para que el Job de Kubernetes falle y backoffLimit /
 * failedJobsHistoryLimit se encarguen del resto.
 */
async function connectWithRetry(url: string): Promise<amqplib.ChannelModel> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= CONNECT_MAX_ATTEMPTS; attempt++) {
    try {
      return await amqplib.connect(url);
    } catch (error) {
      lastError = error;
      const backoff = Math.min(
        CONNECT_MAX_BACKOFF_MS,
        CONNECT_MIN_BACKOFF_MS + (attempt - 1) * 500,
      );
      console.error(
        `[cron-summary] RabbitMQ connect attempt ${attempt}/${CONNECT_MAX_ATTEMPTS} failed: ${(error as Error).message}`,
      );
      if (attempt < CONNECT_MAX_ATTEMPTS) {
        await sleep(backoff);
      }
    }
  }

  throw new Error(
    `[cron-summary] could not connect to RabbitMQ after ${CONNECT_MAX_ATTEMPTS} attempts: ${(lastError as Error)?.message ?? lastError}`,
  );
}

/**
 * Modo "summary" del CronJob: lee todas las filas insertadas por el CronJob
 * "heartbeat", las agrupa por hora, y publica el resumen en RabbitMQ para
 * que notifications-service lo consuma y lo persista. Se invoca cada 10
 * minutos desde el CronJob de Kubernetes correspondiente.
 */
export async function runSummary(prisma: PrismaService): Promise<void> {
  const rows = await prisma.cronExecution.findMany({
    orderBy: { executedAt: 'asc' },
  });

  const counts = new Map<string, number>();
  for (const row of rows) {
    const hour = truncateToHour(new Date(row.executedAt));
    counts.set(hour, (counts.get(hour) ?? 0) + 1);
  }

  const byHour: HourBucket[] = Array.from(counts.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  // El carnet se determina a partir de los datos ya persistidos (fila más
  // reciente), no re-confiando en la variable de entorno: este job
  // demuestra que "consulta los registros generados por el Cronjob 1".
  const mostRecent = rows[rows.length - 1];
  const carnet = mostRecent?.carnet ?? process.env.STUDENT_CARNET ?? '202203069';

  const payload = {
    generatedAt: new Date().toISOString(),
    carnet,
    byHour,
  };

  const rabbitUrl = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672/';
  const connection = await connectWithRetry(rabbitUrl);

  try {
    const channel = await connection.createChannel();
    try {
      await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
      channel.publish(EXCHANGE, ROUTING_KEY, Buffer.from(JSON.stringify(payload)), {
        persistent: true,
        contentType: 'application/json',
      });
    } finally {
      await channel.close();
    }
  } finally {
    await connection.close();
  }

  console.log(`[cron-summary] published summary carnet=${carnet} buckets=${byHour.length}`);
}

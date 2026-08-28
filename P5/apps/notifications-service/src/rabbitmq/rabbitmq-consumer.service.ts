import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { PrismaService } from '../prisma/prisma.service';

const EXCHANGE = 'sa.events';

const ORDER_CREATED_QUEUE = 'notifications.order-created';
const ORDER_CREATED_ROUTING_KEY = 'order.created';

const CRON_SUMMARY_QUEUE = 'notifications.cron-summary';
const CRON_SUMMARY_ROUTING_KEY = 'cron.summary';

const MAX_CONNECT_ATTEMPTS = 10;
const INITIAL_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 10_000;
// Delay before a fresh batch of connection attempts starts again after the
// previous batch exhausted MAX_CONNECT_ATTEMPTS. Keeps the pod alive and
// retrying forever in the background instead of giving up permanently.
const RETRY_AFTER_EXHAUSTION_MS = 30_000;

interface OrderCreatedEvent {
  orderId: string;
  [key: string]: unknown;
}

interface CronSummaryEvent {
  generatedAt: string;
  carnet: string;
  byHour?: unknown[];
  [key: string]: unknown;
}

@Injectable()
export class RabbitmqConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitmqConsumerService.name);

  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;

  private destroyed = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    // Never throw out of onModuleInit: if RabbitMQ isn't ready yet the app
    // should still boot (so the health endpoint responds) and keep retrying
    // the connection in the background.
    void this.connectWithRetry();
  }

  async onModuleDestroy(): Promise<void> {
    this.destroyed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    try {
      await this.channel?.close();
    } catch {
      // ignore errors while shutting down
    }
    try {
      await this.connection?.close();
    } catch {
      // ignore errors while shutting down
    }
  }

  private async connectWithRetry(): Promise<void> {
    if (this.destroyed) {
      return;
    }

    const url = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672/';

    for (let attempt = 1; attempt <= MAX_CONNECT_ATTEMPTS && !this.destroyed; attempt++) {
      try {
        await this.connectAndConsume(url);
        this.logger.log('Conectado a RabbitMQ y consumiendo colas de notificaciones.');
        return;
      } catch (error) {
        const backoff = Math.min(INITIAL_BACKOFF_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS);
        this.logger.warn(
          `Intento ${attempt}/${MAX_CONNECT_ATTEMPTS} de conexión a RabbitMQ falló: ${
            error instanceof Error ? error.message : String(error)
          }. Reintentando en ${backoff}ms.`,
        );
        await this.sleep(backoff);
      }
    }

    if (this.destroyed) {
      return;
    }

    this.logger.warn(
      `No se pudo conectar a RabbitMQ tras ${MAX_CONNECT_ATTEMPTS} intentos. ` +
        `Reintentando de nuevo en ${RETRY_AFTER_EXHAUSTION_MS}ms.`,
    );
    this.scheduleReconnect(RETRY_AFTER_EXHAUSTION_MS);
  }

  private scheduleReconnect(delayMs: number): void {
    if (this.destroyed) {
      return;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = setTimeout(() => {
      void this.connectWithRetry();
    }, delayMs);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async connectAndConsume(url: string): Promise<void> {
    const connection = await amqp.connect(url);
    this.connection = connection;

    connection.on('error', (err: Error) => {
      this.logger.error(`Error en la conexión de RabbitMQ: ${err.message}`);
    });
    connection.on('close', () => {
      this.logger.warn('Conexión a RabbitMQ cerrada.');
      this.connection = null;
      this.channel = null;
      if (!this.destroyed) {
        this.scheduleReconnect(INITIAL_BACKOFF_MS);
      }
    });

    const channel = await connection.createChannel();
    this.channel = channel;

    channel.on('error', (err: Error) => {
      this.logger.error(`Error en el canal de RabbitMQ: ${err.message}`);
    });
    channel.on('close', () => {
      this.logger.warn('Canal de RabbitMQ cerrado.');
    });

    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await channel.prefetch(1);

    await this.setupOrderCreatedConsumer(channel);
    await this.setupCronSummaryConsumer(channel);
  }

  private async setupOrderCreatedConsumer(channel: amqp.Channel): Promise<void> {
    await channel.assertQueue(ORDER_CREATED_QUEUE, { durable: true });
    await channel.bindQueue(ORDER_CREATED_QUEUE, EXCHANGE, ORDER_CREATED_ROUTING_KEY);

    await channel.consume(ORDER_CREATED_QUEUE, (msg) => {
      if (!msg) {
        return;
      }
      void this.handleOrderCreated(channel, msg);
    });
  }

  private async setupCronSummaryConsumer(channel: amqp.Channel): Promise<void> {
    await channel.assertQueue(CRON_SUMMARY_QUEUE, { durable: true });
    await channel.bindQueue(CRON_SUMMARY_QUEUE, EXCHANGE, CRON_SUMMARY_ROUTING_KEY);

    await channel.consume(CRON_SUMMARY_QUEUE, (msg) => {
      if (!msg) {
        return;
      }
      void this.handleCronSummary(channel, msg);
    });
  }

  private async handleOrderCreated(channel: amqp.Channel, msg: amqp.ConsumeMessage): Promise<void> {
    try {
      const body = JSON.parse(msg.content.toString('utf-8')) as OrderCreatedEvent;

      await this.prisma.orderNotification.create({
        data: {
          orderId: body.orderId,
          payload: body as object,
        },
      });

      channel.ack(msg);
    } catch (error) {
      this.logger.error(
        `Error procesando mensaje de order.created: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Nota: un mensaje permanentemente malformado (JSON inválido, sin
      // orderId, etc.) provocará un bucle de requeue infinito con nack(...,
      // true). Se acepta como simplificación para este ejercicio; en
      // producción se enrutaría a una dead-letter queue.
      channel.nack(msg, false, true);
    }
  }

  private async handleCronSummary(channel: amqp.Channel, msg: amqp.ConsumeMessage): Promise<void> {
    try {
      const body = JSON.parse(msg.content.toString('utf-8')) as CronSummaryEvent;

      await this.prisma.cronSummary.create({
        data: {
          generatedAt: new Date(body.generatedAt),
          carnet: body.carnet,
          payload: body as object,
        },
      });

      channel.ack(msg);
    } catch (error) {
      this.logger.error(
        `Error procesando mensaje de cron.summary: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Misma simplificación que en handleOrderCreated: un mensaje
      // permanentemente malformado provocaría un bucle de requeue infinito.
      channel.nack(msg, false, true);
    }
  }
}

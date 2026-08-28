import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqp-connection-manager';
import type { ChannelWrapper } from 'amqp-connection-manager';
import type { ConfirmChannel } from 'amqplib';

const EXCHANGE = 'sa.events';

/**
 * Publisher de larga duración (mantiene una conexión reconectable a
 * RabbitMQ mientras el proceso vive) usado por orders-service para el flujo
 * asíncrono: publica el evento y NO espera a que ningún consumidor lo
 * procese, solo a que el broker confirme la publicación.
 */
@Injectable()
export class RabbitmqPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitmqPublisherService.name);
  private connection!: amqp.AmqpConnectionManager;
  private channel!: ChannelWrapper;

  onModuleInit(): void {
    const url = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672/';
    this.connection = amqp.connect([url]);
    this.connection.on('connect', () => this.logger.log('Conectado a RabbitMQ'));
    this.connection.on('disconnect', (params: { err?: Error }) =>
      this.logger.warn(`Desconectado de RabbitMQ: ${params.err?.message ?? 'sin detalle'}`),
    );

    this.channel = this.connection.createChannel({
      setup: (channel: ConfirmChannel) => channel.assertExchange(EXCHANGE, 'topic', { durable: true }),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }

  /**
   * "Fire and forget" respecto al consumidor: espera solo la confirmación
   * del broker (rápido), nunca el procesamiento del evento. Los fallos se
   * loguean y no se propagan, para que un broker caído nunca tumbe la
   * creación de la orden (que ya se persistió de forma síncrona antes).
   */
  async publish(routingKey: string, payload: unknown): Promise<void> {
    try {
      await this.channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), {
        persistent: true,
        contentType: 'application/json',
      });
      this.logger.log(`Publicado ${routingKey} en el exchange ${EXCHANGE}`);
    } catch (error) {
      this.logger.error(`No se pudo publicar ${routingKey}: ${(error as Error).message}`);
    }
  }
}

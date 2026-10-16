import { trace } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Request, Response, NextFunction } from 'express';
import { Counter, Histogram, collectDefaultMetrics, register } from 'prom-client';

const service = process.env.OTEL_SERVICE_NAME || 'orders-service';
const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const sdk = new NodeSDK({
  serviceName: service,
  traceExporter: endpoint ? new OTLPTraceExporter({ url: `${endpoint.replace(/\/$/, '')}/v1/traces` }) : undefined,
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
collectDefaultMetrics({ prefix: 'orders_' });
const requests = new Counter({ name: 'http_server_requests_total', help: 'Solicitudes HTTP recibidas', labelNames: ['service', 'method', 'route', 'status_code'] });
const duration = new Histogram({ name: 'http_server_request_duration_seconds', help: 'Latencia HTTP del servidor', labelNames: ['service', 'method', 'route', 'status_code'], buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 1, 2, 5] });
export const ordersCreated = new Counter({ name: 'pedidos_creados_total', help: 'Ordenes confirmadas por el negocio', labelNames: ['service'] });

export function structuredLog(level: string, event: string, fields: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, service, event, trace_id: trace.getActiveSpan()?.spanContext().traceId || '', ...fields }));
}
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.path === '/metrics') {
    res.setHeader('Content-Type', register.contentType);
    void register.metrics().then((body) => res.end(body));
    return;
  }
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const route = req.route?.path || req.path.replace(/\/[0-9a-f-]{6,}/gi, '/:id');
    const labels = { service, method: req.method, route, status_code: String(res.statusCode) };
    requests.inc(labels);
    duration.observe(labels, Number(process.hrtime.bigint() - start) / 1e9);
    structuredLog('info', 'http_request', { method: req.method, route, status_code: res.statusCode });
  });
  const delay = Number(process.env.P10_DELAY_MS || 0);
  if (delay > 0 && req.path.startsWith('/api/orders')) {
    setTimeout(next, delay);
  } else {
    next();
  }
}
process.on('SIGTERM', () => { void sdk.shutdown(); });

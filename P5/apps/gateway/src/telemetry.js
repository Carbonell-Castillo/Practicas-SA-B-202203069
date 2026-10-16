const { trace } = require('@opentelemetry/api');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const client = require('prom-client');

const serviceName = process.env.OTEL_SERVICE_NAME || 'gateway';
const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const sdk = new NodeSDK({
  serviceName,
  traceExporter: endpoint ? new OTLPTraceExporter({ url: `${endpoint.replace(/\/$/, '')}/v1/traces` }) : undefined,
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();

client.collectDefaultMetrics({ prefix: 'gateway_' });
const requests = new client.Counter({ name: 'http_server_requests_total', help: 'Solicitudes HTTP recibidas', labelNames: ['service', 'method', 'route', 'status_code'] });
const duration = new client.Histogram({ name: 'http_server_request_duration_seconds', help: 'Latencia HTTP del servidor', labelNames: ['service', 'method', 'route', 'status_code'], buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 1, 2, 5] });
const business = new client.Counter({ name: 'gateway_requests_total', help: 'Solicitudes de negocio que cruzaron el gateway', labelNames: ['route'] });

function traceId() { return trace.getActiveSpan()?.spanContext().traceId || ''; }
function structuredLog(level, event, fields = {}) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, service: serviceName, event, trace_id: traceId(), ...fields }));
}
function metricsMiddleware(req, res, next) {
  if (req.path === '/metrics') return next();
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    const route = req.route?.path || req.path.replace(/\/[0-9a-f-]{6,}/gi, '/:id');
    const labels = { service: serviceName, method: req.method, route, status_code: String(res.statusCode) };
    requests.inc(labels);
    duration.observe(labels, Number(process.hrtime.bigint() - started) / 1e9);
    business.inc({ route });
    structuredLog('info', 'http_request', { method: req.method, route, status_code: res.statusCode });
  });
  next();
}
async function metricsHandler(_req, res) {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
}
module.exports = { metricsMiddleware, metricsHandler, structuredLog };

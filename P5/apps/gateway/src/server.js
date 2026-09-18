const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const {
  AUTH_SERVICE_URL,
  AUTHORIZATION_SERVICE_URL,
  PRODUCTS_SERVICE_URL,
  ORDERS_SERVICE_URL,
  services,
} = require('./routes');

const app = express();
const PORT = Number(process.env.PORT || 8080);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Log-level gate: allows future debug/verbose logging to be toggled via env
// without code changes, without touching proxy routing logic.
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LEVELS = ['error', 'warn', 'info', 'debug'];
const shouldLog = (level) => LEVELS.indexOf(level) <= LEVELS.indexOf(LOG_LEVEL);

// http-proxy-middleware's string pathFilter is a plain `startsWith`, not a
// path-segment match like Express routing: the filter "/api/auth" would also
// (wrongly) match "/api/authorization/...". A pathFilter function lets us
// require a "/" or end-of-string right after the prefix.
const segmentFilter =
  (...prefixes) =>
  (pathname) =>
    prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);

// --- Documentación del gateway (contrato Swagger/OpenAPI) ---
const openapiDocument = YAML.load(path.join(__dirname, '..', 'docs', 'openapi.yaml'));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

// Readiness local para canary: valida el proceso del gateway sin depender de
// que los servicios estables ya hayan terminado su propia promoción.
app.get('/ready', (_req, res) => {
  if (process.env.P8_INDUCED_FAILURE === 'true') {
    return res.status(503).json({ gateway: 'failed', induced: true });
  }
  return res.status(200).json({ gateway: 'ready' });
});

// --- Healthcheck agregado: el gateway consulta a los 4 microservicios ---
app.get('/health', async (_req, res) => {
  // Interruptor controlado para la demostración de reversión de P8. La
  // versión normal siempre lo deja en false; una release de prueba puede
  // hornearlo en la imagen y comprobar que el canary se aborta solo.
  if (process.env.P8_INDUCED_FAILURE === 'true') {
    return res.status(503).json({ gateway: 'failed', induced: true });
  }

  const checks = await Promise.all(
    services.map(async (service) => {
      try {
        const { data, status } = await axios.get(service.url, { timeout: 3000 });
        return { ...service, ok: status === 200, detail: data };
      } catch (error) {
        return { ...service, ok: false, detail: error.message };
      }
    }),
  );

  const allOk = checks.every((c) => c.ok);
  res.status(allOk ? 200 : 503).json({
    gateway: 'ok',
    allServicesUp: allOk,
    services: checks,
  });
});

app.get('/', (_req, res) => {
  res.json({
    service: 'api-gateway',
    description: 'Punto de entrada único del sistema (Práctica 4). Ver /docs para el contrato y /health para el estado de los microservicios.',
    routes: {
      auth: '/api/auth/*',
      protected: '/api/protected/*',
      authorization: '/api/authorization/*',
      products_rest: '/api/products/*',
      products_graphql: '/products/graphql',
      orders_rest: '/api/orders/*',
      orders_graphql: '/orders/graphql',
    },
  });
});

// --- Proxies REST hacia cada microservicio ---
//
// IMPORTANTE: los proxies se montan en la raíz ("/") y filtran por
// `pathFilter`, en vez de usar `app.use('/prefijo', proxy)`. Express recorta
// el prefijo de montaje de `req.url` antes de invocar un middleware montado
// en un path, lo que rompe el `pathRewrite` del proxy (llegaría sin el
// prefijo que se intenta reescribir). Montando en la raíz, el proxy ve la
// URL original completa.
//
// auth-service ya expone sus rutas bajo /api/auth y /api/protected, se
// reenvían tal cual (sin reescribir el path).
app.use(
  createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    pathFilter: segmentFilter('/api/auth', '/api/protected'),
  }),
);

// authorization-service expone /api/validate; el gateway lo publica bajo
// /api/authorization/* para que quede claro a qué microservicio pertenece.
app.use(
  createProxyMiddleware({
    target: AUTHORIZATION_SERVICE_URL,
    changeOrigin: true,
    pathFilter: segmentFilter('/api/authorization'),
    pathRewrite: { '^/api/authorization': '/api' },
  }),
);

// products-service (Python/FastAPI) expone REST en /products y GraphQL en /graphql
app.use(
  createProxyMiddleware({
    target: PRODUCTS_SERVICE_URL,
    changeOrigin: true,
    pathFilter: segmentFilter('/api/products'),
    pathRewrite: { '^/api/products': '/products' },
  }),
);
app.use(
  createProxyMiddleware({
    target: PRODUCTS_SERVICE_URL,
    changeOrigin: true,
    pathFilter: segmentFilter('/products/graphql'),
    pathRewrite: { '^/products/graphql': '/graphql' },
  }),
);

// orders-service (Node/NestJS) expone REST en /api/orders y GraphQL en /graphql
app.use(
  createProxyMiddleware({
    target: ORDERS_SERVICE_URL,
    changeOrigin: true,
    pathFilter: segmentFilter('/api/orders'),
  }),
);
app.use(
  createProxyMiddleware({
    target: ORDERS_SERVICE_URL,
    changeOrigin: true,
    pathFilter: segmentFilter('/orders/graphql'),
    pathRewrite: { '^/orders/graphql': '/graphql' },
  }),
);

app.use((_req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada en el API Gateway' });
});

app.listen(PORT, () => {
  if (shouldLog('info')) {
    console.log(`API Gateway ejecutándose en http://localhost:${PORT}`);
    console.log(`Documentación: http://localhost:${PORT}/docs`);
  }
});

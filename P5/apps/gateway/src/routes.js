// Tabla central de enrutamiento del API Gateway. Cada entrada describe hacia
// qué microservicio se reenvía cada prefijo de ruta que llega al gateway.
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4000';
const AUTHORIZATION_SERVICE_URL = process.env.AUTHORIZATION_SERVICE_URL || 'http://localhost:4001';
const PRODUCTS_SERVICE_URL = process.env.PRODUCTS_SERVICE_URL || 'http://localhost:4002';
const ORDERS_SERVICE_URL = process.env.ORDERS_SERVICE_URL || 'http://localhost:4003';

module.exports = {
  AUTH_SERVICE_URL,
  AUTHORIZATION_SERVICE_URL,
  PRODUCTS_SERVICE_URL,
  ORDERS_SERVICE_URL,

  // Usadas por el healthcheck agregado en GET /health
  services: [
    { name: 'auth-service', url: `${AUTH_SERVICE_URL}/api/health`, language: 'Node.js/NestJS' },
    { name: 'authorization-service', url: `${AUTHORIZATION_SERVICE_URL}/api/health`, language: 'Node.js/NestJS' },
    { name: 'products-service', url: `${PRODUCTS_SERVICE_URL}/health`, language: 'Python/FastAPI' },
    { name: 'orders-service', url: `${ORDERS_SERVICE_URL}/api/health`, language: 'Node.js/NestJS' },
  ],
};

// Prueba de carga (sección I de Make.md) contra el API Gateway a través del
// Ingress. Concurrencia creciente para forzar el HPA (2->5 réplicas,
// objetivo 70% CPU) y luego un enfriamiento largo para observar el
// descenso de réplicas tras el default de estabilización de downscale de
// K8s (~5 min).
//
// Uso:
//   docker run --rm -i --network host -e BASE_URL=http://localhost \
//     grafana/k6 run - < k6/load-test.js
// (o instalar k6 nativo y correr `k6 run k6/load-test.js`).
//
// En paralelo, para capturar evidencia (sección F/I):
//   kubectl get hpa -n sa-p5 -w
//   kubectl get pods -n sa-p5 -l sa-platform/component=orders-service -w

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost';

const errorRate = new Rate('errors');
const orderCreateDuration = new Trend('order_create_duration');

export const options = {
  scenarios: {
    ramping_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 }, // rampa: fuerza CPU hasta que el HPA escale
        { duration: '4m', target: 50 }, // sostenido: tiempo suficiente para ver 2 -> 5 réplicas
        { duration: '1m', target: 0 }, // corta la carga
        { duration: '6m', target: 0 }, // enfriamiento: ventana de estabilización de downscale (~5 min)
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    errors: ['rate<0.05'],
  },
};

export default function () {
  // 70% lecturas de catálogo (products-service vía gateway), 30% creación de
  // orden (orders-service -> products-service síncrono + evento asíncrono a
  // RabbitMQ -> notifications-service).
  const doWrite = Math.random() < 0.3;

  if (doWrite) {
    const payload = JSON.stringify({
      userId: `k6-user-${__VU}`,
      items: [{ productId: 1 + (__ITER % 4), quantity: 1 + (__ITER % 3) }],
    });
    const res = http.post(`${BASE_URL}/api/orders`, payload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'create_order' },
    });
    orderCreateDuration.add(res.timings.duration);
    const ok = check(res, {
      'create order status 200/201': (r) => r.status === 200 || r.status === 201,
    });
    errorRate.add(!ok);
  } else {
    const res = http.get(`${BASE_URL}/api/products`, {
      tags: { name: 'list_products' },
    });
    const ok = check(res, { 'list products status 200': (r) => r.status === 200 });
    errorRate.add(!ok);
  }

  sleep(Math.random() * 0.5 + 0.2);
}

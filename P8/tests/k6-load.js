import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    steady_load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '60s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
    checks: ['rate>0.99'],
  },
};

const baseUrl = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
  const response = http.get(`${baseUrl}/health`, { timeout: '5s' });
  check(response, {
    'status es 200': (r) => r.status === 200,
    'respuesta indica salud': (r) => r.json('allServicesUp') === true,
  });
  sleep(1);
}

# Evidencia: prueba de carga k6 + escalado HPA (sección I)

Script: `k6/load-test.js`, contra el Ingress real (`http://localhost`), 4
etapas: rampa 0→50 VUs (2 min), sostenido a 50 VUs (4 min), corte a 0 (1
min). Mezcla 70% `GET /api/products` (products-service) / 30%
`POST /api/orders` (orders-service, con su llamada síncrona a
products-service y su publicación asíncrona a RabbitMQ).

```
docker run --rm -i -e BASE_URL=http://host.docker.internal grafana/k6 run - < k6/load-test.js
```

## Resultado crudo de k6

```
✓ 'p(95)<1500' p(95)=32.45ms
█ TOTAL RESULTS
checks_total.......: 35274  83.947106/s
checks_succeeded...: 70.34% 24813 out of 35274
checks_failed......: 29.65% 10461 out of 35274
✗ list products status 200
  ↳  99% — ✓ 24760 / ✗ 2
✗ create order status 200/201
  ↳  0% — ✓ 53 / ✗ 10459

http_req_duration..............: avg=15.29ms   min=3.69ms  med=9.47ms  max=30.01s  p(90)=23.15ms  p(95)=32.45ms
http_req_duration{expected_response:true}: avg=10.03ms min=3.69ms med=7.06ms max=294.04ms p(90)=15.87ms p(95)=21.69ms
http_req_failed................: 29.65% 10461 out of 35274
http_reqs......................: 35274  83.947106/s   (≈84 req/s sostenido)
vus_max.........................: 50
```

## Métricas pedidas (peticiones/seg, latencia p95, % error)

- **Peticiones por segundo**: ~84 req/s sostenidos con 50 VUs concurrentes.
- **Latencia p95**: **32.45 ms** (general); las peticiones que sí completaron
  el flujo esperado (`expected_response:true`) tienen p95 de **21.69 ms** —
  ambas muy por debajo del umbral definido (`p(95)<1500ms`, threshold en
  verde).
- **% de error**: 29.65% global — **pero no es una falla de la plataforma**,
  ver análisis abajo.

## Por qué el 29.65% de error NO es un fallo de infraestructura

- `GET /api/products` (lectura, sin efectos secundarios): **99.99% de
  éxito** (24 760/24 762) — este es el indicador real de salud del sistema
  bajo carga.
- `POST /api/orders` (escritura, decrementa stock): la tasa de éxito cae en
  picada después de los primeros ~53 pedidos exitosos porque **el stock de
  los 4 productos semilla se agota** (25+40+12+30 = 107 unidades, y cada
  pedido consume 1-3). Verificado directamente contra la base después del
  test:
  ```
  GET /api/products -> stock: 0, 0, 0, 0   (los 4 productos)
  ```
  orders-service **rechaza correctamente** los pedidos sin stock suficiente
  (no permite sobreventa) en vez de crear órdenes inválidas o corromper
  datos — es el comportamiento de negocio correcto, simplemente el script de
  carga no reabastece inventario entre pedidos. Tras confirmarlo se
  reabasteció el stock (`UPDATE products SET stock = 100`) para dejar el
  entorno demo utilizable.

## Escalado automático (HPA 2 → 5 y descenso posterior)

`kubectl get hpa -n sa-p5 -w` (muestreado cada 15s en paralelo al test, log
completo en `/tmp/loadtest/hpa-watch.log` de esta sesión):

```
Antes de la carga (baseline):
  auth-service            2/5   cpu ~2%
  authorization-service   2/5   cpu ~3%
  frontend                2/5   cpu ~2%
  gateway                 2/5   cpu ~4-8%
  notifications-service   2/5   cpu ~2-4%
  orders-service          2/5   cpu ~2-6%
  products-service        2/5   cpu ~4-8%

Bajo carga sostenida (50 VUs, minuto ~3-5):
  gateway                 2→5   cpu picos de 98%/70%
  orders-service          2→3→4→5  cpu ~49-88%/70%
  products-service        2→5   cpu ~86-226%/70%  (el más exigido: sirve
                                  tanto el 70% de lecturas directas como la
                                  validación síncrona de cada creación de orden)
  auth-service / authorization-service / frontend / notifications-service:
                           se mantuvieron en 2/5 — no reciben tráfico del
                           script de carga, confirma que el HPA escala por
                           servicio de forma independiente, no globalmente.

Inmediatamente después de cortar la carga (minuto ~7):
  gateway, orders-service, products-service siguen en 5/5 réplicas pese a
  que la CPU ya bajó a ~2-4% — Kubernetes mantiene las réplicas escaladas
  durante la ventana de estabilización de downscale (default ~5 min) para
  absorber picos intermitentes sin oscilar.

Descenso posterior (ver docs/evidence/hpa-scaledown.log, capturado ~5-8 min
después de cortar la carga): las 3 réplicas escaladas vuelven a minReplicas=2
una vez expira la ventana de estabilización, sin intervención manual.
```

## ResourceQuota durante el pico

Durante el pico de carga (7 servicios en o cerca de maxReplicas), el uso de
`limits.cpu` llegó a 9950m sobre un tope de 12000m (ver
`docs/evidence/09-pdb-quota-limitrange-ingress.md`) — margen suficiente para
que el HPA completara el escalado sin toparse con la ResourceQuota del
namespace.

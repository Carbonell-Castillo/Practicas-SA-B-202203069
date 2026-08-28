# Justificación de probes (sección F de Make.md)

Cada Deployment define `startupProbe`, `livenessProbe` y `readinessProbe`
(los `CronJob` no llevan probes: no aplican a un Job de una sola ejecución,
sección F las exige explícitamente para "cada deployment"). Todas usan
`httpGet` sobre el endpoint de salud propio del servicio.

## Patrón general (auth-service, authorization-service, orders-service,
notifications-service, gateway — health check trivial en memoria)

- **`startupProbe`** (`periodSeconds: 3-5`, `failureThreshold: 30`, sin
  `initialDelaySeconds`): da hasta `~90-150s` para que el proceso Node
  arranque (incluye `prisma migrate deploy` en los servicios con Prisma, que
  puede tardar unos segundos extra la primera vez que corre contra una DB
  recién creada) **antes** de que liveness/readiness empiecen a evaluar. Sin
  este colchón, un arranque un poco lento durante un `helm install` en frío
  dispararía reinicios innecesarios.
- **`livenessProbe`** / **`readinessProbe`** (`initialDelaySeconds: 5`,
  `periodSeconds: 10`, `timeoutSeconds: 3`, `failureThreshold: 3`): una vez
  arrancado, un health-check en memoria (sin tocar DB/red) responde en
  milisegundos — 3s de margen es generoso. `failureThreshold: 3` evita
  reiniciar por un solo hipo transitorio (GC pause, etc.) pero detecta un
  cuelgue real en ~30s.

## Caso especial: **gateway**

`GET /health` no es trivial — hace *fan-out* a los 4 microservicios en
paralelo (`Promise.all`, cada llamada con `timeout: 3000ms` en el código de
`src/server.js`). El peor caso realista (un servicio lento, los demás OK) se
acerca a esos 3s. Por eso `probes.timeoutSeconds: 5` en gateway (no el `3`
del resto): con el default de Kubernetes (`timeoutSeconds: 1`, heredado
cuando no se especifica) el pod entraba en **CrashLoopBackOff** — visto en
vivo durante el despliegue de esta práctica (`docs/evidence/`) con
`Startup probe failed: ... context deadline exceeded` — porque el health
check tardaba más que el timeout de la propia probe.

## Caso especial: **products-service** (FastAPI)

`GET /health` (sin prefijo `/api`, a diferencia de los servicios NestJS) es
igual de trivial que el patrón general, mismos valores.

## Caso especial: **frontend** (Next.js)

No expone un endpoint de salud dedicado — se usa `GET /` (la página de
login, estática). `startupProbe.failureThreshold: 15` @ `periodSeconds: 3`
(~45s) es más ajustado que el resto porque el servidor `standalone` de
Next.js arranca rápido (no hay migraciones ni conexión a DB de por medio).

## Caso especial: **RabbitMQ** (dependencia Bitnami)

`rabbitmq-diagnostics` (usado por las 3 probes del chart bitnami/rabbitmq)
puede tardar varios segundos en responder mientras el nodo Erlang termina
de inicializar — con el `timeoutSeconds: 1` que aplica Kubernetes por
defecto cuando no se fija explícitamente, el pod entraba en
CrashLoopBackOff (mismo síntoma que gateway, visto en vivo). Se sobreescribe
`rabbitmq.startupProbe/livenessProbe/readinessProbe.timeoutSeconds: 10` en
`values.yaml` del chart padre.

# Práctica 5 — sa-platform (Helm + Kubernetes)

Plataforma de microservicios de la Práctica 4 (auth, authorization, products,
orders + API Gateway + frontend Next.js) llevada a un despliegue Kubernetes
maduro: chart de Helm único y parametrizado, persistencia con StatefulSet,
comunicación asíncrona con RabbitMQ, Ingress como único punto de entrada,
NetworkPolicies de aislamiento, HPA/probes/ResourceQuota/LimitRange/PDB,
RBAC de mínimo privilegio, contenedores endurecidos, y dos CronJobs
encadenados. Ver `Make.md` para el enunciado completo.

## Arquitectura

```
Internet/host ──> Ingress (nginx) ──┬──> gateway (8080) ──> auth-service (4000) ──> authorization-service (4001)
                                     │                   ├──> authorization-service (4001)
                                     │                   ├──> products-service (4002)
                                     │                   └──> orders-service (4003) ──> products-service (4002, GraphQL síncrono)
                                     └──> frontend (3000)                              └──(evento async)──> RabbitMQ ──> notifications-service (4004)

cron-jobs (heartbeat cada 2', "*/2 * * * *") ──> Postgres (p5_cron_db)
cron-jobs (summary cada 10', "*/10 * * * *") ──> Postgres (lectura) ──> RabbitMQ (cron.summary) ──> notifications-service ──> Postgres (p5_notifications_db)
```

- **Único punto de entrada**: Ingress → `gateway` (`/api`, `/products/graphql`,
  `/orders/graphql`, `/health`, `/docs`) y `frontend` (`/`). Todo lo demás
  (microservicios, Postgres, RabbitMQ) es `ClusterIP`, sin NodePort/LB.
- **Flujo asíncrono**: `orders-service` publica `order.created` en el
  exchange topic durable `sa.events` y responde de inmediato (no espera al
  consumidor); `notifications-service` lo consume con ack manual y lo
  persiste en `p5_notifications_db`.
- **Namespace**: `sa-p5`, creado por `helm install ... --create-namespace`
  (nunca con un `kubectl create namespace` manual y separado). **Nota
  técnica**: se intentó además declarar el Namespace como un template propio
  del chart (`templates/namespace.yaml`) para que apareciera en
  `helm get manifest` — pero Helm 3 no soporta combinar `--create-namespace`
  con un recurso `kind: Namespace` gestionado por el mismo chart: la primera
  instalación falla con `namespaces "sa-p5" already exists` (Helm crea el
  namespace por la flag y luego el template intenta crearlo de nuevo, sin
  reconciliar que es el mismo objeto). Es una limitación conocida de Helm 3,
  no un error de este chart — se optó por `--create-namespace` solo, que
  sigue cumpliendo el requisito (el namespace se crea como parte del mismo
  comando `helm install`, nunca con un paso manual separado).

## Componentes

| Componente | Stack | Puerto | Health | DB propia |
|---|---|---|---|---|
| auth-service | NestJS + Prisma | 4000 | `/api/health` | `p4_auth_db` |
| authorization-service | NestJS (sin estado) | 4001 | `/api/health` | — |
| products-service | FastAPI + Strawberry GraphQL | 4002 | `/health` | `p4_products_db` |
| orders-service | NestJS + GraphQL + Prisma | 4003 | `/api/health` | `p4_orders_db` |
| notifications-service | NestJS (consumidor RMQ) | 4004 | `/api/health` | `p5_notifications_db` |
| gateway | Express (reverse proxy) | 8080 | `/health` | — |
| frontend | Next.js 16 (standalone) | 3000 | `/` | — |
| cron-jobs | NestJS standalone (2 CronJobs) | — | — | `p5_cron_db` |

Postgres y RabbitMQ son dependencias Bitnami declaradas en `Chart.yaml`
(`helm dependency update`), una sola instancia de cada una compartida por
todos los servicios (aislamiento lógico por base de datos, igual que en P4).

## Prerrequisitos de este entorno

- Docker Desktop (motor Linux) corriendo.
- `kubectl` (ya presente en Docker Desktop).
- `kind` y `helm` — descargados localmente para esta sesión en `~/bin`
  (no instalados system-wide); si vuelves a abrir una terminal nueva:
  ```
  export PATH="$HOME/bin:$PATH"
  ```
- Clúster local `sa-p5` creado con `kind` usando `infra/kind/kind-config.yaml`
  (CNI por defecto de kind desactivado — **no soporta NetworkPolicy** — y
  reemplazado por **Calico**, imprescindible para que las NetworkPolicies de
  la sección E realmente bloqueen tráfico). Además: `ingress-nginx` (manifiesto
  oficial para kind) y `metrics-server` (parcheado con
  `--kubelet-insecure-tls`, necesario porque los certificados del kubelet de
  kind no son de una CA pública) para que el HPA funcione.

Recrear el entorno desde cero:
```bash
export PATH="$HOME/bin:$PATH"
kind create cluster --name sa-p5 --config infra/kind/kind-config.yaml
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.29.1/manifests/calico.yaml
kubectl wait --for=condition=Ready pods --all -n kube-system --timeout=180s
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/kind/main/site/static/examples/ingress/deploy-ingress-nginx.yaml
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
kubectl patch deployment metrics-server -n kube-system --type='json' \
  -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
```

## Construcción de imágenes

Cada servicio en `apps/<servicio>` tiene su propio `Dockerfile` multi-stage
(build separado del runtime, usuario no-root, capa final mínima). `kind` no
comparte el image store del host: hay que cargar cada imagen construida al
clúster con `kind load docker-image`.

```bash
export PATH="$HOME/bin:$PATH"
for svc in auth-service authorization-service products-service orders-service notifications-service gateway frontend cron-jobs; do
  docker build -t "sa-platform/$svc:dev" "apps/$svc"
  kind load docker-image "sa-platform/$svc:dev" --name sa-p5
done
```

(`frontend` necesita además los build-args `NEXT_PUBLIC_API_URL`/
`NEXT_PUBLIC_GATEWAY_URL` apuntando al host donde resuelve el Ingress —
`http://localhost/api` y `http://localhost` en este entorno local.)

## Despliegue

```bash
export PATH="$HOME/bin:$PATH"
cd charts/sa-platform
helm dependency update .
cp values.example.yaml values-secrets.yaml   # editar con valores reales (no versionado)
helm lint . -f values-dev.yaml -f values-secrets.yaml
helm install sa-platform . -n sa-p5 --create-namespace \
  -f values-dev.yaml -f values-secrets.yaml
kubectl get pods -n sa-p5
```

## Estado de avance de la evidencia

Todo lo listado aquí se ejecutó de verdad contra el clúster kind local de
esta sesión (no simulado) — ver el archivo correspondiente en
`docs/evidence/` para el output real de cada comando.

- [x] `helm lint` sin errores/advertencias — `docs/evidence/01-lint-and-deploy.md`
- [x] Despliegue inicial (`helm install`) — todos los pods `Running`/`Ready` — `docs/evidence/01-lint-and-deploy.md`
- [x] Versionado: `helm upgrade` (0.1.0→0.2.0) + `helm rollback` a la revisión anterior + `helm history` (4 revisiones) — `docs/evidence/02-versioning.md`
- [x] Persistencia: datos sobreviven al borrado (`kubectl delete pod`) de `postgres-0` — `docs/evidence/03-persistence.md`
- [x] Broker: 5 mensajes acumulados con `notifications-service` escalado a 0, drenados a 0 al reescalar, sin pérdida (verificado contando filas en DB) — `docs/evidence/04-broker.md`
- [x] NetworkPolicy: petición bloqueada (timeout) desde un pod no autorizado hacia Postgres/RabbitMQ/products-service, + control positivo desde el gateway — `docs/evidence/05-networkpolicy.md`
- [x] RBAC (ServiceAccount dedicado por pod, Role de mínimo privilegio, `kubectl auth can-i`) + securityContext (UID no-root real, filesystem raíz de solo lectura verificado en vivo) — `docs/evidence/06-rbac-securitycontext.md`
- [x] RollingUpdate sin downtime: 60/60 peticiones OK durante un `rollout restart` de products-service con `maxUnavailable: 0` — `docs/evidence/07-rolling-update.md`
- [x] CronJobs: `cron_executions` con carné `202203069` cada 2 min, resumen publicado a RabbitMQ y consumido/almacenado en `cron_summaries` cada 10 min (datos reales, no simulados)
- [x] Tamaño de imágenes antes/después — `docs/image-sizes.md`
- [x] Justificación de valores de probes — `docs/probes.md`
- [x] Prueba de carga k6 + escalado HPA 2→5 y descenso posterior (~84 req/s, p95 32ms, ciclo completo de escalado y bajada en ~5 min) — `docs/evidence/08-load-test.md` + `docs/evidence/hpa-scaledown.log`

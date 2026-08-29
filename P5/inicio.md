# Inicio rápido — sa-platform (Práctica 5)

Guía de referencia: qué es esto, cómo funciona y cómo levantarlo/probarlo en
esta máquina (Windows + Docker Desktop + kind + Helm).

## 0. Prerrequisitos antes de tocar nada

- **Docker Desktop abierto** (motor Linux). Si `kubectl`/`kind`/`docker`
  responden `failed to connect to the docker API at npipe:...`, es porque
  Docker Desktop no está corriendo — ábrelo y espera a que el ícono diga
  "Engine running".
- En cada terminal nueva:
  ```powershell
  $env:PATH = "$HOME\bin;" + $env:PATH   # si kind/helm están en ~/bin
  ```
  (o el equivalente `export PATH="$HOME/bin:$PATH"` si usas Git Bash).

## 1. Qué es esto

Microservicios de la Práctica 4 (auth, authorization, products, orders +
gateway + frontend) llevados a Kubernetes de forma madura con **Helm** como
único mecanismo de despliegue (nada de `kubectl apply -f` suelto).

```
Ingress (nginx) ──┬──> gateway (8080) ──> auth-service (4000) ──> authorization-service (4001)
                   │                  ├──> products-service (4002)
                   │                  └──> orders-service (4003) ──sync GraphQL──> products-service
                   └──> frontend (3000)

orders-service ──publica "order.created"──> RabbitMQ (exchange "sa.events", durable)
                                                └──> notifications-service (consume, ack manual, persiste)

cron-jobs: heartbeat cada 2' -> Postgres (p5_cron_db)
           resumen cada 10'  -> Postgres (lee) -> RabbitMQ (cron.summary) -> notifications-service -> Postgres
```

| Componente | Stack | Puerto | Health | DB |
|---|---|---|---|---|
| auth-service | NestJS + Prisma | 4000 | `/api/health` | `p4_auth_db` |
| authorization-service | NestJS (stateless) | 4001 | `/api/health` | — |
| products-service | FastAPI + Strawberry GraphQL | 4002 | `/health` | `p4_products_db` |
| orders-service | NestJS + GraphQL + Prisma | 4003 | `/api/health` | `p4_orders_db` |
| notifications-service | NestJS (consumidor RMQ) | 4004 | `/api/health` | `p5_notifications_db` |
| gateway | Express (reverse proxy) | 8080 | `/health` | — |
| frontend | Next.js 16 | 3000 | `/` | — |
| cron-jobs | NestJS standalone (2 CronJobs) | — | — | `p5_cron_db` |

- **Único punto de entrada**: Ingress → `gateway` / `frontend`. Todo lo demás
  (microservicios, Postgres, RabbitMQ) es `ClusterIP` puro.
- **Namespace `sa-p5`**: lo crea el propio `helm install --create-namespace`,
  nunca un `kubectl create namespace` manual.
- Postgres y RabbitMQ son dependencias Bitnami declaradas en
  `charts/sa-platform/Chart.yaml`, una sola instancia compartida (aislamiento
  lógico por base de datos).

Los requisitos completos están en `Make.md`; el detalle de lo ya ejecutado y
verificado está en `docs/evidence/*.md` (no son simulados, son runs reales
contra un cluster kind).

## 2. Levantar todo desde cero

```bash
export PATH="$HOME/bin:$PATH"

# a) Cluster kind + Calico (CNI que sí soporta NetworkPolicy) + ingress-nginx + metrics-server (para HPA)
kind create cluster --name sa-p5 --config infra/kind/kind-config.yaml
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.29.1/manifests/calico.yaml
kubectl wait --for=condition=Ready pods --all -n kube-system --timeout=180s
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/kind/main/site/static/examples/ingress/deploy-ingress-nginx.yaml
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
kubectl patch deployment metrics-server -n kube-system --type='json' \
  -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'

# b) Construir y cargar imágenes (multi-stage, no-root) en el cluster
for svc in auth-service authorization-service products-service orders-service notifications-service gateway frontend cron-jobs; do
  docker build -t "sa-platform/$svc:dev" "apps/$svc"
  kind load docker-image "sa-platform/$svc:dev" --name sa-p5
done
# frontend necesita build-args NEXT_PUBLIC_API_URL=http://localhost/api y
# NEXT_PUBLIC_GATEWAY_URL=http://localhost apuntando al Ingress local.

# c) Desplegar con Helm
cd charts/sa-platform
helm dependency update .
cp values.example.yaml values-secrets.yaml   # editar con valores reales, NO se versiona
helm lint . -f values-dev.yaml -f values-secrets.yaml
helm install sa-platform . -n sa-p5 --create-namespace -f values-dev.yaml -f values-secrets.yaml
kubectl get pods -n sa-p5
```

Todo debería quedar `Running`/`Ready`. El sistema se consume desde
`http://localhost` (frontend) y `http://localhost/api`, `/products/graphql`,
`/orders/graphql`, `/health`, `/docs` (gateway), vía el Ingress.

## 3. Cómo funciona (flujos clave)

- **Petición síncrona típica**: cliente → Ingress → `gateway` → servicio
  correspondiente (p.ej. `auth-service`, que a su vez llama a
  `authorization-service` para validar permisos).
- **Crear una orden** (`orders-service`): valida stock llamando por GraphQL
  a `products-service` (síncrono), guarda la orden, y **publica**
  `order.created` en RabbitMQ **sin esperar** al consumidor — responde de
  inmediato al cliente. `notifications-service` consume ese mensaje de forma
  independiente, con **ack manual** (solo confirma tras persistir con éxito),
  así que si el consumidor está caído los mensajes se acumulan en la cola
  durable y se procesan sin pérdida al reiniciar.
- **CronJobs encadenados**: el primero corre cada 2 min e inserta un registro
  con fecha/hora y carné en Postgres; el segundo corre cada 10 min, agrupa
  esos registros por hora, y publica el resumen en RabbitMQ, que
  `notifications-service` también consume y almacena.
- **Aislamiento de red**: NetworkPolicies limitan qué pod puede hablar con
  quién (solo `gateway` llega a los microservicios; solo los microservicios
  autorizados llegan a Postgres/RabbitMQ) — Calico es imprescindible porque
  el CNI por defecto de kind no aplica NetworkPolicy.
- **Resiliencia**: cada Deployment tiene liveness/readiness/startup probes,
  HPA (2–5 réplicas, 70% CPU), ResourceQuota/LimitRange a nivel de
  namespace, PodDisruptionBudget por servicio, y RollingUpdate con
  `maxUnavailable: 0`.
- **Seguridad**: ServiceAccount dedicado + Role de mínimo privilegio por pod
  (nada usa el `default`), `runAsNonRoot`, `readOnlyRootFilesystem`,
  `allowPrivilegeEscalation: false`, imágenes multi-stage sobre base mínima.

## 4. Cómo hacer pruebas

### 4.1 Unitarias / e2e por servicio (no requieren el cluster)

Servicios Node (`auth-service`, `authorization-service`, `orders-service`,
`notifications-service`, `cron-jobs`, `gateway`, `frontend`):
```bash
cd apps/<servicio>
npm install
npm test          # unitarias: src/**/*.spec.ts
npm run test:e2e   # e2e: test/app.e2e-spec.ts (algunas requieren .env con DB real)
```

`products-service` (FastAPI/Python) **no tiene suite de tests** todavía
(`requirements.txt` no incluye `pytest`) — si se necesita, habría que
agregarla.

**Nota sobre un falso positivo ya visto**: en `authorization-service`,
`npm test` falla con
`TypeError: appController.getHello is not a function`. Es el spec de
plantilla que deja `nest new` (prueba un método `getHello()` que ya no
existe); el controlador real solo tiene `health()` y `validate()`
(`src/app.controller.ts`). No es un bug de la app — ese spec quedó obsoleto
y debería reescribirse para probar `health()` o borrarse, pero no bloquea el
despliegue ni indica un problema real. Vale la pena revisar si otros
servicios (p.ej. `auth-service`) tienen el mismo spec de plantilla sin
actualizar.

### 4.2 Contra el cluster real (valida los requisitos de la práctica)

Con el cluster arriba (paso 2), cada bloque de abajo es: **propósito** → qué
requisito de `Make.md` demuestra; **cómo ejecutarlo** → comando real; **cómo
verlo** → qué mirar para confirmar que pasó. Corresponden 1 a 1 con
`docs/evidence/0X-*.md`, que tiene el output real ya capturado.

**01 — Chart válido y despliegue inicial** (`01-lint-and-deploy.md`)
- Propósito: el chart no tiene errores de plantillado y todo levanta sano.
- Ejecutar:
  ```bash
  helm lint . -f values-dev.yaml -f values-secrets.yaml
  helm dependency update .
  helm install sa-platform . -n sa-p5 --create-namespace -f values-dev.yaml -f values-secrets.yaml
  ```
- Ver: `kubectl get pods -n sa-p5` → todos `Running`/`Completed` (los
  cronjobs), 0 `CrashLoopBackOff`. `helm list -n sa-p5` → `STATUS: deployed`.

**02 — Versionado (upgrade + rollback)** (`02-versioning.md`)
- Propósito: el chart es versionado y el despliegue es reversible.
- Ejecutar: sube `version` en `Chart.yaml` (0.1.0→0.2.0) y cambia algo real
  en `values-dev.yaml` (p.ej. un límite de CPU), luego:
  ```bash
  helm history sa-platform -n sa-p5
  helm upgrade sa-platform . -n sa-p5 -f values-dev.yaml -f values-secrets.yaml
  helm rollback sa-platform 1 -n sa-p5
  helm history sa-platform -n sa-p5
  ```
- Ver: `helm history` muestra revisión 1 `superseded`, 2 `superseded`
  (chart 0.2.0), y una nueva revisión `deployed` con "Rollback to 1".

**03 — Persistencia (StatefulSet + PVC)** (`03-persistence.md`)
- Propósito: los datos sobreviven aunque se destruya el pod de la DB.
- Ejecutar:
  ```bash
  kubectl get pvc,statefulset -n sa-p5
  kubectl exec -it postgres-0 -n sa-p5 -- psql -U <user> -d p4_orders_db -c 'select * from "Order";'
  kubectl delete pod postgres-0 -n sa-p5
  kubectl wait --for=condition=Ready pod/postgres-0 -n sa-p5 --timeout=90s
  kubectl exec -it postgres-0 -n sa-p5 -- psql -U <user> -d p4_orders_db -c 'select * from "Order";'
  ```
- Ver: la segunda consulta devuelve **las mismas filas** que la primera (el
  PVC se reengancha al pod recreado).

**04 — Broker (mensajes durables, sin pérdida)** (`04-broker.md`)
- Propósito: si el consumidor cae, los mensajes se acumulan en la cola
  (durable) y se procesan sin pérdida al restaurarlo.
- Ejecutar:
  ```bash
  kubectl delete hpa notifications-service -n sa-p5   # si no, el HPA lo reescala solo
  kubectl scale deployment/notifications-service -n sa-p5 --replicas=0
  # generar 5 órdenes (POST /api/orders vía gateway) — deben seguir devolviendo 201
  kubectl exec -it rabbitmq-0 -n sa-p5 -- rabbitmqctl list_queues
  kubectl scale deployment/notifications-service -n sa-p5 --replicas=2
  kubectl exec -it rabbitmq-0 -n sa-p5 -- rabbitmqctl list_queues
  # recrear el HPA borrado, o `helm upgrade` de nuevo
  ```
- Ver: primer `list_queues` → `notifications.order-created` con `messages=5,
  consumers=0`. Segundo `list_queues` (tras reescalar) → `messages=0,
  consumers=2`. Nada se pierde.

**05 — NetworkPolicy (aislamiento lateral)** (`05-networkpolicy.md`)
- Propósito: solo el tráfico explícitamente permitido cruza entre pods.
- Ejecutar:
  ```bash
  kubectl get networkpolicy -n sa-p5
  kubectl run netpol-attacker -n sa-p5 --image=curlimages/curl --restart=Never -- sleep 3600
  kubectl exec -it netpol-attacker -n sa-p5 -- curl --max-time 5 http://postgres:5432
  kubectl exec -it netpol-attacker -n sa-p5 -- curl --max-time 5 http://rabbitmq:5672
  kubectl exec -it netpol-attacker -n sa-p5 -- curl --max-time 5 http://products-service:4002/health
  ```
- Ver: las tres deben **colgarse hasta el timeout** (bloqueadas por
  `default-deny-all`). Como control positivo, lo mismo desde un pod con
  label `sa-platform/component=gateway` sí debe responder `200`.

**06 — RBAC + securityContext** (`06-rbac-securitycontext.md`)
- Propósito: cada pod usa un ServiceAccount propio de mínimo privilegio, y
  corre como no-root con filesystem raíz de solo lectura.
- Ejecutar:
  ```bash
  kubectl get pods -n sa-p5 -o custom-columns=POD:.metadata.name,SA:.spec.serviceAccountName
  kubectl -n sa-p5 auth can-i list pods --as=system:serviceaccount:sa-p5:orders-service-sa
  kubectl -n sa-p5 auth can-i get secret/orders-service --as=system:serviceaccount:sa-p5:orders-service-sa
  kubectl exec -it <pod-orders-service> -n sa-p5 -- id
  kubectl exec -it <pod-orders-service> -n sa-p5 -- touch /root-write-test
  ```
- Ver: ninguna SA es `default`; el primer `can-i` responde `no`, el segundo
  `yes` (solo puede lo suyo); `id` muestra `uid=1000` (no root); el `touch`
  en `/` falla con `Read-only file system`.

**07 — RollingUpdate sin downtime** (`07-rolling-update.md`)
- Propósito: una actualización no debe cortar el servicio.
- Ejecutar: en una terminal, un loop pegándole a `http://localhost/api/products`
  cada 200ms contando OK/fail; en otra, en paralelo:
  ```bash
  kubectl rollout restart deployment/products-service -n sa-p5
  kubectl rollout status deployment/products-service -n sa-p5
  ```
- Ver: al terminar el rollout, el contador de la terminal 1 debe dar
  `fail=0`.

**09 — PDB / ResourceQuota / LimitRange / Ingress** (`09-pdb-quota-limitrange-ingress.md`)
- Propósito: hay control de disrupciones, cuotas de recursos por namespace,
  y un único punto de entrada.
- Ejecutar:
  ```bash
  kubectl get pdb -n sa-p5
  kubectl describe resourcequota -n sa-p5
  kubectl describe limitrange -n sa-p5
  kubectl describe ingress sa-platform-ingress -n sa-p5
  ```
- Ver: un PDB por microservicio; `resourcequota` con `Used` bajo `Hard`;
  `limitrange` con defaults de CPU/memoria; el Ingress lista las rutas
  `/api`, `/products/graphql`, `/orders/graphql`, `/health`, `/docs` →
  `gateway`, y `/` → `frontend`.

### 4.3 Prueba de carga (k6)

```bash
docker run --rm -i -e BASE_URL=http://host.docker.internal grafana/k6 run - < k6/load-test.js
```
En paralelo, para ver el escalado automático:
```bash
kubectl get hpa -n sa-p5 -w
kubectl get pods -n sa-p5 -w
```
Reporta peticiones/seg, p95 y % de error (ver `docs/evidence/08-load-test.md`
para la interpretación correcta del % de error — en la corrida real, la
mayoría de fallos de `POST /api/orders` fueron por agotamiento de stock de
los productos semilla, no por fallas de infraestructura; `GET /api/products`
tuvo 99.99% de éxito).

## 5. Comandos de diagnóstico rápidos

```bash
kubectl get pods -n sa-p5                       # estado general
kubectl logs -n sa-p5 <pod> -f                  # logs de un pod
kubectl describe pod <pod> -n sa-p5             # eventos/errores de arranque
helm status sa-platform -n sa-p5                # estado del release
helm get values sa-platform -n sa-p5            # valores efectivos aplicados
kubectl get hpa,pdb,resourcequota,limitrange -n sa-p5
```

## 6. Desinstalar / limpiar

```bash
helm uninstall sa-platform -n sa-p5
kind delete cluster --name sa-p5
```
El error que te está saliendo (`El operador '<' está reservado para uso futuro`) se debe a que estás usando **PowerShell**, y PowerShell no maneja la redirección de archivos con `<` de la misma manera que lo hace la terminal de Linux o el CMD clásico de Windows.

Además, estás ubicado dentro de la carpeta `charts\sa-platform`, por lo que no encontrará la carpeta `k6`. 

Para solucionarlo y ver su funcionamiento, sigue estos pasos:

### 1. Ejecutar el test correctamente en PowerShell
Primero, asegúrate de regresar a la carpeta principal del proyecto (P5):
```powershell
cd ..\..
```

Y luego, para correr el comando en PowerShell usa `Get-Content` (que lee el archivo) y usa el "pipe" `|` para pasarlo a Docker:
```powershell
Get-Content k6\load-test.js | docker run --rm -i -e BASE_URL=http://host.docker.internal grafana/k6 run -
```

### 2. ¿Se puede ver Grafana? ¿Cómo veo que funciona?
El nombre de la imagen es `grafana/k6` (porque la empresa Grafana compró la herramienta k6), pero **este comando no levanta un dashboard web de Grafana**. k6 por defecto imprime los resultados y métricas directamente en la misma consola al finalizar la prueba (peticiones por segundo, latencia, errores).

**Para ver cómo está funcionando "en vivo" en tu clúster**, la mejor forma es abrir **otra ventana de terminal (PowerShell)** mientras se ejecuta el test, y monitorear cómo Kubernetes escala los recursos automáticamente por la carga.

En esa nueva terminal, corre este comando para ver cómo sube el % de CPU y las réplicas:
```powershell
kubectl get hpa -n sa-p5 -w
```
*(El flag `-w` significa "watch", se quedará la pantalla escuchando y cada vez que haya un cambio en el uso de CPU o se levante un nuevo pod, te lo mostrará en tiempo real).*

Si quieres ver cómo se van creando los pods de los microservicios para soportar la carga, puedes abrir una tercera terminal y poner:
```powershell
kubectl get pods -n sa-p5 -w
```
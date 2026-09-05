# Documentación — Práctica 6

## 1. Alcance y arquitectura

Esta solución despliega en **GKE Standard zonal** la plataforma terminada en P5 sin reescribirla. El clúster tiene dos nodos, las ocho imágenes privadas se alojan en Artifact Registry y Helm administra todos los componentes.

```text
Internet -> IP pública de LoadBalancer -> ingress-nginx
                                      |-> /        -> frontend
                                      `-> /api...  -> gateway -> microservicios
orders-service -> evento order.created -> RabbitMQ -> notifications-service
servicios con estado -> PostgreSQL/RabbitMQ -> PVC standard-rwo
```

Componentes: `auth-service`, `authorization-service`, `products-service`, `orders-service`, `notifications-service`, `gateway`, `frontend`, `cron-jobs`, PostgreSQL y RabbitMQ. Solo ingress-nginx es público; los demás Services son `ClusterIP`. Las NetworkPolicies permiten únicamente los flujos de la arquitectura.

## 2. Archivos entregados

- `charts/sa-platform`: chart completo proveniente de P5 y perfil `values-gke.yaml`.
- `config.env.example`: configuración no sensible de la cuenta/despliegue.
- `scripts/create-infrastructure.sh`: APIs, Artifact Registry y clúster idempotentes.
- `scripts/build-and-push.sh`: compila y publica las ocho imágenes.
- `scripts/generate-secrets.sh`: genera credenciales aleatorias en un archivo ignorado.
- `scripts/deploy.sh`: ingress-nginx, dependencias, lint e instalación Helm atómica.
- `scripts/verify.sh`: espera recursos, prueba la IP desde el cliente y guarda evidencia.
- `scripts/test-static.sh`: sintaxis Bash, dependencias, lint y renderizado del chart.
- `scripts/destroy.sh`: eliminación protegida por confirmación.

## 3. Prerrequisitos

1. Una cuenta GCP con facturación y cuota para dos VM.
2. Google Cloud CLI, Docker, `kubectl`, Helm 3, Bash, `curl` y OpenSSL.
3. P5 junto a P6 (`P5/apps` y `P6`). En Cloud Shell, Docker, gcloud y kubectl ya están disponibles; instalar Helm si hiciera falta.
4. Usuario con permisos para habilitar APIs, crear GKE, Artifact Registry y recursos de red.

Comprobar:

```bash
gcloud --version
docker version
kubectl version --client
helm version
```

## 4. Configuración y despliegue completo

Ejecutar desde `P6`:

```bash
cp config.env.example config.env
```

Editar `config.env` y sustituir `mi-proyecto-gcp`. Los valores predeterminados crean `sa-p6` en `us-central1-a`, con **2 nodos `e2-standard-2`**. `config.env` no contiene contraseñas, pero es específico de la cuenta y no debe subirse.

```bash
gcloud auth login
gcloud auth application-default login
bash scripts/create-infrastructure.sh
bash scripts/build-and-push.sh
bash scripts/generate-secrets.sh
bash scripts/deploy.sh
bash scripts/verify.sh
```

El flujo es seguro para reejecutarse, salvo `generate-secrets.sh`, que deliberadamente se niega a sobrescribir secretos existentes. `deploy.sh` usa `helm upgrade --install --atomic`: si el release no alcanza estado Ready, Helm revierte la operación.

La IP real aparece al final de `verify.sh` y también en:

```bash
kubectl get svc ingress-nginx-controller -n ingress-nginx
```

Abrir `http://IP_PUBLICA/` y comprobar `http://IP_PUBLICA/health`. Registrar aquí, después del despliegue:

```text
Dirección pública utilizada: http://136.113.87.253
Fecha/hora UTC de la prueba: 2026-09-05 05:07–05:08 UTC
```

## 5. Secretos

`generate-secrets.sh` crea contraseñas independientes, JWT y AES mediante OpenSSL con permisos restrictivos. El archivo `charts/sa-platform/values-secrets.yaml` está en `.gitignore`. Helm lo convierte en objetos `Secret`; no se escriben credenciales en los manifiestos versionados.

Antes de subir:

```bash
git status --short
git check-ignore charts/sa-platform/values-secrets.yaml
git grep -nE 'postgresPassword: .+|JWT_SECRET: .+|RABBITMQ_URL: amqp://'
```

El último comando solo debe mostrar plantillas ficticias o referencias, nunca los valores generados. En un entorno productivo se recomendaría Secret Manager más External Secrets y cifrado de Secrets con una clave KMS.

## 6. Persistencia

`values-gke.yaml` solicita `standard-rwo` tanto para PostgreSQL como RabbitMQ. GKE aprovisiona Persistent Disks dinámicamente mediante su CSI driver. Validar:

```bash
kubectl get storageclass
kubectl get pvc -n sa-p6
kubectl describe pvc -n sa-p6
```

Los PVC deben estar `Bound` y mostrar `standard-rwo`. La eliminación del clúster destruye estos discos según la política de recuperación del StorageClass; no conservar datos académicos importantes únicamente allí.

## 7. Evidencias requeridas

`verify.sh` genera `evidence/deployment.log` y `evidence/public-health.log` con salida real. Además tomar capturas de:

1. GKE > Clusters, mostrando nombre, zona y dos nodos.
2. Artifact Registry, mostrando los ocho repositorios/imágenes y tag.
3. `kubectl get pods,pvc -n sa-p6 -o wide`, sin `Pending`, `Error` o `CrashLoopBackOff`.
4. `kubectl get svc ingress-nginx-controller -n ingress-nginx`, con `EXTERNAL-IP`.
5. Navegador, curl o Postman accediendo desde internet a `/` y `/health`.
6. Flujo asíncrono: crear una orden y capturar logs del productor y consumidor.

```bash
kubectl logs -n sa-p6 deployment/orders-service --tail=100
kubectl logs -n sa-p6 deployment/notifications-service --tail=100
```

No se incluyen capturas ni IP inventadas porque no demostrarían un clúster real de la cuenta del estudiante.

## 8. Pruebas y diagnóstico

Prueba estática antes de gastar recursos:

```bash
bash scripts/test-static.sh
```

Pruebas posteriores:

```bash
kubectl get nodes
kubectl get all -n sa-p6
kubectl get events -n sa-p6 --sort-by=.lastTimestamp
helm status sa-platform -n sa-p6
curl -i http://IP_PUBLICA/health
```

Si aparece `ImagePullBackOff`, confirmar ruta/tag en Artifact Registry y que nodos y registro pertenecen al proyecto correcto. Si `EXTERNAL-IP` queda pendiente, revisar cuota de IP/red, facturación y eventos del Service. Si un PVC queda pendiente, comprobar que `standard-rwo` existe en esa versión/región. Si Helm informa falta de recursos, subir `MACHINE_TYPE` o reducir temporalmente las réplicas; nunca bajar de dos nodos para esta rúbrica.

## 9. Costo aproximado y control

GKE cobra USD 0.10 por hora de administración, pero su capa gratuita acredita USD 74.40 mensuales para un clúster zonal; el cómputo de los nodos se cobra aparte. La IP/LoadBalancer, discos persistentes, almacenamiento de imágenes y egreso también pueden generar cargo. Artifact Registry ofrece 0.5 GiB-mes sin costo y luego publica una tarifa equivalente a aproximadamente USD 0.10/GiB-mes. Google publica hasta cinco reglas de forwarding por USD 0.025/h, además del procesamiento de datos. Fuentes consultadas el 3 de septiembre de 2026: [precios de GKE](https://cloud.google.com/kubernetes-engine/pricing), [Artifact Registry](https://cloud.google.com/artifact-registry/pricing) y [red/balanceadores](https://cloud.google.com/vpc/network-pricing).

Estimación orientativa para este diseño en `us-central1`, sin descuentos y con poco tráfico:

| Concepto | Aproximación |
|---|---:|
| Administración GKE zonal | USD 0 con crédito mensual elegible; USD 0.10/h sin él |
| 2 nodos e2-standard-2 | consultar calculadora al desplegar; es el mayor costo |
| LoadBalancer/forwarding | desde USD 0.025/h + datos |
| 60 GiB de discos de nodos + 20 GiB de PVC | según tipo/región, facturación por GiB-mes |
| Artifact Registry | primeros 0.5 GiB-mes gratis; excedente aprox. USD 0.10/GiB-mes |

El importe exacto depende del SKU vigente, descuentos, duración y tráfico. Antes de entregar, obtener el valor real en **Billing > Reports**, filtrar por proyecto y anotar:

```text
Periodo activo al realizar la evidencia inicial: menos de 2 horas
Costo real mostrado por GCP: pendiente de propagación (Billing puede tardar hasta 24 horas)
```

Para reducirlo: usar clúster zonal, apagarlo/eliminarlo al terminar, mantener solo dos nodos, evitar IP o discos huérfanos, ubicar registro y clúster en la misma región, limitar logs/egreso y aplicar presupuestos/alertas.

## 10. Eliminación de recursos

Guardar primero las evidencias y luego ejecutar:

```bash
bash scripts/destroy.sh
```

Escribir `ELIMINAR` cuando se solicite. El script borra el clúster y muestra el comando separado para eliminar Artifact Registry. Se conserva el registro inicialmente para evitar borrar por accidente las imágenes antes de calificarlas. Cuando ya no sean necesarias:

```bash
gcloud artifacts repositories delete sa-platform --location us-central1 --project PROJECT_ID
gcloud compute forwarding-rules list --project PROJECT_ID
gcloud compute disks list --project PROJECT_ID
gcloud compute addresses list --project PROJECT_ID
```

Las tres listas finales deben revisarse para verificar que no quedaron recursos facturables asociados.

## 11. Respuestas a las interrogantes

### 1. ¿Qué es un clúster administrado y qué diferencias tiene frente a uno local?

Es Kubernetes ofrecido como servicio: el proveedor opera el plano de control, su disponibilidad, almacenamiento de estado y actualizaciones básicas, y lo integra con identidad, red, discos y balanceadores de la nube. Un clúster local como kind comparte los límites de una computadora, usa imágenes locales y simula exposición/almacenamiento; GKE usa nodos VM reales, registro remoto, identidades IAM, discos de red e IP pública. El administrado reduce trabajo operativo, pero introduce costos, cuotas, latencia, responsabilidad de seguridad y recursos persistentes que deben limpiarse.

### 2. ¿Qué es un Service LoadBalancer y cómo lo implementa el proveedor?

Es un Service de Kubernetes que pide al controlador cloud una entrada accesible externamente. En esta solución, el Service de ingress-nginx provoca que GKE cree una regla de forwarding y asigne una IP externa; el tráfico llega al controlador y el Ingress lo enruta por ruta a frontend o gateway. Kubernetes conserva la abstracción declarativa y Google implementa la infraestructura de red subyacente. La IP puede tardar minutos y genera costo mientras existe.

### 3. ¿Qué es un registro de contenedores y por qué es necesario?

Es un repositorio versionado de imágenes OCI. Los nodos GKE no comparten el daemon Docker del equipo del estudiante, por lo que necesitan descargar cada imagen desde un endpoint alcanzable y autorizado. Artifact Registry almacena los ocho artefactos con rutas y tags reproducibles, permite IAM y evita depender de imágenes locales. Usar un tag de versión facilita saber exactamente qué código se desplegó.

### 4. ¿Qué administra el proveedor y qué sigue siendo responsabilidad del estudiante?

Google administra la API/control plane, etcd, disponibilidad del control plane y la integración básica con cómputo, red y discos. El estudiante sigue siendo responsable de IAM, elección/tamaño y parcheo de nodos según modalidad, imágenes, vulnerabilidades, Helm, Deployments, Services, Ingress, NetworkPolicies, Secrets, copias de seguridad, observabilidad, escalado, disponibilidad de la aplicación y costos. “Administrado” no significa que Google asegure el código ni configure correctamente sus cargas.

### 5. ¿Qué costos genera y cómo reducirlos?

Genera cómputo de dos VM, discos de nodos y PVC, administración del clúster si no aplica crédito, forwarding/LoadBalancer, imágenes almacenadas y egreso/procesamiento de red. La tabla de la sección 9 separa los rubros porque una cifra fija se vuelve obsoleta y puede ser falsa para otra cuenta. Se reduce limitando duración y tamaño, usando la región consistente, evitando tráfico innecesario, configurando presupuesto/alertas y eliminando el clúster, discos, IP y registro al finalizar.

## 12. Lista de entrega

- [x] Helm lint y renderizado estático terminan sin errores.
- [x] GKE muestra dos nodos Ready.
- [x] Ocho imágenes con tag `1.0.0` en Artifact Registry.
- [x] Todos los servicios principales Ready y ambos PVC Bound.
- [x] IP pública responde desde internet (`/` y `/health`, HTTP 200).
- [x] Órdenes demuestran publicación y consumo asíncrono en `order_notifications`.
- [ ] Capturas e IP/fecha/costo real agregados a esta documentación.
- [x] `values-secrets.yaml` y `config.env` están excluidos de Git.
- [ ] Evidencias guardadas antes de ejecutar la limpieza.
- [ ] Recursos facturables eliminados después de la evaluación.

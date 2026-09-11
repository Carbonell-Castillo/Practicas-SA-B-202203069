# Documentación técnica — Práctica 7

## Arquitectura

```mermaid
flowchart LR
    A[Push, PR, tag v* o manual] --> V[0. Versión = SHA]
    V --> BN[1. Matrix build Node: 7]
    V --> BP[1. Build Python: 1]
    V --> T[2. Matrix test: 4]
    V --> H[2. Helm lint + ShellCheck]
    BN --> D[3. Matrix Docker: 8]
    BP --> D
    T --> D
    H --> D
    D --> K[4. Crear Kind efímero]
    K --> I[Build y kind load: 8 imágenes]
    I --> HD[Helm upgrade --atomic]
    HD --> S[Smoke test de pods y deployments]
```

Todo ocurre en GitHub Actions. Kind ejecuta Kubernetes usando contenedores Docker dentro del runner Ubuntu; no es GKE ni un despliegue en nube. Cuando termina el job, GitHub elimina el runner y con él el clúster, las imágenes y los secretos generados.

## Disparadores

| Evento | Resultado |
| --- | --- |
| Pull request hacia `main` | CI completo y CD efímero en Kind |
| Push a `main` | CI completo y CD efímero en Kind |
| Tag `v*` | CI completo y CD efímero en Kind |
| `workflow_dispatch` | Ejecución manual completa |

Los filtros limitan ejecuciones a cambios en `P5/apps`, `P7` o el workflow.

## Etapas

### 0. Preparación y versión

Publica el SHA completo del commit como tag inmutable. El mismo identificador se usa en Docker y Helm, por lo que siempre puede conocerse qué código fue evaluado.

### 1. Build

La matriz Node ejecuta siete servicios en paralelo con Node 24 y `npm ci`. Auth genera Prisma antes de compilar; los servicios Nest/Next ejecutan su build y Gateway valida la sintaxis JavaScript. Products usa Python 3.12, instala dependencias y realiza un import de humo de FastAPI.

### 2. Pruebas y validación

- `auth-service`: prueba unitaria aislada de su controlador.
- `authorization-service`: health y reglas admin/client; se corrigió el spec obsoleto que aún llamaba a `getHello()`.
- `products-service`: compilación Python e import de la aplicación.
- `gateway`: validación de todos los archivos JavaScript.
- Helm: dependencias, lint y render completo con secretos ficticios.
- Bash: `bash -n` y ShellCheck sobre los scripts.

P5 contiene otros specs boilerplate sin mocks para Prisma, ConfigService o HttpService; no se presentan engañosamente como cobertura válida. Una mejora futura puede inyectar esos dobles de prueba y ampliar Jest.

### 3. Docker

Una matriz independiente construye los ocho Dockerfiles con Buildx. No publica en un registry porque el objetivo solicitado es únicamente validar la pipeline y desplegar localmente en Kind. La caché de GitHub Actions está separada por servicio. En el job de CD, cada imagen host se elimina inmediatamente después de cargarla al nodo Kind para no duplicar varios GB en el disco limitado del runner.

### 4. CD en Kind

Después de todas las matrices, el job crea `sa-p7-ci`, reconstruye exactamente el mismo commit, etiqueta las imágenes como `sa-p7/<servicio>:<SHA>` y usa `kind load docker-image`. El perfil `values-kind.yaml` fija `pullPolicy: Never`, una réplica, persistencia desactivada y recursos pequeños.

Los secretos para Postgres, RabbitMQ, JWT y AES se generan aleatoriamente dentro de `$RUNNER_TEMP`; nunca se escriben en Git. Para evitar saturar el runner, Helm inicia primero Postgres y RabbitMQ y después despliega las aplicaciones. En CI se conservan los recursos hasta terminar el job si Helm falla, permitiendo imprimir pods, eventos y logs; Kind desaparece con el runner. Finalmente se exige que los siete deployments existan y que los nueve pods esperados (siete aplicaciones, Postgres y RabbitMQ) estén `Running/Ready`.

## Archivos

```text
.github/workflows/p7-ci-cd.yml       Pipeline
P7/scripts/build-service.sh          Build por tecnología
P7/scripts/test-service.sh           Pruebas automáticas
P7/scripts/helm-ci.sh                Validación del chart
P7/scripts/generate-helm-values.sh   Secretos efímeros
P7/scripts/deploy.sh                 Helm atómico
P7/charts/sa-platform/values-kind.yaml Perfil Kind
P7/evidence/README.md                Lista de evidencias reales
```

## Prueba local opcional

Requiere Docker activo, Kind, Helm, kubectl, Node 24, Python 3.12 y Bash:

```bash
bash P7/scripts/build-service.sh auth-service
bash P7/scripts/test-service.sh authorization-service
bash P7/scripts/helm-ci.sh
```

La fuente de verdad evaluable es la ejecución remota de GitHub Actions, porque reproduce un runner limpio.

## Evidencia

Después del primer push, guardar en `P7/evidence`:

1. captura del grafo completo en verde;
2. detalle de la matriz Docker con ocho jobs exitosos;
3. salida del paso `Prueba de humo del clúster` con los pods listos;
4. URL de la ejecución y SHA evaluado en `evidence/README.md`.

No se incluyen capturas inventadas: deben provenir de Actions.

## Respuestas teóricas

**¿Qué es CI?** Es integrar cambios frecuentemente y verificarlos de forma automática. Aquí incluye builds, tests, sintaxis, Helm y Docker.

**¿Qué es CD en esta práctica?** Es entregar el artefacto validado a Kubernetes. El entorno es Kind efímero, por lo que demuestra la automatización y el estado saludable sin publicar una aplicación permanente.

**¿Por qué usar matrices?** Cada servicio falla y se diagnostica de forma independiente; además, GitHub puede ejecutar trabajos en paralelo y reducir el tiempo total.

**¿Por qué usar el SHA como versión?** Es inmutable y enlaza código, imagen y release. `latest` puede cambiar y no ofrece trazabilidad.

**¿Qué ocurre si algo falla?** GitHub no habilita los jobs dependientes. Si el fallo ocurre durante el deploy, `--atomic` revierte Helm y la ejecución queda roja.

**¿Kind equivale a producción?** No. Ejecuta una API Kubernetes real y es ideal para verificar manifests y despliegues en CI, pero no modela balanceadores, discos ni alta disponibilidad de un clúster administrado.

**¿Por qué no se requieren secretos de GitHub?** No hay registry ni nube externos. Las credenciales internas de la aplicación viven solo durante el job y se eliminan con el runner.

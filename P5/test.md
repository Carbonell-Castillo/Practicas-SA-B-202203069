# Guía de Evaluación y Pruebas — Práctica 5

Este documento es una guía directa para demostrar todos los puntos solicitados en la rúbrica de calificación de la Práctica 5.

## 1. Habilidades (40%)

### Documentación técnica y diagrama de arquitectura (12 pts)
* **Dónde verlo:** Archivo `docs/documentacionFinal/Documentation.md`.
* **Qué mostrar:** En la **Sección 1** se encuentran los diagramas Mermaid (vista general y flujos) que explican cómo interactúan todos los componentes (Ingress, Gateway, Microservicios, RabbitMQ y Postgres).

### Calidad y estructura del chart de Helm (12 pts)
* **Dónde verlo:** Carpeta `charts/sa-platform`.
* **Qué mostrar:**
  * Archivos de variables separados: `values-dev.yaml`, `values-prod.yaml` y `values-secrets.yaml`.
  * En la carpeta `templates` y en los subcharts se puede observar el uso de condicionales (`if`), bucles (`range`) y helpers, evidenciando un uso real del motor de plantillas y no solo YAMLs estáticos.

### Organización del repositorio (3 pts)
* **Dónde verlo:** Estructura base del proyecto.
* **Qué mostrar:** Carpetas bien definidas como `apps/` (código fuente), `charts/` (configuración Helm), `k6/` (scripts de carga), e `infra/` o `docs/`.

### Lista de comandos reproducibles (3 pts)
A continuación se presenta el paso a paso completo para levantar la infraestructura desde cero:

**1. Crear el clúster y los add-ons (Calico, Ingress, Metrics Server)**
```powershell
kind create cluster --name sa-p5 --config infra/kind/kind-config.yaml

# Calico (Soporte para Network Policies)
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.29.1/manifests/calico.yaml
kubectl wait --for=condition=Ready pods --all -n kube-system --timeout=180s

# Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/kind/main/site/static/examples/ingress/deploy-ingress-nginx.yaml

# Metrics Server (Para el HPA)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
kubectl patch deployment metrics-server -n kube-system --type='json' -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
```

**2. Despliegue con Helm**
```powershell
cd charts/sa-platform
helm dependency update .
cp values.example.yaml values-secrets.yaml
helm install sa-platform . -n sa-p5 --create-namespace -f values-dev.yaml -f values-secrets.yaml
```

### Preguntas teóricas (10 pts)
* **Dónde verlo:** `docs/documentacionFinal/Documentation.md` (Sección 6).
* **Qué mostrar:** Respuestas detalladas a las preguntas teóricas solicitadas.

---

## 2. Conocimiento (60%) - Pruebas Funcionales en Consola

### Ciclo de vida con Helm (install, upgrade y rollback) (12 pts)
* **Cómo probarlo:**
  1. Revisa el historial de despliegues:
     ```powershell
     helm history sa-platform -n sa-p5
     ```
  2. Para probar un upgrade, cambia un valor (ej. subir réplicas en `values-dev.yaml`) y aplica:
     ```powershell
     helm upgrade sa-platform ./charts/sa-platform -n sa-p5 -f ./charts/sa-platform/values-dev.yaml -f ./charts/sa-platform/values-secrets.yaml
     ```
  3. Para probar el rollback a la versión anterior:
     ```powershell
     helm rollback sa-platform 1 -n sa-p5
     ```

### Configuración, secretos y persistencia (10 pts)
* **Cómo probarlo (Persistencia de Postgres):**
  1. Simula una caída borrando el pod de la base de datos:
     ```powershell
     kubectl delete pod postgres-0 -n sa-p5
     ```
  2. Espera a que Kubernetes lo vuelva a levantar. Los datos seguirán ahí gracias al `PersistentVolumeClaim` atado al `StatefulSet`. *(Ver detalle en Sección 4.2 de la documentación).*

### Comunicación asíncrona mediante broker (12 pts)
* **Cómo probarlo (RabbitMQ y Notifications):**
  1. "Apaga" el servicio de notificaciones reduciendo sus réplicas a cero:
     ```powershell
     kubectl scale deployment notifications-service --replicas=0 -n sa-p5
     ```
  2. Crea varias órdenes a través de la API (el sistema responderá 201 Created inmediatamente, demostrando desacoplamiento).
  3. Los mensajes se quedarán "atrapados" (encolados) de forma segura en RabbitMQ.
  4. Vuelve a encender el servicio:
     ```powershell
     kubectl scale deployment notifications-service --replicas=1 -n sa-p5
     ```
  5. Verás cómo el servicio procesa de golpe todos los mensajes encolados sin perder ninguno.

### Exposición, aislamiento de red y seguridad (10 pts)
* **Cómo probarlo (Network Policies):**
  1. Levanta un pod "intruso" dentro del clúster (sin los labels oficiales del proyecto):
     ```powershell
     kubectl run hacker --image=curlimages/curl --restart=Never -n sa-p5 -it -- sh
     ```
  2. Desde la terminal de ese pod, intenta comunicarte con un microservicio o la base de datos:
     ```bash
     curl -sv --max-time 5 http://products-service:4002/health
     curl -sv --max-time 5 telnet://postgres:5432
     ```
  3. La conexión fallará (timeout), demostrando que la regla `default-deny-all` funciona correctamente y aísla la red.

### Escalado y resiliencia bajo carga (10 pts)
* **Cómo probarlo (HPA + k6):**
  1. En una terminal nueva, observa el autoescalado en vivo:
     ```powershell
     kubectl get hpa -n sa-p5 -w
     ```
  2. En otra terminal, corre la prueba de carga usando Docker (versión para PowerShell):
     ```powershell
     Get-Content k6\load-test.js | docker run --rm -i -e BASE_URL=http://host.docker.internal grafana/k6 run -
     ```
  3. En la primera terminal verás cómo el CPU supera el 70% y Kubernetes aumenta dinámicamente el número de réplicas de los microservicios (de 2 a 5). Cuando el test termina, tras ~5 minutos, las réplicas bajarán a 2.

### Cronjobs encadenados y funcionales (6 pts)
* **Cómo probarlo:**
  1. Revisa que los cronjobs estén configurados:
     ```powershell
     kubectl get cronjobs -n sa-p5
     ```
  2. Observa los pods que los cronjobs han ido creando para ejecutar sus tareas:
     ```powershell
     kubectl get pods -n sa-p5
     ```
  3. Verás pods con estado `Completed`. Puedes ver qué hizo exactamente cada uno revisando sus logs:
     ```powershell
     kubectl logs <nombre-del-pod-completado> -n sa-p5
     ```

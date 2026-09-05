# Práctica 6 — despliegue en GKE

Solución reproducible para desplegar en Google Kubernetes Engine la plataforma de P5. Incluye un clúster zonal de **dos nodos**, ocho imágenes en Artifact Registry, Helm, persistencia dinámica, secretos fuera del repositorio, NetworkPolicies, RabbitMQ y una IP pública mediante el `LoadBalancer` de ingress-nginx.

La guía completa, respuestas teóricas, costos, evidencias y limpieza están en [docu.md](docu.md). La fuente de las aplicaciones se reutiliza desde `../P5/apps`; P6 contiene la adaptación a nube y automatización.

```bash
cp config.env.example config.env
# Editar PROJECT_ID en config.env
gcloud auth login
bash scripts/create-infrastructure.sh
bash scripts/build-and-push.sh
bash scripts/generate-secrets.sh
bash scripts/deploy.sh
bash scripts/verify.sh
```

No se incluyen credenciales, una IP ficticia ni evidencias simuladas. El último script crea evidencia real en `evidence/` al ejecutarse contra la cuenta GCP.

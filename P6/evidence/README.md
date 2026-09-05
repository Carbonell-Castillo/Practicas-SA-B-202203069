# Evidencias

Ejecutar `bash scripts/verify.sh`. El script guardará aquí:

- `deployment.log`: fecha UTC, IP pública, nodos, pods, PVC, Ingress y release Helm.
- `public-health.log`: respuesta real de `/health` obtenida desde fuera del clúster.

Agregar capturas legibles de la consola GKE (dos nodos), Artifact Registry (ocho imágenes), workloads/pods y navegador o Postman usando la IP. No versionar archivos que contengan tokens o credenciales.

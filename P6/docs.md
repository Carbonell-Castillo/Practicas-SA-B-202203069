El despliegue en GCP quedó completamente operativo.

- Proyecto: `softwareavanzado-507703`
- Clúster: `sa-p6`
- Zona: `us-central1-a`
- Nodos: 2/2 `Ready`
- Aplicaciones: 7 Deployments, todos `2/2`
- PostgreSQL: `1/1`
- RabbitMQ: `1/1`
- PVC: 2 discos de 10 GiB, ambos `Bound`
- Helm: revisión 3, estado `deployed`
- Ocho imágenes publicadas en Artifact Registry
- Health público: HTTP 200, `allServicesUp: true`
- Frontend público: [http://136.113.87.253](http://136.113.87.253)
- Health: [http://136.113.87.253/health](http://136.113.87.253/health)
- Comunicación asíncrona validada con dos órdenes persistidas por `notifications-service`.
- Presupuesto de USD 10 configurado con alertas.

La evidencia quedó documentada en:

- [docu.md](<D:\bccas\USAC\SA\Practicas SA\P6\docu.md>)
- [01-despliegue-gke.md](<D:\bccas\USAC\SA\Practicas SA\P6\evidence\01-despliegue-gke.md>)

Antes de eliminarlo, toma estas capturas:

1. GKE → Clúster `sa-p6`, mostrando los dos nodos.
2. Workloads de `sa-p6`, mostrando réplicas disponibles.
3. Artifact Registry → `sa-platform`, mostrando las ocho imágenes.
4. Storage → PVC de PostgreSQL y RabbitMQ.
5. Navegador abierto en `/` y `/health`.
6. Presupuesto `Practica-6-limite-10USD`.

El clúster está activo y generando consumo. Cuando termines las capturas y la evaluación, ejecuta:

```powershell
gcloud container clusters delete sa-p6 `
  --zone us-central1-a `
  --project softwareavanzado-507703
```

Luego elimina el registro únicamente cuando ya no necesites demostrar las imágenes:

```powershell
gcloud artifacts repositories delete sa-platform `
  --location us-central1 `
  --project softwareavanzado-507703
```
# Análisis de continuidad del sistema

## ¿Qué se reconstruye y qué se conserva?

Terraform reconstruye red, GKE, nodos, namespaces, Workload Identity y ArgoCD. ArgoCD reconstruye operadores, políticas y workloads. No se reconstruyen desde Git los datos: el estado, backups y secretos se conservan en GCS/Secret Manager fuera del clúster.

## ¿Qué ocurre si se pierde un nodo?

Los servicios tienen dos réplicas, PDB con `minAvailable: 1`, anti-afinidad por hostname y probes. El drenaje voluntario preserva una réplica. PostgreSQL es de una réplica y se reprograma con su disco zonal; puede existir una pausa de escritura, limitación documentada.

## ¿Qué ocurre si se pierde todo el clúster?

El ciphertext ligado a Sealed Secrets ya no es una dependencia. External Secrets vuelve a materializar secretos desde Secret Manager mediante Workload Identity. Terraform recupera su estado de GCS y `sa-p9-apps` vuelve a declarar todo. Los PVC se recuperan desde Velero.

## ¿Qué garantiza y qué no garantiza el RPO?

El schedule por hora compromete como máximo 60 minutos solo cuando el último backup está `Completed` y el bucket sigue accesible. Una escritura posterior al último backup se pierde; la prueba crea deliberadamente ese caso. Velero no convierte PostgreSQL en una base distribuida ni garantiza consistencia transaccional entre varios servicios sin hooks de quiesce.

## ¿Por qué el backend y Velero usan buckets distintos?

Separan el plano de control de IaC del plano de datos y permiten políticas/roles mínimos. Destruir GKE no borra ninguno; perder un bucket no destruye automáticamente el otro.

# Diagrama del bootstrap y dependencias

```mermaid
flowchart TD
    U[Operador: bootstrap.ps1] --> P[Proyecto GCP aislado]
    P --> B1[Bucket GCS de estado versionado]
    P --> B2[Bucket GCS de Velero]
    P --> SM[Secret Manager]
    B1 --> TF[Terraform con bloqueo remoto]
    TF --> VPC[VPC y subred]
    TF --> GKE[GKE zonal, 2 nodos]
    TF --> WI[Workload Identity: Velero y ESO]
    GKE --> ARGO[ArgoCD instalado por Terraform]
    ARGO --> ROOT[sa-p9-apps]
    ROOT --> OPS[Rollouts, Kyverno, Ingress, ESO, Velero]
    OPS --> APP[sa-platform-prod]
    SM --> ESO[External Secrets]
    ESO --> APP
    APP --> DB[(PostgreSQL PVC)]
    APP --> SVC[Microservicios, PDB y anti-afinidad]
    DB -->|cada hora| VEL[Velero node-agent/snapshot]
    VEL --> B2
```

Las únicas precondiciones manuales son autenticar `gcloud` y disponer de una cuenta de créditos existente. Desde ahí, el script crea o verifica almacenamiento externo, secretos, Terraform, ArgoCD y GitOps sin pasos manuales intermedios. Los buckets y Secret Manager tienen un ciclo de vida independiente del clúster para que sigan disponibles durante la recuperación.

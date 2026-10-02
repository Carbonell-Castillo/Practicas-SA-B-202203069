# Práctica 9 — Continuidad operativa y recuperación ante desastres

Implementación del carnet **202203069**. El entorno usa un proyecto GCP aislado de cualquier sistema Bank-usac. El estado de Terraform, los respaldos de Velero y los secretos viven fuera del clúster, por lo que GKE puede destruirse y reconstruirse desde un único comando.

## Tabla 4.1 — enlaces obligatorios

| Ítem | Enlace o dato requerido |
| --- | --- |
| Repositorio GitOps | [Practicas-SA-B-202203069-gitops](https://github.com/Carbonell-Castillo/Practicas-SA-B-202203069-gitops) |
| Aplicación raíz en ArgoCD | `sa-p9-apps`, namespace `argocd` |
| Punto de entrada del bootstrap | [`P9/scripts/bootstrap.ps1`](scripts/bootstrap.ps1): `powershell -ExecutionPolicy Bypass -File P9/scripts/bootstrap.ps1 -AutoApprove` |
| Backend remoto de Terraform | GCS `gs://sa-p9-202203069-tfstate`, prefijo `p9/gke`; versionado y bloqueo nativo |
| Schedule de Velero | `sa-p9-hourly`, bucket `gs://sa-p9-202203069-velero`, cada hora, retención 7 días |
| Reconstrucción cronometrada | [Destrucción y reconstrucción completa](evidence/full-reconstruction-20261002.txt) |
| Restauración de datos | [Backup, restore y RPO real](evidence/data-restore-20261002T195435Z.txt) |
| Prueba de pérdida de nodo | [Drenaje y HTTP 200](evidence/node-loss-20261002T200215Z.txt) |
| RTO y RPO declarados | RTO objetivo: 30 min; RPO objetivo: 60 min. RTO de recuperación: 21 min 18 s; RPO probado: 10 s. Análisis en [INFORME-DR.md](INFORME-DR.md) |
| Video demostrativo | Pendiente de grabación por el estudiante; añadir URL pública y minutaje antes de entregar |

## Uso

Requisitos: `gcloud`, Terraform 1.13+, `kubectl`, Helm 3 y PowerShell 5.1+; sesión iniciada mediante `gcloud auth login` y una cuenta de créditos ya existente. El script no crea ni actualiza cuentas de pago.

```powershell
powershell -ExecutionPolicy Bypass -File P9/scripts/bootstrap.ps1 -AutoApprove
powershell -ExecutionPolicy Bypass -File P9/tests/verify.ps1 -Live
```

Para la demostración completa:

```powershell
powershell -ExecutionPolicy Bypass -File P9/scripts/test-data-recovery.ps1
powershell -ExecutionPolicy Bypass -File P9/scripts/test-node-loss.ps1
powershell -ExecutionPolicy Bypass -File P9/scripts/destroy-environment.ps1 -AutoApprove -Confirm:$false
powershell -ExecutionPolicy Bypass -File P9/scripts/bootstrap.ps1 -AutoApprove
```

La destrucción conserva deliberadamente los buckets y Secret Manager. Consulte [RUNBOOK.md](RUNBOOK.md) antes de una prueba de desastre.

## Diseño de continuidad

| Riesgo | Control implementado |
| --- | --- |
| Pérdida del estado local | Backend GCS versionado; Terraform usa bloqueo remoto y no genera estado versionado |
| Pérdida de PVC | Velero por hora, snapshots GCP y copia de sistema de archivos con node-agent/Kopia |
| Pérdida de la llave Sealed Secrets | Migración a External Secrets + Secret Manager mediante Workload Identity, sin llaves JSON |
| Pérdida de un nodo | Dos nodos, dos réplicas, PDB `minAvailable: 1`, anti-afinidad y probes |
| Reconstrucción manual | Terraform instala ArgoCD y `sa-p9-apps`; el app-of-apps instala todo lo demás |

El diagrama y el orden exacto están en [ARQUITECTURA.md](ARQUITECTURA.md). Las respuestas orientadas al sistema real están en [PREGUNTAS.md](PREGUNTAS.md).

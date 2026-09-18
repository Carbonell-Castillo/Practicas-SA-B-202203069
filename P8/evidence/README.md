# Índice de evidencia real

No se versionan capturas fabricadas. Después de ejecutar la práctica, agregar aquí los archivos y sustituir los marcadores del README principal.

| Evidencia | Archivo sugerido |
| --- | --- |
| `terraform plan` y `apply` | `terraform-plan.txt`, `terraform-apply.txt` |
| ArgoCD Synced/Healthy e historial | `argocd-application.png`, `argocd-history.txt` |
| Progresión canary | `rollout-promotion.txt` |
| AnalysisRun fallido y aborto | `rollout-rollback.txt` |
| Rechazo Kyverno | `kyverno-rejection.txt` |
| Verificación Cosign | `cosign-verify.txt` |
| Prueba de carga | `k6-summary.json`, `k6-report.html` |

Comandos de captura, ejecutados desde la estación del estudiante:

```bash
terraform -chdir=P8/terraform plan | tee P8/evidence/terraform-plan.txt
kubectl argo rollouts get rollout gateway -n sa-p8-prod --watch | tee P8/evidence/rollout-promotion.txt
cosign verify ghcr.io/carbonell-castillo/gateway:1.0.0 \
  --certificate-identity-regexp 'https://github.com/Carbonell-Castillo/Practicas-SA-B-202203069/.*' \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
  | tee P8/evidence/cosign-verify.txt
k6 run --summary-export=P8/evidence/k6-summary.json P8/tests/k6-load.js
```

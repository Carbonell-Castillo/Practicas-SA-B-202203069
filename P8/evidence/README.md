# Índice de evidencia real

Los archivos de esta carpeta fueron capturados durante la ejecución real en GKE del 18 de septiembre de 2026.

| Evidencia | Archivo sugerido |
| --- | --- |
| `terraform plan` y estado aplicado | `terraform-create-plan.txt`, `terraform-applied-state.txt`, `terraform-outputs.txt` |
| Verificación oficial | `reporte_p8_202203069.txt`, `resultados_p8.csv` |
| AnalysisRun fallido y aborto | `analysisrun-failed-1.0.3.yaml`, `gateway-aborted-1.0.3.yaml` |
| Servicio estable durante la reversión | `public-health-during-rollback.json` |
| Rechazo Kyverno | `kyverno-rejection.txt` |
| Verificación Cosign | `cosign-verify.txt` |
| Prueba de carga | `k6-summary.json`, `k6-console.txt` |

Comandos de captura, ejecutados desde la estación del estudiante:

```bash
terraform -chdir=P8/terraform plan | tee P8/evidence/terraform-plan.txt
kubectl argo rollouts get rollout gateway -n sa-p8-prod --watch | tee P8/evidence/rollout-promotion.txt
cosign verify ghcr.io/carbonell-castillo/gateway:1.0.2 \
  --certificate-identity-regexp 'https://github.com/Carbonell-Castillo/Practicas-SA-B-202203069/.*' \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
  | tee P8/evidence/cosign-verify.txt
k6 run --summary-export=P8/evidence/k6-summary.json P8/tests/k6-load.js
```

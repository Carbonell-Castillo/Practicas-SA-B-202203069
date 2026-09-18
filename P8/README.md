# Práctica 8 — GitOps, entrega progresiva y cadena de suministro

Entrega del carnet **202203069**. La plataforma evoluciona P5–P7 a un flujo donde el repositorio GitOps es la fuente de verdad, ArgoCD es el único reconciliador de aplicaciones y Argo Rollouts detiene automáticamente una versión que no supera sus análisis.

> Estado: infraestructura GKE, repositorios, pipeline, imágenes, SBOM, firma, GitOps y reversión verificados. El script oficial obtuvo **60/60** sobre el clúster `sa-p8`.

## Tabla 4.1 — enlaces obligatorios

| Ítem | Enlace o dato requerido |
| --- | --- |
| Repositorio GitOps | [Practicas-SA-B-202203069-gitops](https://github.com/Carbonell-Castillo/Practicas-SA-B-202203069-gitops) |
| Aplicación en ArgoCD | `sa-platform-prod`, namespace de ArgoCD `argocd`, destino `sa-p8-prod` |
| Ejecución exitosa del pipeline | [Release 1.0.2 · Run 35310455381](https://github.com/Carbonell-Castillo/Practicas-SA-B-202203069/actions/runs/35310455381) |
| Reversión automática | [Release fallida 1.0.3 · Run 35312427008](https://github.com/Carbonell-Castillo/Practicas-SA-B-202203069/actions/runs/35312427008), [PR GitOps #4](https://github.com/Carbonell-Castillo/Practicas-SA-B-202203069-gitops/pull/4) y [AnalysisRun fallido](evidence/analysisrun-failed-1.0.3.yaml) |
| Despliegue rechazado por política | [Salida real de Kyverno](evidence/kyverno-rejection.txt) para `busybox:latest` |
| Bloqueo por vulnerabilidad crítica | [Run bloqueado 35292544355](https://github.com/Carbonell-Castillo/Practicas-SA-B-202203069/actions/runs/35292544355), antes de corregir `perl-base` y Next.js |
| Imagen firmada | `ghcr.io/carbonell-castillo/gateway:1.0.2` y [salida de Cosign](evidence/cosign-verify.txt) |
| Reporte de prueba de carga | [Resumen JSON](evidence/k6-summary.json) y [salida de consola](evidence/k6-console.txt) |
| Verificador oficial | [Reporte 60/60](evidence/reporte_p8_202203069.txt) y [resultado CSV](evidence/resultados_p8.csv) |
| Video demostrativo | **PENDIENTE URL**; 00:00 arquitectura, 01:00 pipeline, 02:30 firma/SBOM, 03:30 ArgoCD, 04:30 canary, 06:00 rollback, 07:00 políticas |

## Componentes implementados

| Área | Implementación |
| --- | --- |
| Infraestructura | Terraform crea la VPC, subred, clúster GKE Standard, node pool, namespaces, ResourceQuota, LimitRange y RBAC. No instala la aplicación. |
| Empaquetado | Nueve charts: ocho workloads y la infraestructura de datos, con perfiles `dev` y `prod`. |
| GitOps | Aplicación ArgoCD multi-source, sincronización automática, prune y self-heal; el pipeline solo abre un PR que cambia tags. |
| Entrega progresiva | Cada chart usa Rollout canary con pesos 10 %, 25 %, 50 % y 100 %, pausas y AnalysisRun HTTP antes de avanzar. |
| Calidad | Pruebas unitarias heredadas, smoke, integración y k6 con error < 1 %, p95 < 500 ms y checks > 99 %. |
| Supply chain | Trivy bloqueante para severidad CRITICAL, SBOM SPDX, firma keyless por digest y política de verificación Kyverno. |
| Políticas | Prohibición de etiqueta flotante, recursos obligatorios, ejecución no-root y firma válida. |
| Secretos | Sealed Secrets; el repositorio contiene únicamente ciphertext ligado al clúster, nunca valores sensibles en claro. |
| Versionado | Las releases provienen de tags `vMAJOR.MINOR.PATCH`; no se publica una etiqueta flotante. |

## Estructura

```text
P8/
├── terraform/             # infraestructura base y RBAC
├── gitops-repository/     # contenido que se publica en el segundo repositorio
│   ├── argocd/
│   ├── charts/            # ocho charts; los servicios web usan Rollouts
│   ├── manifests/prod/
│   └── policies/
├── tests/                 # smoke, integración y carga
├── evidence/              # índice y evidencia real generada
├── ARQUITECTURA.md
├── BOOTSTRAP.md
└── INCIDENTE.md
```

El workflow activo está en `.github/workflows/p8-gitops.yml`. El workflow de P7 se conserva como evidencia histórica en `P7/evidence/p7-ci-cd.legacy.yml`, fuera de la ubicación que GitHub ejecuta, porque contenía el despliegue directo exigido por aquella práctica y prohibido en P8.

## Validación local

```bash
terraform -chdir=P8/terraform init -backend=false
terraform -chdir=P8/terraform validate
for chart in P8/gitops-repository/charts/*; do
  helm lint "$chart" -f "$chart/values-prod.yaml"
done
```

Copiar `P8/p8.conf.example` como `p8.conf` junto al script oficial de evaluación y actualizar la versión de `IMAGE` tras la primera release. La publicación, bootstrap y demostración se detallan en [BOOTSTRAP.md](BOOTSTRAP.md); el flujo visual está en [ARQUITECTURA.md](ARQUITECTURA.md) y el informe de una página en [INCIDENTE.md](INCIDENTE.md).

# Práctica 8 — GitOps, entrega progresiva y cadena de suministro

Entrega del carnet **202203069**. La plataforma evoluciona P5–P7 a un flujo donde el repositorio GitOps es la fuente de verdad, ArgoCD es el único reconciliador de aplicaciones y Argo Rollouts detiene automáticamente una versión que no supera sus análisis.

> Estado: la implementación local está completa. Los enlaces marcados **PENDIENTE** requieren publicar el segundo repositorio, disponer del clúster y ejecutar la demostración; no se inventaron URLs ni evidencias.

## Tabla 4.1 — enlaces obligatorios

| Ítem | Enlace o dato requerido |
| --- | --- |
| Repositorio GitOps | [Practicas-SA-B-202203069-gitops](https://github.com/Carbonell-Castillo/Practicas-SA-B-202203069-gitops) — **PENDIENTE de publicar** |
| Aplicación en ArgoCD | `sa-platform-prod`, namespace de ArgoCD `argocd`, destino `sa-p8-prod` |
| Ejecución exitosa del pipeline | [Workflow P8](https://github.com/Carbonell-Castillo/Practicas-SA-B-202203069/actions/workflows/p8-gitops.yml) — **PENDIENTE reemplazar por URL directa del run** |
| Reversión automática | [Runs del workflow](https://github.com/Carbonell-Castillo/Practicas-SA-B-202203069/actions/workflows/p8-gitops.yml) y Rollout `gateway` en `sa-p8-prod` — **PENDIENTE URL directa** |
| Despliegue rechazado por política | Política `disallow-latest-tag` — **PENDIENTE URL directa a evidencia** |
| Bloqueo por vulnerabilidad crítica | Job `Trivy bloquea CVE críticas` — **PENDIENTE URL directa al PR/run bloqueado** |
| Imagen firmada | `ghcr.io/carbonell-castillo/gateway:1.0.0` |
| Reporte de prueba de carga | `P8/evidence/k6-summary.json` — se genera con el comando documentado en `evidence/README.md` |
| Video demostrativo | **PENDIENTE URL**; 00:00 arquitectura, 01:00 pipeline, 02:30 firma/SBOM, 03:30 ArgoCD, 04:30 canary, 06:00 rollback, 07:00 políticas |

## Componentes implementados

| Área | Implementación |
| --- | --- |
| Infraestructura | Terraform crea namespace, ResourceQuota, LimitRange, ServiceAccount, Role y RoleBinding. No instala la aplicación. |
| Empaquetado | Ocho charts, uno por microservicio o tarea, con `values-dev.yaml` y `values-prod.yaml`. |
| GitOps | Aplicación ArgoCD multi-source, sincronización automática, prune y self-heal; el pipeline solo abre un PR que cambia tags. |
| Entrega progresiva | Cada chart usa Rollout canary con pesos 10 %, 25 %, 50 % y 100 %, pausas y AnalysisRun HTTP antes de avanzar. |
| Calidad | Pruebas unitarias heredadas, smoke, integración y k6 con error < 1 %, p95 < 500 ms y checks > 99 %. |
| Supply chain | Trivy bloqueante para severidad CRITICAL, SBOM SPDX, firma keyless por digest y política de verificación Kyverno. |
| Políticas | Prohibición de etiqueta flotante, recursos obligatorios, ejecución no-root y firma válida. |
| Secretos | External Secrets; el repositorio contiene referencias, nunca valores sensibles. |
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

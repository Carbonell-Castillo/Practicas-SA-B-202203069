# Repositorio GitOps de SA - Práctica 8

Este directorio es el contenido listo para publicarse como el repositorio independiente `Practicas-SA-B-202203069-gitops`. El repositorio es la única fuente de verdad de aplicaciones; ArgoCD realiza toda reconciliación.

## Estructura

- `argocd/`: proyecto y aplicación multi-source `sa-platform-prod`.
- `charts/`: un chart por microservicio o tarea, con perfiles `dev` y `prod`.
- `manifests/prod/`: red y referencias de External Secrets.
- `policies/`: cuatro políticas Kyverno en modo Enforce.

Antes de sincronizar, instale en el clúster ArgoCD, Argo Rollouts, Kyverno y External Secrets; configure `platform-secret-store`; y cree la infraestructura base con Terraform desde el repositorio de código. El bootstrap inicial de `argocd/project.yaml`, las políticas y `argocd/application-prod.yaml` se realiza desde una estación administrativa. A partir de ese momento, ningún workflow posee acceso al clúster.

Las versiones se modifican exclusivamente en `charts/*/values-prod.yaml` mediante el Pull Request automático generado por el pipeline del repositorio de código.

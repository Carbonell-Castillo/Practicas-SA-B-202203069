# Evidencia de GitHub Actions y GitOps

- Pipeline exitoso: https://github.com/Carbonell-Castillo/Practicas-SA-B-202203069/actions/runs/35293031535
- Pull Request bloqueado por Trivy y cerrado sin fusionar: https://github.com/Carbonell-Castillo/Practicas-SA-B-202203069/pull/2
- Run del PR con resultado fallido: https://github.com/Carbonell-Castillo/Practicas-SA-B-202203069/actions/runs/35464274539
- Job bloqueante del frontend: https://github.com/Carbonell-Castillo/Practicas-SA-B-202203069/actions/runs/35464274539/job/105953640432
- Pull Request GitOps creado automáticamente y fusionado: https://github.com/Carbonell-Castillo/Practicas-SA-B-202203069-gitops/pull/1
- Commit resultante en GitOps: `7c1dad4fee05068258e750cbce3686240b8f8809`

El PR #2 retrocedió de forma controlada Next.js de `16.3.3` a `16.3.0`. Trivy detectó dos vulnerabilidades críticas corregibles (`CVE-2026-75604` y `GHSA-2xp9-vwfh-vxw4`) y finalizó con código 1. Las otras siete imágenes pasaron. La imagen vulnerable no se publicó, el PR no se fusionó y su rama fue eliminada; `main` conservó Next.js `16.3.3`.

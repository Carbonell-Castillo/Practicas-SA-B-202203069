# Evidencia de Pull Request bloqueado por Trivy

Fecha de ejecución: 19 de septiembre de 2026.

- Pull Request: [#2 · evidencia de PR bloqueado por Trivy](https://github.com/Carbonell-Castillo/Practicas-SA-B-202203069/pull/2).
- Workflow: [run 35464274539](https://github.com/Carbonell-Castillo/Practicas-SA-B-202203069/actions/runs/35464274539), conclusión `failure`.
- Job bloqueante: [Trivy bloquea PR · frontend](https://github.com/Carbonell-Castillo/Practicas-SA-B-202203069/actions/runs/35464274539/job/105953640432).
- Cambio controlado: Next.js `16.3.3` → `16.3.0`.
- Resultado: `Total: 2 (CRITICAL: 2)`.
- Hallazgos: `CVE-2026-75604` y `GHSA-2xp9-vwfh-vxw4`.
- Corrección indicada por el escáner: Next.js `16.3.3`.

El job de Pull Request utilizó `load: true` y `push: false`: construyó la imagen únicamente dentro del runner y no la publicó en GHCR. Los otros siete escaneos Trivy finalizaron correctamente. Los jobs de publicación y creación del PR GitOps quedaron omitidos.

Después de registrar el resultado, el Pull Request fue cerrado deliberadamente sin fusionar y se eliminó la rama remota `evidence/trivy-pr-blocked`. La rama `main` mantuvo la dependencia segura Next.js `16.3.3`, por lo que no se desplegó el cambio vulnerable ni se modificó GCP.

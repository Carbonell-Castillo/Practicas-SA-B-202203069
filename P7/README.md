# Práctica 7 — CI/CD con GitHub Actions y Kind

Pipeline completamente autocontenido: compila, prueba, valida los ocho Dockerfiles y despliega la plataforma en un clúster Kubernetes **Kind efímero dentro del runner de GitHub Actions**. No usa GCP, no necesita credenciales y no deja infraestructura ni costos al finalizar.

El workflow está en `../.github/workflows/p7-ci-cd.yml` porque GitHub únicamente reconoce workflows dentro de `.github/workflows` en la raíz del repositorio.

## Ejecución

```bash
git add P5/apps/authorization-service/src/app.controller.spec.ts P7 .github/workflows/p7-ci-cd.yml
git commit -m "feat: implementar CI/CD con Kind para practica 7"
git push origin main
```

También puede iniciarse desde **GitHub > Actions > P7 CI/CD · Kind efímero > Run workflow**. No hay variables ni secrets que configurar.

La ejecución muestra las fases separadas como en la referencia:

1. preparación/versionamiento;
2. matrices de build Node y Python;
3. matriz de pruebas y validación Helm;
4. matriz de ocho builds Docker;
5. despliegue y smoke test sobre Kind.

La guía técnica, diagrama, criterios de éxito y respuestas teóricas están en [DOCUMENTACION.md](DOCUMENTACION.md).

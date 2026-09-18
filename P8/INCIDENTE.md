# Informe de incidente — fallo inducido

**Qué falló:** se publicó deliberadamente la versión `1.0.1` del gateway con `P8_INDUCED_FAILURE=true`. Su endpoint `/health` respondió HTTP 503, aunque el proceso continuó ejecutándose, simulando una regresión funcional detectable únicamente al enviar tráfico.

**Cómo se detectó:** el `AnalysisTemplate gateway-health` ejecutó una prueba HTTP tres veces contra `gateway-canary`. El primer HTTP 503 superó el límite `failureLimit: 1`; por ello el `AnalysisRun` terminó en `Failed` y no se alcanzó el siguiente paso. La prueba de carga complementaria exige menos de 1 % de errores y p95 menor de 500 ms.

**Cómo se contuvo:** Argo Rollouts abortó automáticamente la revisión nueva y mantuvo la revisión estable. El fallo se detectó en el primer escalón, con 10 % del tráfico declarado para el canary; la versión defectuosa nunca alcanzó 25 %, 50 % ni 100 %.

**Tiempo de recuperación:** completar con la evidencia real: `[hora de publicación]` a `[hora de estado estable]`, total `[N] minutos`. El objetivo operativo es menos de cinco minutos.

**Cómo prevenirlo:** agregar una prueba de contrato del endpoint `/health` sobre la imagen antes de firmarla habría impedido abrir el PR GitOps. El canary permanece como defensa en profundidad ante fallos dependientes del ambiente.

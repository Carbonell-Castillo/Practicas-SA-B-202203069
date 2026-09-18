# Informe de incidente — fallo inducido

**Qué falló:** se publicó deliberadamente la versión `1.0.3` del gateway con `P8_INDUCED_FAILURE=true`. Su endpoint `/health` respondió HTTP 503, aunque el proceso continuó ejecutándose, simulando una regresión funcional detectable únicamente al enviar tráfico.

**Cómo se detectó:** el `AnalysisTemplate gateway-health` ejecutó una prueba HTTP tres veces contra `gateway-canary`. El primer HTTP 503 superó el límite `failureLimit: 1`; por ello el `AnalysisRun` terminó en `Failed` y no se alcanzó el siguiente paso. La prueba de carga complementaria exige menos de 1 % de errores y p95 menor de 500 ms.

**Cómo se contuvo:** Argo Rollouts abortó automáticamente la revisión nueva y mantuvo la revisión estable. El fallo se detectó en el primer escalón, con 10 % del tráfico declarado para el canary; la versión defectuosa nunca alcanzó 25 %, 50 % ni 100 %.

**Tiempo de recuperación:** el AnalysisRun terminó en `Failed` a las 05:56:13 UTC y el PR declarativo de recuperación se fusionó a las 05:57:29 UTC: **76 segundos**. Durante todo el incidente, la revisión estable `1.0.2` siguió atendiendo tráfico y el endpoint público `/health` permaneció en HTTP 200.

**Cómo prevenirlo:** agregar una prueba de contrato del endpoint `/health` sobre la imagen antes de firmarla habría impedido abrir el PR GitOps. El canary permanece como defensa en profundidad ante fallos dependientes del ambiente.

# Runbook: consumo acelerado de disponibilidad

**Alerta:** `P10AvailabilityErrorBudgetFastBurn`. **Responsable:** equipo de plataforma. **Objetivo:** disponibilidad 99.5 % / 30 días.

1. Confirmar alcance con `slo:http_availability:ratio_rate5m` y tasa 5xx por `service`.
2. Revisar el Rollout y AnalysisRuns; si el candidato concentra errores, abortarlo.
3. Abrir una traza 5xx en Tempo y seguir su `trace_id` hacia Loki.
4. Si falla una dependencia estable, revisar pods, endpoints, PostgreSQL y RabbitMQ sin borrar volúmenes.
5. Cerrar cuando el burn rate sea < 1 por 30 minutos y registrar causa/acción.

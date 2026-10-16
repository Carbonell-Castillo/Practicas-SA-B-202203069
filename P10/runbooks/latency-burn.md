# Runbook: consumo acelerado de latencia

**Alerta:** `P10LatencyErrorBudgetBurn`. **Responsable:** equipo de plataforma. **Objetivo:** p95 ≤ 750 ms / 30 días.

1. Comparar p95 estable/canary y el panel de saturación.
2. Inspeccionar en Tempo la traza lenta gateway → órdenes → productos.
3. Correlacionar `trace_id` en Loki y localizar el span dominante.
4. Abortar el canary si excede 750 ms; no promover ni ampliar el umbral.
5. Confirmar p95 sano durante 30 minutos después de la corrección.

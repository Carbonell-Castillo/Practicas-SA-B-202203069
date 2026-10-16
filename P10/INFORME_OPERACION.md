# Informe de operación (máximo 2 páginas)

## Incidente observado

Se inyectó una demora de 1.2 s exclusivamente en la revisión candidata de `orders-service` mediante `P10_DELAY_MS`, un modo de fallo diferente al 503 de P8. Se dirigió tráfico real al Service canary. Prometheus observó p95 por encima de 750 ms; el AnalysisRun falló y Argo Rollouts abortó la promoción, conservando la revisión estable. El evento queda verificable en el historial del Rollout y en el AnalysisRun fallido.

## Recorrido síntoma → alerta → traza → registro

1. El panel de latencia y el SLI muestran el síntoma; la alerta de burn rate identifica el presupuesto afectado.
2. En Grafana/Tempo se filtra `service.name=orders-service` y se abre una traza lenta del flujo gateway → órdenes → productos.
3. Desde el identificador de la traza se navega a Loki. El registro JSON incluye el mismo `trace_id`, ruta, estado y servicio.
4. La causa queda en el span de órdenes y en el valor controlado de demora de la revisión candidata. El recorrido está diseñado para completarse en menos de tres minutos.

## Decisión operativa

No se promovió el artefacto lento. La corrección fue revertir declarativamente `P10_DELAY_MS` a `0`; Argo CD reconcilió y una revisión sana superó ambas consultas PromQL. No se alteraron manualmente recursos administrados ni los componentes de recuperación de P9. Los runbooks indican propietario, consultas y acciones, evitando alertas sin respuesta.

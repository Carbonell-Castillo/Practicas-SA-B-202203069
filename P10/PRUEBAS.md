# Guía de pruebas P10

## Flujo distribuido y métricas

```bash
kubectl -n sa-p9-prod port-forward svc/gateway-stable 18080:8080
curl -s http://localhost:18080/api/orders
curl -s http://localhost:18080/metrics | grep http_server_requests_total
```

Abra Grafana con `kubectl -n observabilidad port-forward svc/kube-prometheus-stack-grafana 13000:80` y use `admin / p10-observabilidad`. En Explore, consulte `{namespace="sa-p9-prod"} | json | trace_id != ""`; el enlace `TraceID` abre Tempo.

## Prometheus y SLO

```bash
kubectl -n observabilidad port-forward svc/kube-prometheus-stack-prometheus 19090:9090
curl -sG --data-urlencode 'query=slo:http_availability:ratio_rate5m' localhost:19090/api/v1/query | jq
curl -sG --data-urlencode 'query=pedidos_creados_total' localhost:19090/api/v1/query | jq
```

## Evidencia de rollback

El historial debe conservar al menos un AnalysisRun `Failed`. Para repetir la demostración se crea una revisión declarativa con `orders-service.env.P10_DELAY_MS=1200`, se sincroniza por GitOps y se envía tráfico al Service `orders-service-canary`; la consulta p95 del AnalysisTemplate aborta la revisión. Después se revierte el valor a `0` mediante otro commit. No se usa un Job sintético como proveedor del análisis.

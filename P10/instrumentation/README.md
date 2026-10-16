# Instrumentación

La implementación ejecutable vive en `P5/apps/gateway`, `P5/apps/orders-service` y `P5/apps/products-service`. Los tres usan OpenTelemetry/OTEL, propagación W3C TraceContext (`traceparent`) con extracción e inyección automática, métricas Prometheus y registros JSON con `trace_id`.

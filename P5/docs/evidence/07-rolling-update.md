# Evidencia: RollingUpdate sin caída de servicio (sección F)

## Estrategia configurada
```
{"rollingUpdate":{"maxSurge":1,"maxUnavailable":0},"type":"RollingUpdate"}
```

## Peticiones continuas (cada 200ms) a GET /api/products vía Ingress, durante un `kubectl rollout restart` de products-service
TOTAL: ok=60 fail=0
```

# Pruebas automáticas

- `smoke.sh`: exige HTTP 200 y confirma que gateway y dependencias estén saludables.
- `integration.sh`: recorre gateway y catálogo, y valida el contrato JSON.
- `k6-load.js`: 10 usuarios por 60 segundos; falla si los errores alcanzan 1 %, si p95 alcanza 500 ms o si menos del 99 % de las verificaciones pasa.

Los umbrales limitan el impacto de una versión canary: una tasa de error menor a 1 % mantiene el SLO de disponibilidad y un p95 menor a 500 ms evita promover regresiones perceptibles. El `AnalysisTemplate` aplica los mismos límites durante cada etapa.

```bash
BASE_URL=https://app.example.com bash P8/tests/smoke.sh
BASE_URL=https://app.example.com bash P8/tests/integration.sh
k6 run -e BASE_URL=https://app.example.com P8/tests/k6-load.js
```

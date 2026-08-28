# Evidencia: PodDisruptionBudget, ResourceQuota, LimitRange, Ingress (sección F/E)

## PodDisruptionBudget (uno por microservicio)
```
NAME                    MIN AVAILABLE   MAX UNAVAILABLE   ALLOWED DISRUPTIONS   AGE
auth-service            1               N/A               1                     28m
authorization-service   1               N/A               1                     28m
frontend                1               N/A               1                     28m
gateway                 1               N/A               4                     28m
notifications-service   1               N/A               1                     28m
orders-service          1               N/A               3                     28m
postgres                N/A             1                 1                     28m
products-service        1               N/A               4                     28m
```

## ResourceQuota (uso real durante la prueba de carga)
```
Name:            sa-p5-quota
Namespace:       sa-p5
Resource         Used    Hard
--------         ----    ----
limits.cpu       9800m   12
limits.memory    5952Mi  10Gi
pods             24      60
requests.cpu     1300m   6
requests.memory  2368Mi  6Gi
```

## LimitRange
```
Name:       sa-p5-limits
Namespace:  sa-p5
Type        Resource  Min  Max  Default Request  Default Limit  Max Limit/Request Ratio
----        --------  ---  ---  ---------------  -------------  -----------------------
Container   memory    -    -    128Mi            256Mi          -
Container   cpu       -    -    100m             250m           -
```

## Ingress (único punto de entrada)
```
Name:             sa-platform-ingress
Labels:           app.kubernetes.io/managed-by=Helm
                  app.kubernetes.io/part-of=sa-platform
Namespace:        sa-p5
Address:          localhost
Ingress Class:    nginx
Default backend:  <default>
Rules:
  Host        Path  Backends
  ----        ----  --------
  *           
              /api                gateway:8080 (10.244.33.165:8080,10.244.33.152:8080,10.244.33.171:8080 + 2 more...)
              /products/graphql   gateway:8080 (10.244.33.165:8080,10.244.33.152:8080,10.244.33.171:8080 + 2 more...)
              /orders/graphql     gateway:8080 (10.244.33.165:8080,10.244.33.152:8080,10.244.33.171:8080 + 2 more...)
              /health             gateway:8080 (10.244.33.165:8080,10.244.33.152:8080,10.244.33.171:8080 + 2 more...)
              /docs               gateway:8080 (10.244.33.165:8080,10.244.33.152:8080,10.244.33.171:8080 + 2 more...)
              /                   frontend:3000 (10.244.33.185:3000,10.244.33.187:3000)
Annotations:  meta.helm.sh/release-name: sa-platform
              meta.helm.sh/release-namespace: sa-p5
Events:
  Type    Reason  Age                From                      Message
  ----    ------  ----               ----                      -------
  Normal  Sync    27m (x2 over 28m)  nginx-ingress-controller  Scheduled for sync
```

# Evidencia: NetworkPolicy — aislamiento de red (sección E)

## NetworkPolicies activas en sa-p5
```
NAME                                      POD-SELECTOR                                                                                              AGE
allow-auth-egress-to-authorization        sa-platform/component=auth-service                                                                        21m
allow-auth-to-authorization               sa-platform/component=authorization-service                                                               21m
allow-broker-clients-egress-to-rabbitmq   sa-platform/component in (cron-jobs,notifications-service,orders-service)                                 21m
allow-broker-clients-to-rabbitmq          app.kubernetes.io/name=rabbitmq                                                                           21m
allow-db-clients-egress-to-postgres       sa-platform/component in (auth-service,cron-jobs,notifications-service,orders-service,products-service)   21m
allow-db-clients-to-postgres              app.kubernetes.io/name=postgresql                                                                         21m
allow-dns-egress                          <none>                                                                                                    21m
allow-frontend-egress-to-gateway          sa-platform/component=frontend                                                                            21m
allow-frontend-to-gateway                 sa-platform/component=gateway                                                                             21m
allow-gateway-egress-to-services          sa-platform/component=gateway                                                                             21m
allow-gateway-to-services                 sa-platform/component in (auth-service,authorization-service,orders-service,products-service)             21m
allow-ingress-to-edge                     sa-platform/component in (frontend,gateway)                                                               21m
allow-orders-egress-to-products           sa-platform/component=orders-service                                                                      21m
allow-orders-to-products                  sa-platform/component=products-service                                                                    21m
default-deny-all                          <none>                                                                                                    21m
```

## Pod NO autorizado (sin label sa-platform/component) intentando alcanzar Postgres, RabbitMQ y products-service directamente
```
pod/netpol-attacker created
--> postgres:5432 (debe FALLAR, timeout):
* IPv6: (none)
* IPv4: 10.96.167.88
*   Trying 10.96.167.88:5432...
Terminated   <-- timeout de 5s agotado, conexión nunca establecida (bloqueada por default-deny-all + allow-db-clients-to-postgres, que no incluye a este pod)
--> rabbitmq:5672 (debe FALLAR, timeout):
* IPv6: (none)
* IPv4: 10.96.132.173
*   Trying 10.96.132.173:5672...
Terminated   <-- idem, bloqueado por allow-broker-clients-to-rabbitmq
--> products-service:4002/health (debe FALLAR, timeout):
Terminated   <-- idem, bloqueado por allow-gateway-to-services (solo gateway/orders-service tienen permiso)
(salida vacia arriba = timeout, correcto)
```

## Control positivo: el gateway SÍ puede alcanzar products-service (ya demostrado en 01/04 vía Ingress, se repite aquí desde un pod con el label correcto)
```
{"status":"ok","service":"products-service"}```

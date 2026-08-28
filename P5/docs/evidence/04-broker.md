# Evidencia: acumulación y drenado de mensajes (broker, sección D)

## Escalar notifications-service a 0 réplicas (simula consumidor caído)
```
The HorizontalPodAutoscaler "notifications-service" is invalid: 
* spec.minReplicas: Invalid value: 0: must be greater than or equal to 1
* spec.metrics: Forbidden: must specify at least one Object or External metric to support scaling to zero replicas
deployment.apps/notifications-service scaled
NAME                                     READY   STATUS        RESTARTS   AGE
notifications-service-7fdb4c4cbc-6lmpp   1/1     Terminating   0          7m2s
notifications-service-7fdb4c4cbc-pmx9k   1/1     Terminating   0          8m6s
```

## El HPA reescalaría automáticamente a minReplicas=2; se borra temporalmente para sostener 0 réplicas durante la demo
```
horizontalpodautoscaler.autoscaling "notifications-service" deleted from sa-p5 namespace
deployment.apps/notifications-service scaled
NAME                                     READY   STATUS        RESTARTS   AGE
notifications-service-7fdb4c4cbc-6lmpp   1/1     Terminating   0          7m20s
notifications-service-7fdb4c4cbc-pmx9k   1/1     Terminating   0          8m24s
```

## Con el consumidor caído, se crean 5 órdenes (el productor sigue respondiendo normal)
```
 -> HTTP 201
 -> HTTP 201
 -> HTTP 201
 -> HTTP 201
 -> HTTP 201
```

## Cola durable acumulando mensajes sin consumir (rabbitmqctl list_queues)
```
Timeout: 60.0 seconds ...
Listing queues for vhost / ...
name	messages	consumers	durable
notifications.order-created	5	0	true
notifications.cron-summary	0	0	true
```

## Se restaura notifications-service (reescala a 2 réplicas + se recrea el HPA)
```
deployment.apps/notifications-service scaled
pod/notifications-service-7fdb4c4cbc-q5l65 condition met
pod/notifications-service-7fdb4c4cbc-sjbx6 condition met
-- cola tras reconectar el consumidor --
Timeout: 60.0 seconds ...
Listing queues for vhost / ...
name	messages	consumers	durable
notifications.order-created	0	2	true
notifications.cron-summary	0	2	true
```

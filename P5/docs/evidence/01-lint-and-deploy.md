# Evidencia: helm lint + despliegue inicial

## helm lint
```
==> Linting .
[INFO] Chart.yaml: icon is recommended

1 chart(s) linted, 0 chart(s) failed
```

## helm dependency update
```
NAME                 	VERSION	REPOSITORY                         	STATUS
postgresql           	16.7.0 	https://charts.bitnami.com/bitnami 	ok    
rabbitmq             	0.1.0  	file://charts/rabbitmq             	ok    
sa-common            	0.1.0  	file://charts/sa-common            	ok    
auth-service         	0.1.0  	file://charts/auth-service         	ok    
authorization-service	0.1.0  	file://charts/authorization-service	ok    
products-service     	0.1.0  	file://charts/products-service     	ok    
orders-service       	0.1.0  	file://charts/orders-service       	ok    
notifications-service	0.1.0  	file://charts/notifications-service	ok    
gateway              	0.1.0  	file://charts/gateway              	ok    
frontend             	0.1.0  	file://charts/frontend             	ok    
cron-jobs            	0.1.0  	file://charts/cron-jobs            	ok    

```

## kubectl get pods -n sa-p5
```
NAME                                     READY   STATUS      RESTARTS   AGE
auth-service-8475976b9d-7g7dn            1/1     Running     0          4m26s
auth-service-8475976b9d-cxf8w            1/1     Running     0          4m11s
authorization-service-8996d8d88-7sjq7    1/1     Running     0          15m
authorization-service-8996d8d88-m4x7b    1/1     Running     0          16m
cron-jobs-heartbeat-29796938-zkcfm       0/1     Completed   0          4m14s
cron-jobs-heartbeat-29796940-jh8dj       0/1     Completed   0          2m14s
cron-jobs-heartbeat-29796942-qs2bf       1/1     Running     0          14s
cron-jobs-summary-29796940-6cp2j         0/1     Completed   0          2m14s
frontend-785858487f-2wh5x                1/1     Running     0          15m
frontend-785858487f-85fsd                1/1     Running     0          16m
gateway-6b5f55df9f-8fg5h                 1/1     Running     0          2m47s
gateway-6b5f55df9f-sl44k                 1/1     Running     0          4m26s
notifications-service-7fdb4c4cbc-6lmpp   1/1     Running     0          3m22s
notifications-service-7fdb4c4cbc-7d2q8   1/1     Running     0          2m46s
notifications-service-7fdb4c4cbc-8f4bp   1/1     Running     0          3m38s
notifications-service-7fdb4c4cbc-pmx9k   1/1     Running     0          4m26s
notifications-service-7fdb4c4cbc-t7lzv   1/1     Running     0          4m15s
orders-service-5bcbfbfb9d-4glbk          1/1     Running     0          3m36s
orders-service-5bcbfbfb9d-j6vb6          1/1     Running     0          3m45s
orders-service-5bcbfbfb9d-lj6mq          1/1     Running     0          4m26s
orders-service-5bcbfbfb9d-rlrdz          1/1     Running     0          4m12s
orders-service-5bcbfbfb9d-wzh24          1/1     Running     0          2m
postgres-0                               1/1     Running     0          16m
products-service-65779b5d77-jbzzs        1/1     Running     0          15m
products-service-65779b5d77-r7vlm        1/1     Running     0          16m
rabbitmq-0                               1/1     Running     0          16m
```

## kubectl get svc -n sa-p5
```
NAME                    TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)              AGE
auth-service            ClusterIP   10.96.111.165   <none>        4000/TCP             16m
authorization-service   ClusterIP   10.96.214.221   <none>        4001/TCP             16m
frontend                ClusterIP   10.96.248.134   <none>        3000/TCP             16m
gateway                 ClusterIP   10.96.180.149   <none>        8080/TCP             16m
notifications-service   ClusterIP   10.96.133.85    <none>        4004/TCP             16m
orders-service          ClusterIP   10.96.210.170   <none>        4003/TCP             16m
postgres                ClusterIP   10.96.167.88    <none>        5432/TCP             16m
postgres-hl             ClusterIP   None            <none>        5432/TCP             16m
products-service        ClusterIP   10.96.210.86    <none>        4002/TCP             16m
rabbitmq                ClusterIP   10.96.132.173   <none>        5672/TCP,15672/TCP   16m
rabbitmq-headless       ClusterIP   None            <none>        5672/TCP             16m
```

## helm list -n sa-p5
```
NAME       	NAMESPACE	REVISION	UPDATED                              	STATUS  	CHART            	APP VERSION
sa-platform	sa-p5    	1       	2026-08-27 01:26:13.6394205 -0600 CST	deployed	sa-platform-0.1.0	1.0.0      
```

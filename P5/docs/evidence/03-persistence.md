# Evidencia: persistencia de datos (StatefulSet + PVC, sección C)

## PVC asociado a postgres-0
```
NAME                                    STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   VOLUMEATTRIBUTESCLASS   AGE
persistentvolumeclaim/data-postgres-0   Bound    pvc-ec956410-12ef-476c-928b-9811c039e0fc   1Gi        RWO            standard       <unset>                 18m

NAME                        READY   AGE
statefulset.apps/postgres   1/1     18m

NAME                  TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)    AGE
service/postgres      ClusterIP   10.96.167.88   <none>        5432/TCP   18m
service/postgres-hl   ClusterIP   None           <none>        5432/TCP   18m
```

## Antes del borrado: orden de prueba ya existente en p4_orders_db
```
                  id                  |     userId      | total 
--------------------------------------+-----------------+-------
 a5819a0e-db11-49e5-bc4d-83529263cedb | smoke-test-user | 91.98
(1 row)

```

## Borrado forzado del pod postgres-0
```
pod "postgres-0" deleted from sa-p5 namespace
```

## Después del borrado (pod recreado, mismo PVC re-adjuntado): mismos datos
```
Running started=2026-08-27T07:45:20Z
                  id                  |     userId      | total 
--------------------------------------+-----------------+-------
 a5819a0e-db11-49e5-bc4d-83529263cedb | smoke-test-user | 91.98
(1 row)

```

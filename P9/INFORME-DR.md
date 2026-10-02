# Informe de la prueba de DR

## Objetivos declarados

**RTO: 30 minutos.** Es suficiente para un laboratorio académico y cubre aprovisionamiento zonal de GKE, instalación de operadores y reconciliación de nueve charts. **RPO: 60 minutos.** Coincide con el schedule `sa-p9-hourly`; los backups se retienen siete días.

## Escenario ejecutado

Se respalda `sa-p9-prod`, se destruyen con Terraform GKE, VPC, identidades y ArgoCD, conservando estado remoto, bucket Velero y Secret Manager. Luego se ejecuta el único bootstrap y ArgoCD reconstruye operadores y plataforma. En una prueba separada se elimina contenido PostgreSQL y se restaura el PVC desde Velero.

## Tiempos medidos

La recuperación activada tomó **1278 segundos (21 min 18 s)** desde el inicio del bootstrap hasta `BOOTSTRAP_OK`, por debajo del RTO objetivo de 30 minutos. La duración extrema desde que empezó la destrucción deliberada hasta la recuperación fue **1859 segundos (30 min 59 s)**; incluye 9 min 42 s dedicados a destruir y comprobar la ausencia del clúster antes de activar la recuperación. La trazabilidad de operaciones GKE y la recuperación cruzada están en [`full-reconstruction-20261002.txt`](evidence/full-reconstruction-20261002.txt). Una segunda ejecución idempotente confirmó `0 added, 0 changed, 0 destroyed` y reconciliación completa en **259 segundos**, registrada en [`bootstrap-idempotent-20261002.txt`](evidence/bootstrap-idempotent-20261002.txt).

## Pérdida medida

El ensayo midió **RPO real de 10 segundos**: recuperó `before-20261002T195435Z` con el contenido exacto `contenido persistente recuperable` y no recuperó el registro posterior al backup (`count=0`). Velero completó 1863/1863 objetos de backup y 517/517 de restore; Kopia restauró los volúmenes de PostgreSQL y RabbitMQ. Véase [`data-restore-20261002T195435Z.txt`](evidence/data-restore-20261002T195435Z.txt). El RPO contractual sigue siendo 60 minutos porque el schedule automático es horario; los 10 segundos son el resultado del ensayo manual controlado.

## Puntos únicos de fallo detectados

La cuenta GCP sigue siendo una dependencia administrativa externa. El clúster es zonal: tolera drenaje de un nodo, no la pérdida de toda la zona. PostgreSQL usa una sola réplica; durante su reprogramación puede haber indisponibilidad de escritura aunque el gateway siga respondiendo. El repositorio GitHub, el backend GCS y Secret Manager son dependencias externas deliberadas.

## Brecha y plan

El procedimiento activado cumple el RTO, pero el ejercicio extremo lo excedió por 59 segundos al contabilizar también la destrucción deliberada y su verificación. Para reducir esa brecha: automatizar la declaración del desastre inmediatamente después de confirmar la pérdida, usar un clúster regional, PostgreSQL administrado o HA, backups cada 15 minutos, replicación dual-region del bucket y una identidad de recuperación secundaria ensayada. El drenaje de nodo mantuvo el gateway en HTTP 200 y descubrió un permiso incorrecto de `.erlang.cookie`; el chart ahora lo normaliza a modo 600 en cada arranque y RabbitMQ volvió a `Ready` sin reinicios.

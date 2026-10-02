# Runbook de recuperación

## Precondiciones

1. Instalar `gcloud`, Terraform 1.13+, `kubectl`, Helm 3 y PowerShell 5.1+.
2. Clonar en directorios hermanos los repositorios de código y GitOps.
3. Ejecutar `gcloud auth login`. Confirmar que la cuenta de créditos existente está abierta; el procedimiento no crea ni activa cuentas de pago.
4. No usar un proyecto cuyo nombre contenga `Bank-usac`; los scripts lo rechazan.

## Reconstrucción desde cero

Desde la raíz del repositorio de código:

```powershell
$start = Get-Date
powershell -ExecutionPolicy Bypass -File P9/scripts/bootstrap.ps1 -AutoApprove
powershell -ExecutionPolicy Bypass -File P9/tests/verify.ps1 -Live
New-TimeSpan -Start $start -End (Get-Date)
```

Resultado esperado: `sa-p9-apps` y sus aplicaciones hijas están `Synced/Healthy`; todos los workloads de `sa-p9-prod` están `Ready`; `BackupStorageLocation/default` está `Available`; los siete `ExternalSecret` están `SecretSynced`.

## Respaldo y verificación de datos

```powershell
powershell -ExecutionPolicy Bypass -File P9/scripts/create-backup.ps1
velero backup get
velero backup describe <BACKUP_NAME> --details
```

Un respaldo válido debe terminar `Completed`, incluir `sa-p9-prod` y mostrar operaciones de volumen completadas.

## Restauración ensayada

La prueba automatizada inserta un dato verificable, respalda, inserta otro dato posterior, simula pérdida y restaura:

```powershell
powershell -ExecutionPolicy Bypass -File P9/scripts/test-data-recovery.ps1
```

Resultado esperado: reaparece `contenido persistente recuperable`; el registro posterior al backup no reaparece. La evidencia contiene `RPO_REAL_SECONDS` y `Resultado: PASS`.

## Pérdida de nodo

```powershell
powershell -ExecutionPolicy Bypass -File P9/scripts/test-node-loss.ps1
```

El script drena un nodo, consulta `/health` mientras está drenado y siempre ejecuta `uncordon`. Verificar `Resultado: PASS` en la evidencia.

## Destrucción y recuperación cronometrada

Crear primero un backup completado. Luego:

```powershell
powershell -ExecutionPolicy Bypass -File P9/scripts/destroy-environment.ps1 -AutoApprove -Confirm:$false
powershell -ExecutionPolicy Bypass -File P9/scripts/bootstrap.ps1 -AutoApprove
```

El primer comando destruye recursos administrados por Terraform, no el proyecto, buckets ni secretos. El segundo produce `evidence/bootstrap-<UTC>.txt`; la línea `RTO medido` es el valor de la prueba.

## Diagnóstico rápido

```powershell
kubectl -n argocd get applications
kubectl -n sa-p9-prod get pods,pvc,pdb
kubectl -n sa-p9-prod get externalsecrets
kubectl get clustersecretstore
kubectl -n velero get backupstoragelocation,schedules,backups
kubectl -n velero logs deploy/velero --tail=100
```

Nunca borrar los buckets o Secret Manager durante un incidente: son el plano de recuperación.

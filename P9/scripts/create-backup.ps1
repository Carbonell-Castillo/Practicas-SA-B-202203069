[CmdletBinding()]
param([string]$Namespace = "sa-p9-prod")

$ErrorActionPreference = "Stop"
$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
$name = "p9-manual-$stamp"
$veleroCommand = Get-Command velero -ErrorAction SilentlyContinue
if ($veleroCommand) { $Velero = $veleroCommand.Source } else { $Velero = Join-Path $env:LOCALAPPDATA "Programs\Velero\velero.exe" }
if (-not (Test-Path $Velero)) { throw "No se encontro el cliente Velero" }

& $Velero backup create $name --include-namespaces $Namespace --default-volumes-to-fs-backup --wait
if ($LASTEXITCODE -ne 0) { throw "El respaldo $name fallo" }
& $Velero backup describe $name --details
Write-Output "BACKUP_NAME=$name"

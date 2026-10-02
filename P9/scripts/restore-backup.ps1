[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$BackupName,
    [string]$Namespace = "sa-p9-prod"
)

$ErrorActionPreference = "Stop"
$restoreName = "restore-$BackupName"
$veleroCommand = Get-Command velero -ErrorAction SilentlyContinue
if ($veleroCommand) { $Velero = $veleroCommand.Source } else { $Velero = Join-Path $env:LOCALAPPDATA "Programs\Velero\velero.exe" }
if (-not (Test-Path $Velero)) { throw "No se encontro el cliente Velero" }

function Set-ApplicationPatch([string]$Name, [string]$Json) {
    $patchPath = [IO.Path]::GetTempFileName()
    try {
        $utf8NoBom = New-Object Text.UTF8Encoding($false)
        [IO.File]::WriteAllText($patchPath, $Json, $utf8NoBom)
        kubectl -n argocd patch application $Name --type=merge "--patch-file=$patchPath"
        if ($LASTEXITCODE -ne 0) { throw "No se pudo modificar Application/$Name" }
    }
    finally {
        Remove-Item -LiteralPath $patchPath -Force -ErrorAction SilentlyContinue
    }
}

# Evita que Argo recree PVC vacios durante la ventana de restauracion.
Set-ApplicationPatch "sa-p9-apps" '{"spec":{"syncPolicy":{"automated":null}}}'
Set-ApplicationPatch "sa-platform-prod" '{"metadata":{"annotations":{"argocd.argoproj.io/skip-reconcile":"true"}},"spec":{"syncPolicy":{"automated":null}}}'
kubectl -n $Namespace scale statefulset postgres rabbitmq --replicas=0
kubectl -n $Namespace delete statefulset postgres rabbitmq --cascade=orphan --ignore-not-found
kubectl -n $Namespace delete pvc data-postgres-0 data-rabbitmq-0 --ignore-not-found --wait=true

& $Velero restore create $restoreName --from-backup $BackupName --include-namespaces $Namespace --wait
if ($LASTEXITCODE -ne 0) { throw "La restauracion $restoreName fallo" }

kubectl -n argocd annotate application sa-platform-prod argocd.argoproj.io/skip-reconcile-
Set-ApplicationPatch "sa-platform-prod" '{"spec":{"syncPolicy":{"automated":{"prune":true,"selfHeal":true}}}}'
Set-ApplicationPatch "sa-p9-apps" '{"spec":{"syncPolicy":{"automated":{"prune":true,"selfHeal":true}}}}'
kubectl -n argocd annotate application sa-platform-prod argocd.argoproj.io/refresh=hard --overwrite
kubectl -n $Namespace wait --for=condition=Ready pod/postgres-0 --timeout=15m
kubectl -n $Namespace wait --for=condition=Ready pod/rabbitmq-0 --timeout=15m
& $Velero restore describe $restoreName --details
Write-Output "RESTORE_NAME=$restoreName"

[CmdletBinding(SupportsShouldProcess, ConfirmImpact = "High")]
param(
    [string]$ProjectId = "sa-p9-202203069",
    [string]$StateBucket = "sa-p9-202203069-tfstate",
    [switch]$AutoApprove
)

$ErrorActionPreference = "Stop"
$P9Root = Split-Path -Parent $PSScriptRoot
$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$evidence = Join-Path $P9Root "evidence/destroy-$stamp.txt"
if ($ProjectId -match '(?i)bank[-_]?usac') {
    throw "Proteccion de alcance: no se permite operar sobre Bank-usac."
}
if (-not $PSCmdlet.ShouldProcess("cluster del proyecto $ProjectId", "destruir con Terraform conservando buckets y secretos")) {
    return
}

"Inicio UTC: $((Get-Date).ToUniversalTime().ToString('o')); proyecto: $ProjectId" | Out-File $evidence -Encoding utf8

$terraformDir = Join-Path (Split-Path -Parent $PSScriptRoot) "terraform"
gcloud config set project $ProjectId | Out-Null
$env:GOOGLE_OAUTH_ACCESS_TOKEN = gcloud auth print-access-token
if ($LASTEXITCODE -ne 0 -or -not $env:GOOGLE_OAUTH_ACCESS_TOKEN) { throw "No se pudo autenticar Terraform" }

# Una restauracion completada puede conservar el finalizador externo de Velero.
# Al destruir todo el cluster, el controlador ya no existe para retirarlo y el
# namespace quedaria Terminating. Se elimina solo en esta ruta destructiva.
$restoreResources = @(kubectl -n velero get restores.velero.io -o name --ignore-not-found 2>$null)
if ($restoreResources) {
    $patchPath = [IO.Path]::GetTempFileName()
    try {
        $utf8NoBom = New-Object Text.UTF8Encoding($false)
        [IO.File]::WriteAllText($patchPath, '{"metadata":{"finalizers":[]}}', $utf8NoBom)
        foreach ($restoreResource in $restoreResources) {
            kubectl -n velero patch $restoreResource --type=merge "--patch-file=$patchPath" | Out-Null
        }
    }
    finally {
        Remove-Item -LiteralPath $patchPath -Force -ErrorAction SilentlyContinue
    }
}

terraform "-chdir=$terraformDir" init -reconfigure -input=false "-backend-config=bucket=$StateBucket"
if ($LASTEXITCODE -ne 0) { throw "terraform init fallo" }

$args = @("-chdir=$terraformDir", "destroy", "-input=false", "-var=project_id=$ProjectId")
if ($AutoApprove) { $args += "-auto-approve" }
terraform @args
if ($LASTEXITCODE -ne 0) { throw "terraform destroy fallo" }

"Fin UTC: $((Get-Date).ToUniversalTime().ToString('o')); Resultado: DESTROY_OK; buckets y secretos conservados" | Add-Content $evidence -Encoding utf8
$evidenceContent = Get-Content -Raw $evidence
$utf8NoBom = New-Object Text.UTF8Encoding($false)
[IO.File]::WriteAllText($evidence, $evidenceContent, $utf8NoBom)
Write-Output "Cluster destruido. Backend, bucket Velero y Secret Manager permanecen fuera del cluster."
Write-Output "Evidencia: $evidence"

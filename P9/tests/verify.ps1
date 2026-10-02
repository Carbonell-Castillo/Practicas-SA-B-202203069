[CmdletBinding()]
param([switch]$Live)

$ErrorActionPreference = "Stop"
$P9Root = Split-Path -Parent $PSScriptRoot
$GitOpsRoot = Resolve-Path (Join-Path $P9Root "..\..\Practicas-SA-B-202203069-gitops")
$TerraformDir = Join-Path $P9Root "terraform"

terraform "-chdir=$TerraformDir" fmt -check -recursive
if ($LASTEXITCODE -ne 0) { throw "terraform fmt fallo" }
terraform "-chdir=$TerraformDir" validate
if ($LASTEXITCODE -ne 0) { throw "terraform validate fallo" }
helm lint (Join-Path $P9Root "bootstrap-chart")
if ($LASTEXITCODE -ne 0) { throw "helm lint del bootstrap fallo" }

Get-ChildItem (Join-Path $GitOpsRoot "charts") -Directory | ForEach-Object {
    helm lint $_.FullName -f (Join-Path $_.FullName "values-prod.yaml")
    if ($LASTEXITCODE -ne 0) { throw "helm lint fallo para $($_.Name)" }
    helm template test $_.FullName -f (Join-Path $_.FullName "values-prod.yaml") | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "helm template fallo para $($_.Name)" }
}

$templates = Get-ChildItem (Join-Path $GitOpsRoot "charts") -Recurse -Filter "application.yaml"
foreach ($template in $templates) {
    $content = Get-Content -Raw $template.FullName
    if ($content -notmatch "kind: PodDisruptionBudget" -or $content -notmatch "podAntiAffinity") {
        throw "Faltan controles de resiliencia en $($template.FullName)"
    }
}

if (rg -n "sa-p8-prod|kind: SealedSecret" $GitOpsRoot --glob "!*.md" --glob "!*.txt" --glob "!*.csv" --glob "!*.sh" --glob "!p8.conf") {
    throw "Quedaron referencias activas a P8 o Sealed Secrets"
}

if ($Live) {
    kubectl -n argocd get application sa-p9-apps
    kubectl -n argocd get applications
    kubectl -n sa-p9-prod wait --for=jsonpath='{.status.readyReplicas}'=2 rollout --all --timeout=10m
    kubectl -n sa-p9-prod wait --for=jsonpath='{.status.readyReplicas}'=1 statefulset --all --timeout=10m
    kubectl -n sa-p9-prod get pdb
    kubectl get clustersecretstore gcp-secret-manager
    kubectl -n sa-p9-prod get externalsecrets
    kubectl -n velero get schedule sa-p9-hourly
    kubectl -n velero get backupstoragelocation default
}

Write-Output "VERIFY_OK"

[CmdletBinding()]
param(
    [string]$ProjectId = "sa-p9-202203069",
    [string]$BillingAccount = "",
    [string]$Region = "us-central1",
    [string]$Zone = "us-central1-a",
    [string]$ClusterName = "sa-p9",
    [string]$StateBucket = "sa-p9-202203069-tfstate",
    [string]$VeleroBucket = "sa-p9-202203069-velero",
    [switch]$AutoApprove
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

if ($ProjectId -match '(?i)bank[-_]?usac') {
    throw "Proteccion de alcance: P9 nunca puede ejecutarse sobre un proyecto Bank-usac."
}

$P9Root = Split-Path -Parent $PSScriptRoot
$TerraformDir = Join-Path $P9Root "terraform"
$EvidenceDir = Join-Path $P9Root "evidence"
New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null
$StartedAt = Get-Date
$RunId = $StartedAt.ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$LogPath = Join-Path $EvidenceDir "bootstrap-$RunId.txt"

function Write-Step([string]$Message) {
    $line = "[$((Get-Date).ToUniversalTime().ToString('o'))] $Message"
    $line | Tee-Object -FilePath $LogPath -Append
}

function Assert-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Falta el comando requerido: $Name"
    }
}

function Invoke-Gcloud([string[]]$Arguments) {
    & gcloud @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "gcloud fallo: gcloud $($Arguments -join ' ')"
    }
}

function Test-Gcloud([string[]]$Arguments) {
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "SilentlyContinue"
        & gcloud @Arguments *> $null
        return $LASTEXITCODE -eq 0
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
}

function Ensure-Bucket([string]$Name, [bool]$EnableVersioning) {
    if (-not (Test-Gcloud @("storage", "buckets", "describe", "gs://$Name", "--project=$ProjectId"))) {
        Write-Step "Creando bucket persistente gs://$Name"
        Invoke-Gcloud @("storage", "buckets", "create", "gs://$Name", "--project=$ProjectId", "--location=$Region", "--uniform-bucket-level-access", "--public-access-prevention")
    }
    if ($EnableVersioning) {
        Invoke-Gcloud @("storage", "buckets", "update", "gs://$Name", "--versioning")
    }
}

function New-HexSecret([int]$Bytes = 32) {
    $buffer = New-Object byte[] $Bytes
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $generator.GetBytes($buffer)
    }
    finally {
        $generator.Dispose()
    }
    return ([BitConverter]::ToString($buffer) -replace '-', '').ToLowerInvariant()
}

function Ensure-JsonSecret([string]$Name, [hashtable]$Value) {
    if (-not (Test-Gcloud @("secrets", "describe", $Name, "--project=$ProjectId"))) {
        Write-Step "Creando contenedor de Secret Manager: $Name"
        Invoke-Gcloud @("secrets", "create", $Name, "--project=$ProjectId", "--replication-policy=automatic")
    }

    $versions = & gcloud secrets versions list $Name --project=$ProjectId --filter="state=ENABLED" --format="value(name)" --limit=1
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudieron consultar las versiones de $Name"
    }
    $mustWrite = -not $versions
    if ($versions) {
        $existingPath = [IO.Path]::GetTempFileName()
        try {
            & gcloud secrets versions access latest --secret=$Name --project=$ProjectId --out-file=$existingPath *> $null
            if ($LASTEXITCODE -ne 0) { throw "No se pudo leer la version activa de $Name" }
            $existingObject = Get-Content -Raw $existingPath | ConvertFrom-Json
            $merged = @{}
            $existingObject.PSObject.Properties | ForEach-Object { $merged[$_.Name] = $_.Value }
            foreach ($key in $Value.Keys) {
                if (-not $merged.ContainsKey($key)) {
                    $merged[$key] = $Value[$key]
                    $mustWrite = $true
                }
            }
            $Value = $merged
        }
        finally {
            Remove-Item -LiteralPath $existingPath -Force -ErrorAction SilentlyContinue
        }
    }
    if ($mustWrite) {
        $tempPath = [IO.Path]::GetTempFileName()
        try {
            $json = $Value | ConvertTo-Json -Compress
            $utf8NoBom = New-Object Text.UTF8Encoding($false)
            [IO.File]::WriteAllText($tempPath, $json, $utf8NoBom)
            Invoke-Gcloud @("secrets", "versions", "add", $Name, "--project=$ProjectId", "--data-file=$tempPath")
        }
        finally {
            Remove-Item -LiteralPath $tempPath -Force -ErrorAction SilentlyContinue
        }
        Write-Step "Version completa creada para $Name (valor no mostrado)"
    }
}

foreach ($command in @("gcloud", "terraform", "kubectl", "helm")) {
    Assert-Command $command
}

$activeAccount = & gcloud auth list --filter="status:ACTIVE" --format="value(account)"
if (-not $activeAccount) {
    throw "No hay una sesion activa de gcloud. Ejecute: gcloud auth login"
}
Write-Step "Inicio de bootstrap; cuenta autenticada: $activeAccount; proyecto aislado: $ProjectId"

if (-not (Test-Gcloud @("projects", "describe", $ProjectId))) {
    Write-Step "Creando proyecto $ProjectId"
    Invoke-Gcloud @("projects", "create", $ProjectId, "--name=SA Practica 9 202203069")
}

Invoke-Gcloud @("config", "set", "project", $ProjectId)
$env:GOOGLE_OAUTH_ACCESS_TOKEN = & gcloud auth print-access-token
if ($LASTEXITCODE -ne 0 -or -not $env:GOOGLE_OAUTH_ACCESS_TOKEN) {
    throw "No se pudo obtener un token temporal para Terraform"
}

$billingEnabled = & gcloud billing projects describe $ProjectId --format="value(billingEnabled)" 2>$null
if ($billingEnabled -ne "True") {
    if (-not $BillingAccount) {
        $accounts = @(& gcloud billing accounts list --filter="open=true" --format="value(name.basename())")
        if ($accounts.Count -ne 1) {
            throw "Indique -BillingAccount. El script no crea ni activa cuentas de pago."
        }
        $BillingAccount = $accounts[0]
    }
    Write-Step "Vinculando la cuenta de creditos ya existente; no se crea ni actualiza una cuenta de pago"
    Invoke-Gcloud @("billing", "projects", "link", $ProjectId, "--billing-account=$BillingAccount")
}

Write-Step "Habilitando APIs requeridas solo en $ProjectId"
Invoke-Gcloud @("services", "enable", "compute.googleapis.com", "container.googleapis.com", "iam.googleapis.com", "iamcredentials.googleapis.com", "secretmanager.googleapis.com", "storage.googleapis.com", "cloudresourcemanager.googleapis.com", "--project=$ProjectId")

Ensure-Bucket $StateBucket $true
Ensure-Bucket $VeleroBucket $false

$postgresPassword = New-HexSecret 24
$rabbitPassword = New-HexSecret 24
$jwtSecret = New-HexSecret 32
$aesBytes = New-Object byte[] 32
$aesGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
try { $aesGenerator.GetBytes($aesBytes) } finally { $aesGenerator.Dispose() }
$aesKey = [Convert]::ToBase64String($aesBytes)
$pgEncoded = [Uri]::EscapeDataString($postgresPassword)
$rabbitEncoded = [Uri]::EscapeDataString($rabbitPassword)

Ensure-JsonSecret "platform-datastores" @{
    POSTGRES_PASSWORD       = $postgresPassword
    RABBITMQ_DEFAULT_PASS   = $rabbitPassword
}
Ensure-JsonSecret "sa-platform-runtime" @{
    RUNTIME_CONFIG_EXTERNAL = "true"
}
Ensure-JsonSecret "auth-runtime" @{
    DATABASE_URL = "postgresql://p8_user:${pgEncoded}@postgres:5432/auth_db?schema=public"
    JWT_SECRET   = $jwtSecret
    AES_KEY      = $aesKey
}
Ensure-JsonSecret "products-runtime" @{
    DATABASE_URL = "postgresql+psycopg2://p8_user:${pgEncoded}@postgres:5432/products_db"
}
Ensure-JsonSecret "orders-runtime" @{
    DATABASE_URL = "postgresql://p8_user:${pgEncoded}@postgres:5432/orders_db?schema=public"
    RABBITMQ_URL = "amqp://p8_user:${rabbitEncoded}@rabbitmq:5672/"
}
Ensure-JsonSecret "notifications-runtime" @{
    DATABASE_URL = "postgresql://p8_user:${pgEncoded}@postgres:5432/notifications_db?schema=public"
    RABBITMQ_URL = "amqp://p8_user:${rabbitEncoded}@rabbitmq:5672/"
}
Ensure-JsonSecret "cron-runtime" @{
    DATABASE_URL = "postgresql://p8_user:${pgEncoded}@postgres:5432/cron_db?schema=public"
    RABBITMQ_URL = "amqp://p8_user:${rabbitEncoded}@rabbitmq:5672/"
}

Write-Step "Inicializando Terraform contra gs://$StateBucket (backend con bloqueo)"
& terraform "-chdir=$TerraformDir" init -reconfigure -input=false "-backend-config=bucket=$StateBucket"
if ($LASTEXITCODE -ne 0) { throw "terraform init fallo" }
& terraform "-chdir=$TerraformDir" validate
if ($LASTEXITCODE -ne 0) { throw "terraform validate fallo" }

$applyArgs = @("-chdir=$TerraformDir", "apply", "-input=false", "-var=project_id=$ProjectId", "-var=region=$Region", "-var=zone=$Zone", "-var=cluster_name=$ClusterName", "-var=velero_bucket=$VeleroBucket")
if ($AutoApprove) { $applyArgs += "-auto-approve" }
Write-Step "Terraform crea GKE, identidades, ArgoCD y la aplicacion raiz"
& terraform @applyArgs
if ($LASTEXITCODE -ne 0) { throw "terraform apply fallo" }

Invoke-Gcloud @("container", "clusters", "get-credentials", $ClusterName, "--zone=$Zone", "--project=$ProjectId")
Write-Step "Esperando reconciliacion completa de sa-p9-apps"
kubectl -n argocd wait application/sa-p9-apps --for=jsonpath='{.status.health.status}'=Healthy --timeout=20m
if ($LASTEXITCODE -ne 0) { throw "La aplicacion raiz no alcanzo Healthy" }
kubectl wait clustersecretstore/gcp-secret-manager --for=condition=Ready --timeout=10m
if ($LASTEXITCODE -ne 0) { throw "Secret Manager no quedo accesible desde External Secrets" }
$syncStamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
kubectl -n sa-p9-prod annotate externalsecret --all "force-sync=$syncStamp" --overwrite
kubectl -n sa-p9-prod wait externalsecret --all --for=condition=Ready --timeout=10m
if ($LASTEXITCODE -ne 0) { throw "No todos los secretos externos se materializaron" }
foreach ($statefulSet in @("postgres", "rabbitmq")) {
    kubectl -n sa-p9-prod rollout status "statefulset/$statefulSet" --timeout=15m
    if ($LASTEXITCODE -ne 0) { throw "$statefulSet no alcanzo Ready" }
}
$rollouts = @(kubectl -n sa-p9-prod get rollouts.argoproj.io -o custom-columns=NAME:.metadata.name --no-headers)
foreach ($rollout in $rollouts) {
    kubectl argo rollouts status $rollout -n sa-p9-prod --timeout=15m
    if ($LASTEXITCODE -ne 0) { throw "$rollout no alcanzo Healthy" }
}
kubectl -n argocd wait application --all --for=jsonpath='{.status.health.status}'=Healthy --timeout=10m
if ($LASTEXITCODE -ne 0) { throw "No todas las aplicaciones ArgoCD alcanzaron Healthy" }

$FinishedAt = Get-Date
$Rto = $FinishedAt - $StartedAt
Write-Step "BOOTSTRAP_OK"
Write-Step "RTO medido: $([math]::Round($Rto.TotalSeconds, 0)) segundos"
Write-Step "Verificacion: kubectl -n argocd get applications; velero backup-location get"
Write-Output "Evidencia: $LogPath"

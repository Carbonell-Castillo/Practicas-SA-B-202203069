[CmdletBinding()]
param([string]$Namespace = "sa-p9-prod")

$ErrorActionPreference = "Stop"
$P9Root = Split-Path -Parent $PSScriptRoot
$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$evidence = Join-Path $P9Root "evidence/data-restore-$stamp.txt"
$beforeId = "before-$stamp"
$afterId = "after-$stamp"

function Invoke-Psql([string]$Sql) {
    kubectl -n $Namespace exec postgres-0 -- psql -U p8_user -d postgres -Atc $Sql
    if ($LASTEXITCODE -ne 0) { throw "psql fallo" }
}

"Inicio UTC: $((Get-Date).ToUniversalTime().ToString('o'))" | Out-File $evidence -Encoding utf8
Invoke-Psql "CREATE TABLE IF NOT EXISTS dr_evidence (id text PRIMARY KEY, created_at timestamptz NOT NULL, payload text NOT NULL);" | Out-Null
$beforeTime = (Get-Date).ToUniversalTime()
Invoke-Psql "INSERT INTO dr_evidence VALUES ('$beforeId', now(), 'contenido persistente recuperable') ON CONFLICT (id) DO UPDATE SET payload=EXCLUDED.payload;" | Out-Null
"Dato previo: $beforeId a $($beforeTime.ToString('o'))" | Add-Content $evidence -Encoding utf8

$backupOutput = & (Join-Path $PSScriptRoot "create-backup.ps1") -Namespace $Namespace
$backupOutput | Out-File $evidence -Append -Encoding utf8
$backupLine = $backupOutput | Where-Object { $_ -like "BACKUP_NAME=*" } | Select-Object -Last 1
if (-not $backupLine) { throw "No se obtuvo el nombre del backup" }
$backupName = $backupLine.Substring("BACKUP_NAME=".Length)
$recoveryPoint = (Get-Date).ToUniversalTime()

Start-Sleep -Seconds 10
$afterTime = (Get-Date).ToUniversalTime()
Invoke-Psql "INSERT INTO dr_evidence VALUES ('$afterId', now(), 'dato posterior al punto de recuperacion') ON CONFLICT (id) DO UPDATE SET payload=EXCLUDED.payload;" | Out-Null
Invoke-Psql "DELETE FROM dr_evidence;" | Out-Null
"Desastre simulado UTC: $($afterTime.ToString('o')); filas despues de borrar: $(Invoke-Psql 'SELECT count(*) FROM dr_evidence;')" | Add-Content $evidence -Encoding utf8

$restoreOutput = & (Join-Path $PSScriptRoot "restore-backup.ps1") -BackupName $backupName -Namespace $Namespace 2>&1
$restoreOutput | Out-File $evidence -Append -Encoding utf8
if ($LASTEXITCODE -ne 0) { throw "La restauracion fallo" }

$beforeRecovered = Invoke-Psql "SELECT payload FROM dr_evidence WHERE id='$beforeId';"
$afterRecovered = Invoke-Psql "SELECT count(*) FROM dr_evidence WHERE id='$afterId';"
$rpoSeconds = [math]::Round(($afterTime - $recoveryPoint).TotalSeconds, 0)
"Dato recuperado: $beforeId = $beforeRecovered" | Add-Content $evidence -Encoding utf8
"Dato posterior no recuperado (esperado): count=$afterRecovered" | Add-Content $evidence -Encoding utf8
"RPO_REAL_SECONDS=$rpoSeconds" | Add-Content $evidence -Encoding utf8
if ($beforeRecovered -ne "contenido persistente recuperable" -or $afterRecovered -ne "0") {
    "Resultado: FAIL" | Add-Content $evidence -Encoding utf8
    throw "La verificacion de contenido restaurado fallo"
}
"Resultado: PASS" | Add-Content $evidence -Encoding utf8
$evidenceContent = Get-Content -Raw $evidence
$utf8NoBom = New-Object Text.UTF8Encoding($false)
[IO.File]::WriteAllText($evidence, $evidenceContent, $utf8NoBom)
Write-Output "Evidencia: $evidence"

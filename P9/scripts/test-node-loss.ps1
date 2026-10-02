[CmdletBinding()]
param([string]$Namespace = "sa-p9-prod")

$ErrorActionPreference = "Stop"
$nodes = @(kubectl get nodes -o custom-columns=NAME:.metadata.name --no-headers) | Where-Object { $_ }
if ($nodes.Count -lt 2) { throw "La prueba requiere al menos dos nodos" }
$target = $nodes[0]
$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$evidence = Join-Path (Split-Path -Parent $PSScriptRoot) "evidence/node-loss-$stamp.txt"

"Inicio UTC: $((Get-Date).ToUniversalTime().ToString('o'))`nNodo: $target" | Out-File $evidence -Encoding utf8
try {
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $drainOutput = kubectl drain $target --ignore-daemonsets --delete-emptydir-data --timeout=15m 2>$null
        $drainExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
    $drainOutput | Out-File $evidence -Append -Encoding utf8
    if ($drainExitCode -ne 0) { throw "El drenaje fallo" }
    kubectl -n $Namespace get rollout,statefulset -o custom-columns=KIND:.kind,NAME:.metadata.name,READY:.status.readyReplicas,AVAILABLE:.status.availableReplicas 2>&1 | Out-File $evidence -Append -Encoding utf8
    $gatewayPod = kubectl -n $Namespace get pod -l app.kubernetes.io/name=gateway -o jsonpath='{.items[0].metadata.name}'
    kubectl -n $Namespace exec $gatewayPod -- node -e "fetch('http://gateway-stable:8080/health').then(r=>{console.log(r.status);process.exit(r.ok?0:1)})" 2>&1 | Out-File $evidence -Append -Encoding utf8
    if ($LASTEXITCODE -ne 0) { throw "El gateway no respondio durante el drenaje" }
    "Resultado: PASS" | Add-Content $evidence -Encoding utf8
}
finally {
    kubectl uncordon $target | Out-Null
    kubectl -n $Namespace wait --for=condition=Ready pod/postgres-0 --timeout=15m | Out-File $evidence -Append -Encoding utf8
    kubectl -n $Namespace wait --for=condition=Ready pod/rabbitmq-0 --timeout=15m | Out-File $evidence -Append -Encoding utf8
    "Fin UTC: $((Get-Date).ToUniversalTime().ToString('o'))" | Add-Content $evidence -Encoding utf8
    $evidenceContent = Get-Content -Raw $evidence
    $utf8NoBom = New-Object Text.UTF8Encoding($false)
    [IO.File]::WriteAllText($evidence, $evidenceContent, $utf8NoBom)
}
Write-Output "Evidencia: $evidence"
exit 0

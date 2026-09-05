#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "$0")/common.sh"
mkdir -p "${P6_DIR}/evidence"
gcloud container clusters get-credentials "${CLUSTER_NAME}" --zone "${ZONE}" --project "${PROJECT_ID}" >/dev/null
kubectl wait --for=condition=Ready pods --all -n "${NAMESPACE}" --timeout=10m
ip=""
for _ in {1..60}; do
  ip="$(kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || true)"
  [[ -n "${ip}" ]] && break
  sleep 5
done
[[ -n "${ip}" ]] || { echo "El LoadBalancer no obtuvo IP en 5 minutos." >&2; exit 1; }
curl --fail --show-error --retry 12 --retry-delay 5 "http://${ip}/health" | tee "${P6_DIR}/evidence/public-health.log"
{
  date -u +'%Y-%m-%dT%H:%M:%SZ'; echo "PUBLIC_IP=${ip}"
  kubectl get nodes -o wide
  kubectl get pods,pvc -n "${NAMESPACE}" -o wide
  kubectl get ingress -n "${NAMESPACE}" -o wide
  kubectl get svc ingress-nginx-controller -n ingress-nginx
  helm list -n "${NAMESPACE}"
} | tee "${P6_DIR}/evidence/deployment.log"
echo "Verificacion exitosa desde el cliente: http://${ip}/health"


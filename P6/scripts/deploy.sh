#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "$0")/common.sh"
secrets="${P6_DIR}/charts/sa-platform/values-secrets.yaml"
[[ -f "${secrets}" ]] || { echo "Ejecuta scripts/generate-secrets.sh primero." >&2; exit 1; }
gcloud container clusters get-credentials "${CLUSTER_NAME}" --zone "${ZONE}" --project "${PROJECT_ID}"
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx --force-update
helm repo update
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx --namespace ingress-nginx --create-namespace --wait --timeout 10m
chart="${P6_DIR}/charts/sa-platform"
helm dependency update "${chart}"
args=()
for service in "${SERVICES[@]}"; do
  case "${service}" in
    auth-service) key=authService;; authorization-service) key=authorizationService;;
    products-service) key=productsService;; orders-service) key=ordersService;;
    notifications-service) key=notificationsService;; cron-jobs) key=cronJobs;; *) key="${service}";;
  esac
  args+=(--set-string "${key}.image.repository=${REGISTRY}/${service}" --set-string "${key}.image.tag=${IMAGE_TAG}")
done
helm lint "${chart}" -f "${chart}/values-gke.yaml" -f "${secrets}" "${args[@]}"
helm upgrade --install "${RELEASE}" "${chart}" --namespace "${NAMESPACE}" --create-namespace \
  -f "${chart}/values-gke.yaml" -f "${secrets}" "${args[@]}" --wait --timeout 15m --atomic
kubectl get pods,pvc -n "${NAMESPACE}"
kubectl get service ingress-nginx-controller -n ingress-nginx

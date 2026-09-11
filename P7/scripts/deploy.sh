#!/usr/bin/env bash
set -Eeuo pipefail

: "${REGISTRY:=sa-p7}"
: "${IMAGE_TAG:?IMAGE_TAG es obligatorio}"
: "${HELM_SECRETS_FILE:?HELM_SECRETS_FILE es obligatorio}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHART="${ROOT}/charts/sa-platform"
NAMESPACE="${NAMESPACE:-sa-p7}"
RELEASE="${RELEASE:-sa-platform}"
HELM_VALUES_FILE="${HELM_VALUES_FILE:-${CHART}/values-kind.yaml}"
HELM_TIMEOUT="${HELM_TIMEOUT:-15m}"
HELM_ATOMIC="${HELM_ATOMIC:-true}"
PHASED_DEPLOY="${PHASED_DEPLOY:-false}"
SERVICES=(auth-service authorization-service products-service orders-service notifications-service gateway frontend cron-jobs)
HELM_BIN="$(command -v helm || command -v helm.exe)"
KUBECTL_BIN="$(command -v kubectl || command -v kubectl.exe)"

helm_path() {
  local path="$1"
  if [[ "${HELM_BIN}" == *.exe ]]; then
    wslpath -w "$(realpath "${path}")"
  else
    realpath "${path}"
  fi
}
CHART_HELM="$(helm_path "${CHART}")"
VALUES_HELM="$(helm_path "${HELM_VALUES_FILE}")"
SECRETS_HELM="$(helm_path "${HELM_SECRETS_FILE}")"
INFRA_HELM="$(helm_path "${CHART}/values-kind-infra.yaml")"

[[ -s "${HELM_SECRETS_FILE}" ]] || { echo "Archivo de secretos vacío o inexistente." >&2; exit 1; }

for subchart in "${CHART}"/charts/*; do
  [[ -f "${subchart}/Chart.yaml" ]] || continue
  "${HELM_BIN}" dependency build "$(helm_path "${subchart}")"
done
"${HELM_BIN}" dependency build "${CHART_HELM}"

image_args=()
for service in "${SERVICES[@]}"; do
  case "${service}" in
    auth-service) key=authService ;;
    authorization-service) key=authorizationService ;;
    products-service) key=productsService ;;
    orders-service) key=ordersService ;;
    notifications-service) key=notificationsService ;;
    cron-jobs) key=cronJobs ;;
    *) key="${service}" ;;
  esac
  image_args+=(--set-string "${key}.image.repository=${REGISTRY}/${service}")
  image_args+=(--set-string "${key}.image.tag=${IMAGE_TAG}")
done

if [[ "${PHASED_DEPLOY}" == "true" ]]; then
  echo "Fase 1/2: iniciando Postgres y RabbitMQ."
  "${HELM_BIN}" upgrade --install "${RELEASE}" "${CHART_HELM}" \
    --namespace "${NAMESPACE}" --create-namespace \
    -f "${VALUES_HELM}" -f "${INFRA_HELM}" -f "${SECRETS_HELM}" \
    --wait --timeout "${HELM_TIMEOUT}"
fi

helm_flags=(--wait --timeout "${HELM_TIMEOUT}")
if [[ "${HELM_ATOMIC}" == "true" ]]; then
  helm_flags+=(--atomic)
fi
echo "Fase 2/2: desplegando aplicaciones."
"${HELM_BIN}" upgrade --install "${RELEASE}" "${CHART_HELM}" \
  --namespace "${NAMESPACE}" --create-namespace \
  -f "${VALUES_HELM}" -f "${SECRETS_HELM}" \
  "${image_args[@]}" "${helm_flags[@]}"

"${KUBECTL_BIN}" wait --for=condition=Available deployment --all \
  -n "${NAMESPACE}" --timeout=5m
"${KUBECTL_BIN}" rollout status statefulset/postgres -n "${NAMESPACE}" --timeout=5m
"${KUBECTL_BIN}" rollout status statefulset/rabbitmq -n "${NAMESPACE}" --timeout=5m
"${KUBECTL_BIN}" get pods,svc,ingress -n "${NAMESPACE}"

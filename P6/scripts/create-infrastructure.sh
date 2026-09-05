#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "$0")/common.sh"
gcloud config set project "${PROJECT_ID}"
gcloud services enable container.googleapis.com artifactregistry.googleapis.com compute.googleapis.com
if ! gcloud artifacts repositories describe "${REPOSITORY}" --location "${REGION}" >/dev/null 2>&1; then
  gcloud artifacts repositories create "${REPOSITORY}" --repository-format=docker --location="${REGION}" --description="Imagenes de Practica 6"
fi
if ! gcloud container clusters describe "${CLUSTER_NAME}" --zone "${ZONE}" >/dev/null 2>&1; then
  gcloud container clusters create "${CLUSTER_NAME}" --zone "${ZONE}" --num-nodes "${NUM_NODES}" \
    --machine-type "${MACHINE_TYPE}" --disk-type pd-balanced --disk-size 30 --release-channel regular \
    --enable-ip-alias --enable-network-policy
fi
gcloud container clusters get-credentials "${CLUSTER_NAME}" --zone "${ZONE}" --project "${PROJECT_ID}"
node_count="$(kubectl get nodes --no-headers | wc -l | tr -d ' ')"
[[ "${node_count}" -ge 2 ]] || { echo "El cluster debe tener al menos 2 nodos" >&2; exit 1; }
kubectl wait --for=condition=Ready nodes --all --timeout=10m
echo "Infraestructura lista: ${node_count} nodos."

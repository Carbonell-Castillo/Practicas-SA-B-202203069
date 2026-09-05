#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "$0")/common.sh"
echo "Se eliminara el cluster ${CLUSTER_NAME} (${ZONE}). Artifact Registry se conserva para la entrega."
read -r -p "Escribe ELIMINAR para continuar: " answer
[[ "${answer}" == ELIMINAR ]] || { echo "Cancelado."; exit 0; }
gcloud container clusters delete "${CLUSTER_NAME}" --zone "${ZONE}" --project "${PROJECT_ID}" --quiet
echo "Cluster eliminado. Para borrar tambien el registro ejecuta:"
echo "gcloud artifacts repositories delete ${REPOSITORY} --location ${REGION} --project ${PROJECT_ID}"


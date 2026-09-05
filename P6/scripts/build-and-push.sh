#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "$0")/common.sh"
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
for service in "${SERVICES[@]}"; do
  context="${P5_ABS}/apps/${service}"
  [[ -f "${context}/Dockerfile" ]] || { echo "No existe ${context}/Dockerfile" >&2; exit 1; }
  image="${REGISTRY}/${service}:${IMAGE_TAG}"
  if [[ "${service}" == frontend ]]; then
    docker build --build-arg NEXT_PUBLIC_API_URL=/api --build-arg NEXT_PUBLIC_GATEWAY_URL=/ -t "${image}" "${context}"
  else
    docker build -t "${image}" "${context}"
  fi
  docker push "${image}"
done
echo "Ocho imagenes publicadas en ${REGISTRY} con tag ${IMAGE_TAG}."

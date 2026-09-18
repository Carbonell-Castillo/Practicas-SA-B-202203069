# Políticas Kyverno

Las cuatro políticas operan en modo `Enforce`: etiqueta semántica obligatoria, recursos obligatorios, ejecución no-root y verificación keyless de Cosign para GHCR. Se instalan una sola vez desde este directorio y ArgoCD mantiene su estado.

Para capturar la evidencia de rechazo, intente crear mediante un PR una carga con una imagen terminada en `:latest`; ArgoCD mostrará el recurso degradado y el evento de Kyverno identificará `disallow-latest-tag`. No se debe saltar la política en el clúster.

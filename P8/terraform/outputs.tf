output "namespace" {
  value       = kubernetes_namespace_v1.platform.metadata[0].name
  description = "Namespace administrado por Terraform."
}

output "argocd_service_account" {
  value       = kubernetes_service_account_v1.argocd_deployer.metadata[0].name
  description = "Cuenta RBAC creada para reconciliación."
}

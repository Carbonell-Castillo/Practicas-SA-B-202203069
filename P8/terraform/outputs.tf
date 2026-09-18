output "namespace" {
  value       = kubernetes_namespace_v1.platform.metadata[0].name
  description = "Namespace administrado por Terraform."
}

output "argocd_service_account" {
  value       = kubernetes_service_account_v1.argocd_deployer.metadata[0].name
  description = "Cuenta RBAC creada para reconciliación."
}

output "cluster_name" {
  value       = google_container_cluster.primary.name
  description = "Clúster GKE creado para la Práctica 8."
}

output "cluster_location" {
  value       = google_container_cluster.primary.location
  description = "Zona del clúster GKE."
}

output "kubectl_credentials_command" {
  value       = "gcloud container clusters get-credentials ${google_container_cluster.primary.name} --zone ${google_container_cluster.primary.location} --project ${var.project_id}"
  description = "Comando para crear el contexto kubectl de GKE."
}

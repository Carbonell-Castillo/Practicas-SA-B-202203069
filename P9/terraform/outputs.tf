output "project_id" {
  value = var.project_id
}

output "cluster_name" {
  value = google_container_cluster.primary.name
}

output "cluster_location" {
  value = google_container_cluster.primary.location
}

output "namespace" {
  value = var.namespace
}

output "velero_bucket" {
  value = var.velero_bucket
}

output "kubectl_credentials_command" {
  value = "gcloud container clusters get-credentials ${google_container_cluster.primary.name} --zone ${google_container_cluster.primary.location} --project ${var.project_id}"
}

resource "google_service_account" "external_secrets" {
  project      = var.project_id
  account_id   = "p9-external-secrets"
  display_name = "P9 External Secrets Operator"
  depends_on   = [google_project_service.required]
}

resource "google_project_iam_member" "external_secrets_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.external_secrets.email}"
}

resource "google_service_account_iam_member" "external_secrets_workload_identity" {
  service_account_id = google_service_account.external_secrets.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[external-secrets/external-secrets]"
}

resource "google_service_account" "velero" {
  project      = var.project_id
  account_id   = "p9-velero"
  display_name = "P9 Velero"
  depends_on   = [google_project_service.required]
}

resource "google_service_account_iam_member" "velero_workload_identity" {
  service_account_id = google_service_account.velero.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[velero/velero]"
}

resource "google_storage_bucket_iam_member" "velero_objects" {
  bucket = var.velero_bucket
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.velero.email}"
}

resource "google_project_iam_member" "velero_snapshots" {
  project = var.project_id
  role    = "roles/compute.storageAdmin"
  member  = "serviceAccount:${google_service_account.velero.email}"
}

locals {
  addon_namespaces = toset([
    "argocd",
    "argo-rollouts",
    "ingress-nginx",
    "kyverno",
    "sealed-secrets",
  ])

  labels = {
    "app.kubernetes.io/part-of"    = "sa-platform"
    "app.kubernetes.io/managed-by" = "terraform"
    environment                    = var.environment
  }
}

resource "google_project_service" "required" {
  for_each = toset([
    "compute.googleapis.com",
    "container.googleapis.com",
  ])

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_compute_network" "gke" {
  name                    = "${var.cluster_name}-vpc"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
}

resource "google_compute_subnetwork" "gke" {
  name          = "${var.cluster_name}-subnet"
  region        = var.region
  network       = google_compute_network.gke.id
  ip_cidr_range = "10.80.0.0/20"

  secondary_ip_range {
    range_name    = "${var.cluster_name}-pods"
    ip_cidr_range = "10.84.0.0/14"
  }

  secondary_ip_range {
    range_name    = "${var.cluster_name}-services"
    ip_cidr_range = "10.88.0.0/20"
  }
}

resource "google_container_cluster" "primary" {
  name     = var.cluster_name
  location = var.zone

  network    = google_compute_network.gke.id
  subnetwork = google_compute_subnetwork.gke.id

  deletion_protection      = false
  remove_default_node_pool = true
  initial_node_count       = 1
  networking_mode          = "VPC_NATIVE"

  ip_allocation_policy {
    cluster_secondary_range_name  = "${var.cluster_name}-pods"
    services_secondary_range_name = "${var.cluster_name}-services"
  }

  release_channel {
    channel = "REGULAR"
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  addons_config {
    horizontal_pod_autoscaling {
      disabled = false
    }
    http_load_balancing {
      disabled = true
    }
  }

  master_auth {
    client_certificate_config {
      issue_client_certificate = false
    }
  }

  depends_on = [google_project_service.required]
}

resource "google_container_node_pool" "primary" {
  name       = "${var.cluster_name}-pool"
  location   = var.zone
  cluster    = google_container_cluster.primary.name
  node_count = var.node_count

  node_config {
    machine_type = var.machine_type
    disk_type    = "pd-balanced"
    disk_size_gb = 50
    image_type   = "COS_CONTAINERD"

    oauth_scopes = ["https://www.googleapis.com/auth/cloud-platform"]

    labels = {
      environment = var.environment
      workload    = "sa-platform"
    }

    metadata = {
      disable-legacy-endpoints = "true"
    }

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }
}

resource "kubernetes_namespace_v1" "platform" {
  metadata {
    name   = var.namespace
    labels = local.labels
  }

  depends_on = [google_container_node_pool.primary]
}

resource "kubernetes_namespace_v1" "addons" {
  for_each = local.addon_namespaces

  metadata {
    name = each.value
    labels = {
      "app.kubernetes.io/managed-by" = "terraform"
      environment                    = var.environment
    }
  }

  depends_on = [google_container_node_pool.primary]
}

resource "kubernetes_resource_quota_v1" "platform" {
  metadata {
    name      = "sa-platform-quota"
    namespace = kubernetes_namespace_v1.platform.metadata[0].name
  }
  spec {
    hard = {
      "requests.cpu"    = "8"
      "requests.memory" = "12Gi"
      "limits.cpu"      = "20"
      "limits.memory"   = "24Gi"
      pods              = "80"
    }
  }
}

resource "kubernetes_limit_range_v1" "platform" {
  metadata {
    name      = "sa-platform-defaults"
    namespace = kubernetes_namespace_v1.platform.metadata[0].name
  }
  spec {
    limit {
      type = "Container"
      default = {
        cpu    = "500m"
        memory = "512Mi"
      }
      default_request = {
        cpu    = "100m"
        memory = "128Mi"
      }
    }
  }
}

resource "kubernetes_service_account_v1" "argocd_deployer" {
  metadata {
    name      = "argocd-deployer"
    namespace = kubernetes_namespace_v1.platform.metadata[0].name
    labels    = local.labels
  }
  automount_service_account_token = false
}

resource "kubernetes_role_v1" "argocd_deployer" {
  metadata {
    name      = "argocd-deployer"
    namespace = kubernetes_namespace_v1.platform.metadata[0].name
  }

  rule {
    api_groups = [""]
    resources  = ["configmaps", "services", "serviceaccounts", "secrets"]
    verbs      = ["get", "list", "watch", "create", "update", "patch", "delete"]
  }

  rule {
    api_groups = ["apps"]
    resources  = ["deployments", "statefulsets"]
    verbs      = ["get", "list", "watch", "create", "update", "patch", "delete"]
  }

  rule {
    api_groups = ["argoproj.io"]
    resources  = ["rollouts", "analysistemplates", "analysisruns"]
    verbs      = ["get", "list", "watch", "create", "update", "patch", "delete"]
  }

  rule {
    api_groups = ["bitnami.com"]
    resources  = ["sealedsecrets"]
    verbs      = ["get", "list", "watch", "create", "update", "patch", "delete"]
  }
}

resource "kubernetes_role_binding_v1" "argocd_deployer" {
  metadata {
    name      = "argocd-deployer"
    namespace = kubernetes_namespace_v1.platform.metadata[0].name
  }
  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role_v1.argocd_deployer.metadata[0].name
  }
  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account_v1.argocd_deployer.metadata[0].name
    namespace = kubernetes_namespace_v1.platform.metadata[0].name
  }
}

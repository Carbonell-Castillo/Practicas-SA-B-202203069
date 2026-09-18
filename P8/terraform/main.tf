locals {
  labels = {
    "app.kubernetes.io/part-of"    = "sa-platform"
    "app.kubernetes.io/managed-by" = "terraform"
    environment                    = var.environment
  }
}

resource "kubernetes_namespace_v1" "platform" {
  metadata {
    name   = var.namespace
    labels = local.labels
  }
}

resource "kubernetes_resource_quota_v1" "platform" {
  metadata {
    name      = "sa-platform-quota"
    namespace = kubernetes_namespace_v1.platform.metadata[0].name
  }
  spec {
    hard = {
      "requests.cpu"    = "4"
      "requests.memory" = "6Gi"
      "limits.cpu"      = "8"
      "limits.memory"   = "12Gi"
      pods              = "40"
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
    api_groups = ["", "apps", "argoproj.io", "external-secrets.io"]
    resources  = ["configmaps", "services", "serviceaccounts", "deployments", "rollouts", "analysistemplates", "externalsecrets"]
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

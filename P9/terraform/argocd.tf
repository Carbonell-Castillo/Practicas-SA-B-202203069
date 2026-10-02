resource "helm_release" "argocd" {
  name       = "argocd"
  namespace  = "argocd"
  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argo-cd"
  version    = "10.9.6"

  wait    = true
  timeout = 900

  values = [yamlencode({
    configs = {
      params = {
        "server.insecure" = true
      }
    }
    server = {
      service = {
        type = "ClusterIP"
      }
    }
  })]

  depends_on = [kubernetes_namespace_v1.managed]
}

resource "helm_release" "gitops_root" {
  name      = "sa-p9-root"
  namespace = "argocd"
  chart     = "${path.module}/../bootstrap-chart"

  wait    = true
  timeout = 300

  values = [yamlencode({
    repoURL        = var.gitops_repo_url
    targetRevision = "main"
    path           = "argocd/apps"
  })]

  depends_on = [helm_release.argocd]
}

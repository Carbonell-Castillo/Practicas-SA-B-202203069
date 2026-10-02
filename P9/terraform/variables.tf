variable "project_id" {
  description = "ID del proyecto GCP exclusivo de la Practica 9."
  type        = string
  default     = "sa-p9-202203069"
}

variable "region" {
  description = "Region para recursos regionales."
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "Zona del cluster GKE."
  type        = string
  default     = "us-central1-a"
}

variable "cluster_name" {
  description = "Nombre del cluster recuperable."
  type        = string
  default     = "sa-p9"
}

variable "namespace" {
  description = "Namespace de la plataforma."
  type        = string
  default     = "sa-p9-prod"
}

variable "node_count" {
  description = "Dos nodos permiten demostrar el drenaje manteniendo servicio."
  type        = number
  default     = 2
}

variable "machine_type" {
  description = "Tipo de maquina equilibrado para el laboratorio."
  type        = string
  default     = "e2-standard-4"
}

variable "velero_bucket" {
  description = "Bucket externo al cluster; se crea en el bootstrap y no se destruye con Terraform."
  type        = string
  default     = "sa-p9-202203069-velero"
}

variable "gitops_repo_url" {
  description = "Repositorio publico que ArgoCD reconcilia."
  type        = string
  default     = "https://github.com/Carbonell-Castillo/Practicas-SA-B-202203069-gitops.git"
}

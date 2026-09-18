variable "project_id" {
  description = "Proyecto GCP donde se crea el clúster."
  type        = string
  default     = "softwareavanzado-507703"
}

variable "region" {
  description = "Región de GCP."
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "Zona del clúster GKE Standard."
  type        = string
  default     = "us-central1-a"
}

variable "cluster_name" {
  description = "Nombre exclusivo del clúster para la Práctica 8."
  type        = string
  default     = "sa-p8"
}

variable "node_count" {
  description = "Cantidad de nodos del pool principal."
  type        = number
  default     = 2
}

variable "machine_type" {
  description = "Tipo de máquina de los nodos."
  type        = string
  default     = "e2-standard-4"
}

variable "environment" {
  description = "Ambiente que se aprovisionará."
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment debe ser dev, staging o prod."
  }
}

variable "namespace" {
  description = "Namespace de la plataforma."
  type        = string
  default     = "sa-p8-prod"
}

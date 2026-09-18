variable "kubeconfig_path" {
  description = "Ruta del kubeconfig utilizado solamente al ejecutar Terraform desde una estación administrativa."
  type        = string
  default     = null
  nullable    = true
}

variable "kubeconfig_context" {
  description = "Contexto Kubernetes de destino."
  type        = string
  default     = null
  nullable    = true
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

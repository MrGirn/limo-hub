variable "gcp_project_id" {
  type        = string
  default     = "limo-autonomous-global"
  description = "GCP Project ID"
}

variable "gcp_region" {
  type        = string
  default     = "us-central1"
  description = "GCP Region for Cloud Run and Cloud SQL"
}

variable "environment" {
  type        = string
  default     = "production"
  description = "Deployment environment name"
}

variable "container_image" {
  type        = string
  default     = "gcr.io/limo-autonomous-global/limo-platform:v2.5"
  description = "GCR container image URI"
}

variable "db_tier" {
  type        = string
  default     = "db-custom-4-16384"
  description = "Cloud SQL machine tier"
}

variable "vpc_network_id" {
  type        = string
  default     = "projects/limo-autonomous-global/global/networks/default"
  description = "VPC Network ID for private Cloud SQL access"
}

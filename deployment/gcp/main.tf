# Terraform Google Cloud Platform (GCP) Deployment Profile for Limo Autonomous Platform
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

# 1. Cloud SQL for PostgreSQL with PostGIS
resource "google_sql_database_instance" "limo_db_instance" {
  name             = "limo-db-${var.environment}"
  database_version = "POSTGRES_15"
  region           = var.gcp_region

  settings {
    tier = var.db_tier

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.vpc_network_id
    }

    database_flags {
      name  = "cloudsql.enable_pgvector"
      value = "on"
    }
  }
}

resource "google_sql_database" "limo_db" {
  name     = "limo_db"
  instance = google_sql_database_instance.limo_db_instance.name
}

# 2. Google Cloud Storage (GCS) for Compliance Dossiers
resource "google_storage_bucket" "compliance_bucket" {
  name          = "limo-compliance-dossiers-${var.gcp_project_id}"
  location      = var.gcp_region
  force_destroy = false

  uniform_bucket_level_access = true
}

# 3. Secret Manager for API Keys
resource "google_secret_manager_secret" "app_secrets" {
  secret_id = "limo-production-secrets"

  replication {
    auto {}
  }
}

# 4. Cloud Run Service for Limo Autonomous Core
resource "google_cloud_run_v2_service" "limo_service" {
  name     = "limo-autonomous-app"
  location = var.gcp_region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = var.container_image

      resources {
        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
      }

      ports {
        container_port = 8000
      }

      env {
        name  = "APP_MODE"
        value = "production"
      }
      env {
        name  = "GCS_BUCKET_NAME"
        value = google_storage_bucket.compliance_bucket.name
      }
    }
  }
}

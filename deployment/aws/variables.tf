variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS region for deployment"
}

variable "environment" {
  type        = string
  default     = "production"
  description = "Deployment environment name"
}

variable "container_image" {
  type        = string
  default     = "123456789012.dkr.ecr.us-east-1.amazonaws.com/limo-platform:v2.5"
  description = "ECR Docker image URI"
}

variable "db_instance_class" {
  type        = string
  default     = "db.r6g.large"
  description = "RDS Postgres Instance Class"
}

variable "db_username" {
  type        = string
  default     = "limo_master"
  description = "Database master username"
}

variable "db_password" {
  type        = string
  sensitive   = true
  description = "Database master password"
}

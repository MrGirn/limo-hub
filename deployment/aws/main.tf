# Terraform AWS Production Deployment Profile for Limo Autonomous Platform
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# 1. VPC & Networking
resource "aws_vpc" "limo_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "limo-production-vpc"
    Environment = var.environment
  }
}

resource "aws_subnet" "public_1" {
  vpc_id                  = aws_vpc.limo_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true
}

resource "aws_subnet" "public_2" {
  vpc_id                  = aws_vpc.limo_vpc.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = true
}

# 2. RDS PostgreSQL with PostGIS for Geospatial Radius Queries
resource "aws_db_subnet_group" "limo_db_subnets" {
  name       = "limo-db-subnets"
  subnet_ids = [aws_subnet.public_1.id, aws_subnet.public_2.id]
}

resource "aws_db_instance" "limo_postgres" {
  identifier             = "limo-db-production"
  engine                 = "postgres"
  engine_version         = "15.4"
  instance_class         = var.db_instance_class
  allocated_storage      = 50
  max_allocated_storage  = 500
  db_name                = "limo_db"
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.limo_db_subnets.name
  skip_final_snapshot    = true
  publicly_accessible    = false

  tags = {
    Name = "limo-postgresql-production"
  }
}

# 3. S3 Bucket for Compliance Dossiers & Driver Documents
resource "aws_s3_bucket" "limo_dossier_storage" {
  bucket        = "limo-autonomous-compliance-${var.environment}"
  force_destroy = false

  tags = {
    Name = "Limo Compliance Storage"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "s3_encryption" {
  bucket = aws_s3_bucket.limo_dossier_storage.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# 4. AWS Secrets Manager for Production Keys
resource "aws_secretsmanager_secret" "limo_secrets" {
  name = "limo/production/application-secrets"
}

# 5. ECS Cluster & Fargate Service for Limo Core Application
resource "aws_ecs_cluster" "limo_cluster" {
  name = "limo-autonomous-cluster"
}

resource "aws_ecs_task_definition" "limo_task" {
  family                   = "limo-platform-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"
  memory                   = "2048"

  container_definitions = jsonencode([
    {
      name      = "limo-app"
      image     = var.container_image
      essential = true
      portMappings = [
        {
          containerPort = 8000
          hostPort      = 8000
        }
      ]
      environment = [
        { name = "APP_MODE", value = "production" },
        { name = "AWS_REGION", value = var.aws_region },
        { name = "S3_BUCKET_NAME", value = aws_s3_bucket.limo_dossier_storage.bucket }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/limo-platform"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}

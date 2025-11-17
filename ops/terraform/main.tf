# ParkShare Infrastructure - Main Configuration
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }

  backend "s3" {
    bucket         = "parkshare-terraform-state"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "parkshare-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "parkshare"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  name_prefix         = local.name_prefix
  vpc_cidr            = var.vpc_cidr
  availability_zones  = var.availability_zones
  public_subnets      = var.public_subnets
  private_subnets     = var.private_subnets
  enable_nat_gateway  = true
  single_nat_gateway  = var.environment != "production"

  tags = local.common_tags
}

# EKS Cluster Module
module "eks" {
  source = "./modules/eks"

  cluster_name    = "${local.name_prefix}-cluster"
  cluster_version = var.eks_cluster_version
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets

  node_groups = var.eks_node_groups

  tags = local.common_tags
}

# RDS PostgreSQL Module
module "rds" {
  source = "./modules/rds"

  identifier           = "${local.name_prefix}-db"
  engine_version       = "16.1"
  instance_class       = var.rds_instance_class
  allocated_storage    = var.rds_allocated_storage
  database_name        = var.database_name
  master_username      = var.database_username
  vpc_id               = module.vpc.vpc_id
  subnet_ids           = module.vpc.private_subnets
  allowed_cidr_blocks  = module.vpc.private_subnet_cidrs

  backup_retention_period = var.environment == "production" ? 30 : 7
  multi_az                = var.environment == "production"

  tags = local.common_tags
}

# ElastiCache Redis Module
module "elasticache" {
  source = "./modules/elasticache"

  cluster_id          = "${local.name_prefix}-redis"
  node_type           = var.redis_node_type
  num_cache_nodes     = var.redis_num_nodes
  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.private_subnets
  allowed_cidr_blocks = module.vpc.private_subnet_cidrs

  tags = local.common_tags
}

# S3 Bucket for uploads
module "s3" {
  source = "./modules/s3"

  bucket_name = "${local.name_prefix}-uploads"
  environment = var.environment

  tags = local.common_tags
}

# Production Environment Configuration
environment = "production"
aws_region  = "us-east-1"

# VPC Configuration
vpc_cidr           = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]
public_subnets     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
private_subnets    = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]

# EKS Configuration
eks_cluster_version = "1.28"
eks_node_groups = {
  general = {
    desired_size   = 5
    min_size       = 3
    max_size       = 20
    instance_types = ["t3.large"]
  }
}

# RDS Configuration
rds_instance_class    = "db.r6g.xlarge"
rds_allocated_storage = 500
database_name         = "parkshare"
database_username     = "parkshare_admin"

# Redis Configuration
redis_node_type  = "cache.r6g.large"
redis_num_nodes  = 3

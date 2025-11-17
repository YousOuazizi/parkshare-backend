# ParkShare Infrastructure with Terraform

This directory contains Terraform configurations for provisioning ParkShare infrastructure on AWS.

## Prerequisites

- Terraform >= 1.6.0
- AWS CLI configured with appropriate credentials
- kubectl for Kubernetes management
- helm for Helm chart deployment

## Directory Structure

```
terraform/
├── main.tf              # Main configuration
├── variables.tf         # Input variables
├── outputs.tf           # Output values
├── modules/             # Reusable modules
│   ├── vpc/            # VPC networking
│   ├── eks/            # EKS cluster
│   ├── rds/            # RDS PostgreSQL
│   ├── elasticache/    # Redis
│   └── s3/             # S3 buckets
└── environments/        # Environment-specific configs
    ├── dev/
    ├── staging/
    └── prod/
```

## Usage

### Initialize Terraform

```bash
cd ops/terraform
terraform init
```

### Plan Infrastructure Changes

```bash
# For production
terraform plan -var-file=environments/prod/terraform.tfvars

# For staging
terraform plan -var-file=environments/staging/terraform.tfvars

# For development
terraform plan -var-file=environments/dev/terraform.tfvars
```

### Apply Infrastructure Changes

```bash
terraform apply -var-file=environments/prod/terraform.tfvars
```

### Destroy Infrastructure

```bash
terraform destroy -var-file=environments/prod/terraform.tfvars
```

## Modules

### VPC Module
Creates a VPC with public and private subnets across multiple availability zones.

### EKS Module
Provisions an EKS cluster with managed node groups.

### RDS Module
Creates a PostgreSQL RDS instance with PostGIS extension support.

### ElastiCache Module
Sets up a Redis cluster for caching and session management.

### S3 Module
Creates S3 buckets for file uploads with proper security settings.

## Configuration

### Backend Configuration

The state is stored in an S3 bucket with DynamoDB for state locking:

```hcl
backend "s3" {
  bucket         = "parkshare-terraform-state"
  key            = "terraform.tfstate"
  region         = "us-east-1"
  encrypt        = true
  dynamodb_table = "parkshare-terraform-locks"
}
```

### Creating the Backend Resources

Before running Terraform, create the S3 bucket and DynamoDB table:

```bash
# Create S3 bucket
aws s3api create-bucket \
  --bucket parkshare-terraform-state \
  --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket parkshare-terraform-state \
  --versioning-configuration Status=Enabled

# Create DynamoDB table
aws dynamodb create-table \
  --table-name parkshare-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```

## Security Considerations

1. **Secrets Management**: Never commit sensitive values. Use AWS Secrets Manager or Parameter Store.
2. **State File**: The state file contains sensitive data. Keep it encrypted and access-controlled.
3. **IAM Roles**: Use least-privilege IAM roles for all resources.
4. **Network Security**: Resources are deployed in private subnets with security groups.

## Cost Optimization

- Use spot instances for non-production workloads
- Enable auto-scaling for EKS node groups
- Use appropriate instance sizes based on environment
- Enable RDS automated backups with appropriate retention
- Use S3 lifecycle policies for old uploads

## Maintenance

### Updating Kubernetes Version

```bash
# Update in variables.tf
eks_cluster_version = "1.29"

# Apply changes
terraform apply
```

### Scaling Node Groups

```bash
# Update in tfvars
eks_node_groups = {
  general = {
    desired_size = 10
    ...
  }
}
```

## Troubleshooting

### State Lock Issues

```bash
# Force unlock (use with caution)
terraform force-unlock LOCK_ID
```

### Access Denied Errors

Ensure your AWS credentials have the necessary permissions.

## Support

For issues or questions, contact the DevOps team or create an issue in the repository.

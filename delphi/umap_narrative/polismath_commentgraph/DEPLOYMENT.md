# Deployment Guide for Polis Comment Graph Lambda Service

This document provides detailed instructions for deploying the Polis Comment Graph Lambda service to AWS.

## Prerequisites

- AWS account with appropriate permissions
- AWS CLI configured with credentials
- Docker installed locally
- Python 3.10+ installed locally

## Preparing the AWS Environment

1. Create an IAM Role for Lambda execution with the following permissions:
   - AWSLambdaBasicExecutionRole
   - AmazonDynamoDBFullAccess (or more limited permissions as appropriate)
   - AmazonRDSReadOnlyAccess (for accessing PostgreSQL)
   - CloudWatchLogsFullAccess (for logging)

2. Create DynamoDB tables:

```bash
# Create ConversationMeta table
aws dynamodb create-table \
    --table-name ConversationMeta \
    --attribute-definitions AttributeName=conversation_id,AttributeType=S \
    --key-schema AttributeName=conversation_id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST

# Create CommentEmbeddings table
aws dynamodb create-table \
    --table-name CommentEmbeddings \
    --attribute-definitions \
        AttributeName=conversation_id,AttributeType=S \
        AttributeName=comment_id,AttributeType=N \
    --key-schema \
        AttributeName=conversation_id,KeyType=HASH \
        AttributeName=comment_id,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST

# Create CommentClusters table
aws dynamodb create-table \
    --table-name CommentClusters \
    --attribute-definitions \
        AttributeName=conversation_id,AttributeType=S \
        AttributeName=comment_id,AttributeType=N \
    --key-schema \
        AttributeName=conversation_id,KeyType=HASH \
        AttributeName=comment_id,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST

# Create ClusterTopics table
aws dynamodb create-table \
    --table-name ClusterTopics \
    --attribute-definitions \
        AttributeName=conversation_id,AttributeType=S \
        AttributeName=cluster_key,AttributeType=S \
    --key-schema \
        AttributeName=conversation_id,KeyType=HASH \
        AttributeName=cluster_key,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST

# Create UMAPGraph table
aws dynamodb create-table \
    --table-name UMAPGraph \
    --attribute-definitions \
        AttributeName=conversation_id,AttributeType=S \
        AttributeName=edge_id,AttributeType=S \
    --key-schema \
        AttributeName=conversation_id,KeyType=HASH \
        AttributeName=edge_id,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST

# Create CommentTexts table
aws dynamodb create-table \
    --table-name CommentTexts \
    --attribute-definitions \
        AttributeName=conversation_id,AttributeType=S \
        AttributeName=comment_id,AttributeType=N \
    --key-schema \
        AttributeName=conversation_id,KeyType=HASH \
        AttributeName=comment_id,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST
```

3. Set up an Amazon ECR repository for the Lambda function:

```bash
aws ecr create-repository --repository-name polis-comment-graph-lambda
```

## Building and Pushing the Lambda Container

1. Build the Docker image:

```bash
docker build -t polis-comment-graph-lambda .
```

2. Tag and push the image to ECR:

```bash
# Get the ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Tag the image
docker tag polis-comment-graph-lambda:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/polis-comment-graph-lambda:latest

# Push the image
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/polis-comment-graph-lambda:latest
```

## Creating the Lambda Function

1. Create the Lambda function using the AWS CLI:

```bash
aws lambda create-function \
    --function-name polis-comment-graph-lambda \
    --package-type Image \
    --code ImageUri=123456789012.dkr.ecr.us-east-1.amazonaws.com/polis-comment-graph-lambda:latest \
    --role arn:aws:iam::123456789012:role/lambda-execution-role \
    --environment "Variables={DATABASE_HOST=polis-db.cluster-xyz.us-east-1.rds.amazonaws.com,DATABASE_NAME=polis,DATABASE_USER=polis}" \
    --timeout 300 \
    --memory-size 1024
```

2. Configure the Lambda function:

- Increase timeout as needed (up to 15 minutes)
- Adjust memory allocation based on conversation size
- Configure environment variables for database connection

## Setting Up Event Triggers

### 1. SNS Topic for New Comments

```bash
# Create an SNS topic
aws sns create-topic --name polis-new-comment-topic

# Create a subscription for the Lambda function
aws sns subscribe \
    --topic-arn arn:aws:sns:us-east-1:123456789012:polis-new-comment-topic \
    --protocol lambda \
    --notification-endpoint arn:aws:lambda:us-east-1:123456789012:function:polis-comment-graph-lambda

# Grant permission for SNS to invoke the Lambda
aws lambda add-permission \
    --function-name polis-comment-graph-lambda \
    --statement-id sns-new-comment \
    --action lambda:InvokeFunction \
    --principal sns.amazonaws.com \
    --source-arn arn:aws:sns:us-east-1:123456789012:polis-new-comment-topic
```

### 2. CloudWatch Scheduled Event for Batch Processing

```bash
# Create a CloudWatch Events rule to trigger daily
aws events put-rule \
    --name polis-daily-processing \
    --schedule-expression "cron(0 0 * * ? *)"

# Add the Lambda function as a target
aws events put-targets \
    --rule polis-daily-processing \
    --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:123456789012:function:polis-comment-graph-lambda","Input"="{\"event_type\":\"process_conversation\",\"conversation_id\":\"all\"}"

# Grant permission for CloudWatch Events to invoke the Lambda
aws lambda add-permission \
    --function-name polis-comment-graph-lambda \
    --statement-id cloudwatch-daily \
    --action lambda:InvokeFunction \
    --principal events.amazonaws.com \
    --source-arn arn:aws:events:us-east-1:123456789012:rule/polis-daily-processing
```

## Testing the Deployment

### Test with a specific conversation:

```bash
aws lambda invoke \
    --function-name polis-comment-graph-lambda \
    --payload '{"event_type": "process_conversation", "conversation_id": "12345"}' \
    response.json
```

### Test processing a new comment:

```bash
aws lambda invoke \
    --function-name polis-comment-graph-lambda \
    --payload '{"event_type": "process_comment", "comment_data": {"conversation_id": "12345", "comment_id": 789, "text": "This is a test comment", "author_id": "user123"}}' \
    response.json
```

## Updating the Lambda Function

When you need to update the Lambda function:

1. Build and tag a new version of the Docker image
2. Push the new image to ECR
3. Update the Lambda function:

```bash
aws lambda update-function-code \
    --function-name polis-comment-graph-lambda \
    --image-uri 123456789012.dkr.ecr.us-east-1.amazonaws.com/polis-comment-graph-lambda:latest
```

## Technical Notes

### DynamoDB Float Handling

DynamoDB does not accept floating-point numbers directly. Our service automatically converts all floating-point values to `Decimal` types before storing them in DynamoDB using the `DataConverter.convert_floats_to_decimal()` method in `converter.py`.

When implementing applications that read from these DynamoDB tables, remember to handle these values as Decimal types or convert them back to native float types.

Example client-side conversion:

```python
import json
from decimal import Decimal

# Custom JSON encoder to handle Decimal
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

# Use when serving data from DynamoDB
data_from_dynamo = {...}  # Contains Decimal values
json_data = json.dumps(data_from_dynamo, cls=DecimalEncoder)
```

### MongoDB Collection Alternative

For applications that struggle with DynamoDB's Decimal requirement, consider using MongoDB as an alternative. MongoDB supports native floating-point values and offers similar scalability.

## Monitoring

- Set up CloudWatch Alarms for Lambda errors
- Monitor DynamoDB throughput and throttling
- Track PostgreSQL connection pool usage

## Cost Optimization

- Use AWS Lambda Provisioned Concurrency for predictable workloads
- Consider DynamoDB On-Demand pricing for variable workloads
- Implement pagination for large data retrievals to reduce RDS costs
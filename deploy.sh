#!/bin/bash

if [ $# != 1 ]; then
  echo "usage: deploy.sh <stack-name>"
  exit 1
fi

# deploy the resources
echo "Deploying CloudFormation template..."
sam deploy --template-file ./target/deploy-template.yaml --stack-name $1 --parameter-overrides Owner=$USER --capabilities CAPABILITY_IAM
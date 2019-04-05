#!/bin/bash

if [ $# != 1 ]; then
  echo "usage: package.sh <build-assets-bucket-name>"
  exit 1
fi

echo "Validating source code..."
eslint *.js
if [ $? != 0 ]; then
  echo
  echo "ERROR: Source code in invalid, exiting"
  exit 1
fi

# make sure we deploying the latest code
# note: this will also create target directory
echo "Packaging code..."
npm run package
if [ $? != 0 ]; then
  echo
  echo "ERROR: Code packaging failed, exiting"
  exit 1
fi

# ensure the template is valid
echo "Validating CloudFormation template..."
sam validate
if [ $? != 0 ]; then
  echo
  echo "ERROR: Template is invalid, exiting"
  exit 1
fi

# package the template
echo "Packaging CloudFormation template..."
sam package --template-file template.yaml --s3-bucket $1 --output-template-file ./target/deploy-template.yaml
if [ $? != 0 ]; then
  echo
  echo "ERROR: CloudFormation packaging failed, exiting"
  exit 1
fi
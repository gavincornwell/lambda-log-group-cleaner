# Welcome

This repository contains a Lambda function for cleaning up orphaned Lambda Log Groups.

By default the function gets triggered at 11pm every night.

## Prerequisites

- NodeJS 8.10+ installed
- AWS CLI configured with an IAM user with Administrator privileges
- AWS SAM CLI installed
- Mocha installed
- ESLint installed

## Setup

### Create Build Assets Bucket

An S3 bucket is required to house all build and packaging outputs.

```bash
aws s3 mb s3://build-assets
```

### Package

```bash
npm install
package.sh <build-assets-bucket-name>
```

### Deploy

```bash
deploy.sh <stack-name>
```
#!/usr/bin/env node
/**
 * BlipZo CDK App Entry Point
 *
 * Instantiates one BlipzoStack per deployment environment.
 * Each environment gets fully isolated AWS resources (DynamoDB tables,
 * S3 buckets, Cognito user pools) as required by Req 17.2.
 */

import * as cdk from 'aws-cdk-lib';
import { BlipzoStack } from '../lib/BlipzoStack';

const app = new cdk.App();

const stages = ['dev', 'qa', 'prod'] as const;

for (const stageName of stages) {
  new BlipzoStack(app, `BlipzoStack-${stageName}`, {
    stageName,
    description: `BlipZo Shopping Platform — ${stageName.toUpperCase()} environment`,
    tags: {
      Project: 'BlipZo',
      Environment: stageName,
      ManagedBy: 'CDK',
    },
  });
}

#!/usr/bin/env node
import * as dotenv from "dotenv";
dotenv.config();
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { DirectusCdkStack } from "../lib/directus-cdk-stack";

const app = new cdk.App();
new DirectusCdkStack(app, "directus-cdk", {
  env: {
    account: process.env.AWS_ACCOUNT,
    region: process.env.AWS_REGION,
  },
});

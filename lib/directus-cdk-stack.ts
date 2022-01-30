import { Stack, StackProps } from "aws-cdk-lib";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { Cluster } from "aws-cdk-lib/aws-ecs";
import { Construct } from "constructs";
import { environment } from "./stack-configuration";

export class DirectusCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const vpc = Vpc.fromLookup(this, "vpc", {
      vpcId: environment.vpcId,
    });
    const cluster = new Cluster(this, "cluster", {
      clusterName: "directus",
      vpc,
    });
  }
}

import { Stack, StackProps } from "aws-cdk-lib";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { Cluster, ContainerImage } from "aws-cdk-lib/aws-ecs";
import { ApplicationLoadBalancedFargateService } from "aws-cdk-lib/aws-ecs-patterns";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
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

    const secrets = Secret.fromSecretNameV2(this, "secrets", "directus");

    const service = new ApplicationLoadBalancedFargateService(
      this,
      "directus-service",
      {
        cluster,
        assignPublicIp: true,
        taskImageOptions: {
          image: ContainerImage.fromAsset("."),
          containerPort: 8055,
          environment: {
            ADMIN_EMAIL: "test@test.com",
            ADMIN_PASSWORD: secrets
              .secretValueFromJson("ADMIN_PASSWORD")
              .toString(),
            KEY: "eijfwoefj",
            SECRET: secrets.secretValueFromJson("SECRET").toString(),
          },
        },
      }
    );
  }
}

import { Duration, SecretValue, Stack, StackProps } from "aws-cdk-lib";
import {
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { CfnService, Cluster, ContainerImage } from "aws-cdk-lib/aws-ecs";
import { ApplicationLoadBalancedFargateService } from "aws-cdk-lib/aws-ecs-patterns";
import { DatabaseClusterEngine, ServerlessCluster } from "aws-cdk-lib/aws-rds";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { environment } from "./stack-configuration";

export class DirectusCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const secrets = Secret.fromSecretNameV2(this, "secrets", "directus");
    const vpc = Vpc.fromLookup(this, "vpc", {
      vpcId: environment.vpcId,
    });

    const privateSubnets = vpc.selectSubnets({
      subnetType: SubnetType.PRIVATE_WITH_NAT,
    });
    const dbSecurityGroup = new SecurityGroup(this, "db-sg", { vpc });
    privateSubnets.subnets.map((subnet) => {
      dbSecurityGroup.addIngressRule(
        Peer.ipv4(subnet.ipv4CidrBlock),
        Port.tcp(3306),
        subnet.subnetId
      );
    });
    const databaseName = "directus";
    const dbUser = secrets.secretValueFromJson("DB_USERNAME").toString();
    const dbPassword = secrets.secretValueFromJson("DB_PASSWORD").toString();
    const database = new ServerlessCluster(this, "database", {
      engine: DatabaseClusterEngine.AURORA_MYSQL,
      vpc,
      credentials: {
        username: dbUser,
        password: new SecretValue(dbPassword),
      },
      vpcSubnets: {
        subnets: privateSubnets.subnets,
      },
      defaultDatabaseName: databaseName,
      securityGroups: [dbSecurityGroup],
    });

    const cluster = new Cluster(this, "cluster", {
      clusterName: "directus",
      enableFargateCapacityProviders: true,
      vpc,
    });

    const service = new ApplicationLoadBalancedFargateService(
      this,
      "directus-service",
      {
        desiredCount: 1,
        cluster,
        taskSubnets: {
          subnets: privateSubnets.subnets,
        },
        healthCheckGracePeriod: Duration.seconds(10),
        taskImageOptions: {
          image: ContainerImage.fromAsset("."),
          containerPort: 8055,
          environment: {
            ADMIN_EMAIL: "test@test.com",
            ADMIN_PASSWORD: secrets
              .secretValueFromJson("ADMIN_PASSWORD")
              .toString(),
            KEY: secrets.secretValueFromJson("KEY").toString(),
            SECRET: secrets.secretValueFromJson("SECRET").toString(),
            DB_CLIENT: "mysql",
            DB_HOST: database.clusterEndpoint.hostname,
            DB_PORT: "3306",
            DB_DATABASE: databaseName,
            DB_USER: dbUser,
            DB_PASSWORD: dbPassword,
          },
        },
      }
    );

    // escape hatch required to use fargate with spot as a capacity provider
    const cfnService = service.service.node.defaultChild as CfnService;
    cfnService.capacityProviderStrategy = [
      {
        weight: 1,
        capacityProvider: "FARGATE_SPOT",
      },
    ];

    service.targetGroup.configureHealthCheck({
      path: "/server/health",
    });
  }
}

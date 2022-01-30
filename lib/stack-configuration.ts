interface Environment {
  vpcId: string;
}

const environments: { [key: string]: Environment } = {
  development: {
    vpcId: "vpc-c656aebe",
  },
};

export const environment = environments[process.env.ENVIRONMENT!];

import { Construct } from "constructs";
import * as cdk from 'aws-cdk-lib';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export default (
  self: Construct,
  instanceRole: cdk.aws_iam.Role,
  db: cdk.aws_rds.DatabaseInstance,
  logGroup: cdk.aws_logs.LogGroup,
  asgWeb: cdk.aws_autoscaling.AutoScalingGroup,
  asgMathWorker: cdk.aws_autoscaling.AutoScalingGroup,
  asgDelphiSmall: cdk.aws_autoscaling.AutoScalingGroup,
  asgDelphiLarge: cdk.aws_autoscaling.AutoScalingGroup,
  asgOllama: cdk.aws_autoscaling.AutoScalingGroup,
  fileSystem: cdk.aws_efs.FileSystem
) => {
  const webAppEnvVarsSecret = new secretsmanager.Secret(self, 'WebAppEnvVarsSecret', {
    secretName: 'polis-web-app-env-vars',
    description: 'Environment variables for the Polis web application',
  });
  const clientAdminEnvVarsSecret = new secretsmanager.Secret(self, 'ClientAdminEnvVarsSecret', {
    secretName: 'polis-client-admin-env-vars',
    description: 'Environment variables for the Polis client-admin web application',
  });

  const clientReportEnvVarsSecret = new secretsmanager.Secret(self, 'ClientReportEnvVarsSecret', {
    secretName: 'polis-client-report-env-vars',
    description: 'Environment variables for the Polis client-report web application',
  });
  webAppEnvVarsSecret.grantRead(instanceRole);
  clientAdminEnvVarsSecret.grantRead(instanceRole);
  clientReportEnvVarsSecret.grantRead(instanceRole);

  // Dependencies (Add ASGs to loops/lists)
  const addDbDependency = (asg: autoscaling.IAutoScalingGroup) => asg.node.addDependency(db);
  const addLogDependency = (asg: autoscaling.IAutoScalingGroup) => asg.node.addDependency(logGroup);
  const addSecretDependency = (asg: autoscaling.IAutoScalingGroup) => asg.node.addDependency(webAppEnvVarsSecret);

  // Apply common dependencies to all ASGs
  [asgWeb, asgMathWorker, asgDelphiSmall, asgDelphiLarge, asgOllama].forEach(asg => {
    addLogDependency(asg);
    addSecretDependency(asg);
    // Only add DB dependency if the service needs it
    if (asg !== asgOllama) {
      addDbDependency(asg);
    }
  });
  asgOllama.node.addDependency(fileSystem);
}

import { Construct } from "constructs";
import * as cdk from 'aws-cdk-lib';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';

export default (
  self: Construct,
  vpc: cdk.aws_ec2.Vpc,
  lbSecurityGroup: cdk.aws_ec2.SecurityGroup,
  asgWeb: cdk.aws_autoscaling.AutoScalingGroup
) => {
  const lb = new elbv2.ApplicationLoadBalancer(self, 'Lb', {
    vpc,
    internetFacing: true,
    securityGroup: lbSecurityGroup, // Use the dedicated ALB security group
    idleTimeout: cdk.Duration.seconds(300),
  });

  const webTargetGroup = new elbv2.ApplicationTargetGroup(self, 'WebAppTargetGroup', {
    vpc,
    port: 80,
    protocol: elbv2.ApplicationProtocol.HTTP,
    targets: [asgWeb],
    healthCheck: {
      path: "/api/v3/testConnection",
      interval: cdk.Duration.seconds(300)
    }
  });

  const httpListener = lb.addListener('HttpListener', {
    port: 80,
    open: true,
    defaultTargetGroups: [webTargetGroup],
  });

  const certificate = new acm.Certificate(self, 'WebAppCertificate', {
    domainName: 'pol.is',
    validation: acm.CertificateValidation.fromDns(),
  });

  const httpsListener = lb.addListener('HttpsListener', {
    port: 443,
    certificates: [certificate],
    open: true,
    defaultTargetGroups: [webTargetGroup],
  });

  const webScalingPolicy = asgWeb.scaleOnRequestCount('WebScalingPolicy', {
    targetRequestsPerMinute: 600,
  });

  return {
    lb,
    webTargetGroup,
    httpListener,
    httpsListener,
    webScalingPolicy
  }
}
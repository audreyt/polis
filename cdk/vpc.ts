import * as ec2 from 'aws-cdk-lib/aws-ec2';
export default (self: any) => new ec2.Vpc(self, 'Vpc', {
  maxAzs: 2,
  natGateways: 1, // Use 1 for non-prod/cost saving, 2+ for prod HA
  subnetConfiguration: [
    {
      cidrMask: 24,
      name: 'Public',
      subnetType: ec2.SubnetType.PUBLIC,
    },
    {
      cidrMask: 24,
      name: 'Private',
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
    },
    {
      cidrMask: 24,
      name: 'PrivateWithEgress',
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
    },
  ]
});
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export default (vpc: ec2.IVpc, self: Construct) => {
  const webSecurityGroup = new ec2.SecurityGroup(self, 'WebSecurityGroup', {
    vpc,
    description: 'Allow HTTP and SSH access to web instances',
    allowAllOutbound: true
  });
  const mathWorkerSecurityGroup = new ec2.SecurityGroup(self, 'MathWorkerSG', {
    vpc,
    description: 'Security group for Polis math worker',
    allowAllOutbound: true
  });
  // Delphi Security Group
  const delphiSecurityGroup = new ec2.SecurityGroup(self, 'DelphiSecurityGroup', {
    vpc,
    description: 'SG for Delphi instances',
    allowAllOutbound: true
  });
  // Ollama Security Group 
  const ollamaSecurityGroup = new ec2.SecurityGroup(self, 'OllamaSecurityGroup', {
    vpc,
    description: 'SG for Ollama instance',
    allowAllOutbound: true
  });
  // EFS Security Group
  const efsSecurityGroup = new ec2.SecurityGroup(self, 'EfsSecurityGroup', {
    vpc,
    description: 'SG for EFS mount targets',
    allowAllOutbound: false
  });
  return {
    webSecurityGroup,
    mathWorkerSecurityGroup,
    delphiSecurityGroup,
    ollamaSecurityGroup,
    efsSecurityGroup,
  }
}
import { Construct } from "constructs";
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';

export default (self: Construct, instanceRole: iam.IGrantable) => {
  const createEcrRepo = (name: string): ecr.Repository => {
    const repo = new ecr.Repository(self, `PolisRepository${name}`, {
      repositoryName: `polis/${name.toLowerCase()}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      imageScanOnPush: true,
    });
  
    repo.addToResourcePolicy(new iam.PolicyStatement({
      sid: 'AllowPublicPull',
      effect: iam.Effect.ALLOW,
      principals: [new iam.AnyPrincipal()],
      actions: [
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
      ],
    }));
    repo.grantPull(instanceRole); // Grant pull to the shared instance role
    return repo;
  };
  const ecrWebRepository = createEcrRepo('Server');
  const ecrMathRepository = createEcrRepo('Math');
  const ecrDelphiRepository = createEcrRepo('Delphi');

  // --- SSM Parameter for Image Tag
  const imageTagParameter = new ssm.StringParameter(self, 'ImageTagParameter', {
    parameterName: '/polis/image-tag',
    stringValue: 'initial-tag', //CI/CD will update this
  });

  return { ecrWebRepository, ecrMathRepository, ecrDelphiRepository, imageTagParameter }
}
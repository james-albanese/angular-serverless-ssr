import { Api, StackContext, StaticSite } from "sst/constructs";
import { BehaviorOptions, CachePolicy, Distribution, ViewerProtocolPolicy } from "aws-cdk-lib/aws-cloudfront";
import { HttpOrigin, S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Code, Runtime, Function, Architecture } from "aws-cdk-lib/aws-lambda";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import { Duration, RemovalPolicy } from "aws-cdk-lib/core";

export function Infrastructure({ stack }: StackContext) {

    const DIST_PATH = "dist";

    const serverLambda = new Function(stack, "ServerLambda", {
        handler: "server/server.handler",
        runtime: Runtime.NODEJS_20_X,
        code: Code.fromAsset(DIST_PATH),
        architecture: Architecture.ARM_64,
        memorySize: 1024,
        timeout: Duration.seconds(10),
    })

    const serverAPI = new Api(stack, "ServerAPI", {
        routes: {
            "GET /{proxy+}": {
                cdk: {
                    function: serverLambda,
                }
            }
        }
    })

    const apiGatewayDomainName = `${serverAPI.cdk.httpApi.httpApiId}.execute-api.${stack.region}.amazonaws.com`;

    const staticFileBucket = new Bucket(stack, "StaticFileBucket", {
        publicReadAccess: false,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        autoDeleteObjects: true,
        removalPolicy: RemovalPolicy.DESTROY
    })

    const baseBehaviorOptions: Partial<BehaviorOptions> = {
        compress: true,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED
    }

    const apiGatewayOrigin = new HttpOrigin(apiGatewayDomainName);

    const s3Origin = new S3Origin(staticFileBucket);

    const customCachePolicy = new CachePolicy(stack, "CustomCachePolicy", {
        defaultTtl: Duration.minutes(30),
        minTtl: Duration.minutes(20),
        maxTtl: Duration.minutes(30),
        enableAcceptEncodingGzip: true,
        enableAcceptEncodingBrotli: true,
    })

    const apiGatewayBehavior: BehaviorOptions = {
        origin: apiGatewayOrigin,
        ...baseBehaviorOptions,
        cachePolicy: customCachePolicy
    }

    const cloudFrontDistribution = new Distribution(stack, "CloudFrontDistribution", {
        defaultRootObject: "index.html",
        defaultBehavior: apiGatewayBehavior,
        additionalBehaviors: {
            "index.html": apiGatewayBehavior,
            "*.?*": {
                origin: s3Origin,
                ...baseBehaviorOptions
            }
        }
    })

    const staticSite: StaticSite = new StaticSite(stack, "StaticSite", {
        path: `${DIST_PATH}/browser`,
        cdk: {
            bucket: staticFileBucket,
            distribution: cloudFrontDistribution,
        }
    })

    stack.addOutputs({
        serverAPIEndpoint: serverAPI.url,
        staticSiteUrl: staticSite.url,
    })

}
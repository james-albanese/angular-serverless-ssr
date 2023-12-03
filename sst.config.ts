import { SSTConfig } from "sst";
import { Infrastructure } from "./infrastructure";

export default {
    config(_input) {
        return {
            name: "angular-serverless-ssr",
            region: "us-east-1",
        };
    },
    stacks(app) {
        app.stack(Infrastructure);
    }
} satisfies SSTConfig;
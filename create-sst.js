const fs = require("fs");
const { promisify } = require("util");
const exec = promisify(require("child_process").exec);

const args = process.argv.slice(2);
const projectName = args[0];

if (!projectName) {
    console.log("Please provide a project name. Example: node create-sst.js angular-serverless-ssr");
    return;
}

const InstallDependencies = async () => {

    try {
        console.log("Installing SST...");
        await exec("npm install sst@latest -D");

        const packageJson = await fs.promises.readFile("node_modules/sst/package.json", "utf8");
        const packageJsonObj = JSON.parse(packageJson);
        const awsCdkLibVersion = packageJsonObj.dependencies["aws-cdk-lib"];
        const constructsVersion = packageJsonObj.dependencies["constructs"];

        console.log("Installing aws-cdk-lib (Version: " + awsCdkLibVersion + ")...");
        await exec(`npm install aws-cdk-lib@${awsCdkLibVersion} -D`);

        console.log("Installing constructs (Version: " + constructsVersion + ")...");
        await exec(`npm install constructs@${constructsVersion} -D`);

    } catch (error) {
        console.error("Error installing dependencies.");
        throw error;
    }
};

const CreateSSTFiles = async (projectName) => {

    const sstConfig = `import { SSTConfig } from "sst";
import { Infrastructure } from "./infrastructure";

export default {
    config(_input) {
        return {
            name: "${projectName}",
            region: "us-east-1",
        };
    },
    stacks(app) {
        app.stack(Infrastructure);
    }
} satisfies SSTConfig;`;

    const sstEnv = `/// <reference path="./.sst/types/index.ts" />`;

    const infrastructureStack = `import { StackContext } from "sst/constructs";

export function Infrastructure({ stack }: StackContext) {

}`;

    try {
        console.log("Creating sst.config.ts...");
        fs.promises.writeFile("sst.config.ts", sstConfig);

        console.log("Creating sst-env.d.ts...");
        fs.promises.writeFile("sst-env.d.ts", sstEnv);

        console.log("Creating infrastructure.ts...");
        fs.promises.writeFile("infrastructure.ts", infrastructureStack);

    } catch (error) {
        console.error("Error creating SST files.");
        throw error;
    }

};

const UpdateGitIgnore = async () => {

    try {
        const gitIgnore = await fs.promises.readFile(".gitignore", "utf8");
        const gitIgnoreLines = gitIgnore.split("\n");

        if (!gitIgnoreLines.includes(".sst")) gitIgnoreLines.push("# SST", ".sst");
        await fs.promises.writeFile(".gitignore", gitIgnoreLines.join("\n"));

    } catch (error) {
        console.error("Error updating .gitignore.");
        throw error;
    }

};

const AddScriptsToPackageJson = async () => {

    try {
        const packageJson = await fs.promises.readFile("package.json", "utf8");
        const packageJsonObj = JSON.parse(packageJson);

        if (!packageJsonObj.scripts.dev) packageJsonObj.scripts.dev = "sst dev";
        if (!packageJsonObj.scripts.deploy) packageJsonObj.scripts.deploy = "sst deploy";
        await fs.promises.writeFile("package.json", JSON.stringify(packageJsonObj, null, 2));
    } catch (error) {
        console.error("Error updating package.json.");
        throw error;
    }

}

const CreateSST = async (projectName) => {

    try {
        await InstallDependencies();
        await CreateSSTFiles(projectName);
        await UpdateGitIgnore();
        await AddScriptsToPackageJson();
    } catch (error) {
        console.error("Error creating SST: ", error);
    }

};

CreateSST(projectName);
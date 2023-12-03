import { CommonEngine, CommonEngineOptions, CommonEngineRenderOptions } from "@angular/ssr";
import { APP_BASE_HREF } from "@angular/common";
import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, extname } from "node:path";
import { promises } from "node:fs";

import bootstrap from "./src/main.server";

class StaticFileHandler {

  public static isStaticFile(path: string): boolean {
    if (path.includes(".") && !path.endsWith(".html")) return true;
    return false;
  }

  constructor(private readonly browserDir: string) { }

  public async handle(path: string): Promise<APIGatewayProxyResultV2> {
    const filePath = join(this.browserDir, path);
    const fileExt = extname(filePath);
    const fileContent = await promises.readFile(filePath);
    const contentType = this._getContentType(fileExt);
    return {
      statusCode: 200,
      headers: {
        "Content-Type": contentType
      },
      body: fileContent.toString()
    }
  }

  private _getContentType(extension: string): string {
    const mapping: Record<string, string> = {
      ".js": "text/javascript",
      ".css": "text/css",
      // Add more MIME types as necessary
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
    }
    return mapping[extension] || "application/octet-stream";
  }

}

export const handler: APIGatewayProxyHandlerV2 = async (event: APIGatewayProxyEventV2) => {

  const serverDir = dirname(fileURLToPath(import.meta.url));
  const browserDir = resolve(serverDir, "../browser");
  const indexHtml = join(serverDir, "index.server.html");

  const { headers, requestContext } = event;
  const { host } = headers;
  const { path } = requestContext.http;

  if (StaticFileHandler.isStaticFile(path)) {
    const staticFileHandler = new StaticFileHandler(browserDir);
    return await staticFileHandler.handle(path);
  }

  const commonEngineOptions: CommonEngineOptions = {
    enablePerformanceProfiler: true
  }

  const commonEngine = new CommonEngine(commonEngineOptions);

  const renderingOptions: CommonEngineRenderOptions = {
    bootstrap: bootstrap,
    documentFilePath: indexHtml,
    url: `https://${host}${path}`,
    publicPath: browserDir,
    providers: [{ provide: APP_BASE_HREF, useValue: "/" }],
  }

  const result = await commonEngine.render(renderingOptions);

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html"
    },
    body: result
  }

}
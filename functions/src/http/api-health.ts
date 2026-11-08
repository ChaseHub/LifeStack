import { onRequest, Request } from "firebase-functions/https";
import * as logger from "firebase-functions/logger";
import { errorResponse, successResponse } from "../utils/response.js";

export interface HealthCheckPayload {
  readonly status: "healthy";
  readonly service: string;
  readonly runtime: string;
}

export interface MinimalHttpResponse {
  set(field: string, value: string): unknown;
  status(code: number): MinimalHttpResponse;
  json(body: unknown): unknown;
  end(): unknown;
}

export function handleApiHealth(
  request: Pick<Request, "method">,
  response: MinimalHttpResponse
): void {
  response.set("Cache-Control", "no-store");

  const method = request.method?.toUpperCase() ?? "GET";
  if (method !== "GET" && method !== "HEAD") {
    response.set("Allow", "GET, HEAD");
    response
      .status(405)
      .json(errorResponse("METHOD_NOT_ALLOWED", "Only GET and HEAD requests are supported."));
    return;
  }

  logger.info("apiHealth called", { method });

  if (method === "HEAD") {
    response.status(200).end();
    return;
  }

  response.status(200).json(
    successResponse<HealthCheckPayload>({
      status: "healthy",
      service: "LifeStack Serverless Cloud Functions (2nd Gen)",
      runtime: `Node.js ${process.versions.node}`
    })
  );
}

/**
 * 2nd Gen HTTP Endpoint: Health check for system monitoring (`/api/health`).
 */
export const apiHealth = onRequest((request, response) => {
  handleApiHealth(request, response);
});


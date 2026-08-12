import { createRemoteJWKSet, jwtVerify } from "jose";

import type { RuntimeEnv } from "./env";
import { HttpError } from "./http";

type RouteRole = "author" | "ci";

function routeRole(pathname: string): RouteRole | null {
  if (pathname.startsWith("/v1/author/")) return "author";
  if (pathname.startsWith("/v1/ci/")) return "ci";
  return null;
}

function required(value: string, name: string): string {
  if (!value || value.startsWith("REPLACE_ME")) {
    throw new HttpError(503, "service_not_configured", `${name} is not configured`);
  }
  return value;
}

export async function authorize(
  request: Request,
  env: RuntimeEnv,
  pathname: string,
): Promise<void> {
  const role = routeRole(pathname);
  if (!role) return;

  if (env.AUTH_MODE === "test") {
    const testRole = request.headers.get("x-test-role");
    if (testRole !== role) throw new HttpError(403, "forbidden", "Route role is not allowed");
    return;
  }
  if (env.AUTH_MODE !== "access") {
    throw new HttpError(503, "service_not_configured", "Authentication mode is not configured");
  }

  const assertion = request.headers.get("cf-access-jwt-assertion");
  if (!assertion) throw new HttpError(401, "unauthorized", "Access assertion is required");

  const teamDomain = required(env.ACCESS_TEAM_DOMAIN, "ACCESS_TEAM_DOMAIN").replace(/\/$/, "");
  const audience = required(
    role === "author" ? env.AUTHOR_POLICY_AUD : env.CI_POLICY_AUD,
    role === "author" ? "AUTHOR_POLICY_AUD" : "CI_POLICY_AUD",
  );
  const expectedIdentity = required(
    role === "author" ? env.AUTHOR_SERVICE_TOKEN_ID : env.CI_SERVICE_TOKEN_ID,
    role === "author" ? "AUTHOR_SERVICE_TOKEN_ID" : "CI_SERVICE_TOKEN_ID",
  );

  try {
    const jwks = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
    const { payload } = await jwtVerify(assertion, jwks, {
      issuer: teamDomain,
      audience,
    });
    if (payload.common_name !== expectedIdentity) {
      throw new HttpError(403, "forbidden", "Service identity is not allowed");
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, "unauthorized", "Access assertion is invalid");
  }
}

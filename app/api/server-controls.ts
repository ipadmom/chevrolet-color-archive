import { env } from "cloudflare:workers";
import { sql } from "drizzle-orm";
import { getDb } from "../../db";
import { submissionRateLimits } from "../../db/schema";
import { bearerMatches, sha256Hex } from "./archive-security.mjs";

export type ArchiveEnv = {
  DB?: D1Database;
  UPLOADS?: R2Bucket;
  PUBLISH_QUEUE_TOKEN?: string;
  UPLOAD_RATE_SALT?: string;
  PUBLIC_CORS_ORIGIN?: string;
};

type SubmissionAction = "photo-upload" | "photo-selection";

const DEFAULT_PUBLIC_ORIGIN = "https://ipadmom.github.io";
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMITS: Record<SubmissionAction, number> = {
  "photo-upload": 6,
  "photo-selection": 30,
};

export class ApiControlError extends Error {
  status: number;
  retrySeconds?: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiControlError";
    this.status = status;
  }
}

export function getArchiveEnv(): ArchiveEnv {
  return env as unknown as ArchiveEnv;
}

export function isAllowedBrowserOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  if (origin === new URL(request.url).origin) return true;
  return allowedPublicOrigins().has(origin);
}

export function corsPreflight(
  request: Request,
  methods: readonly string[],
): Response {
  if (!isAllowedBrowserOrigin(request)) {
    return new Response(null, { status: 403 });
  }
  const headers = corsHeaders(request);
  headers.set("access-control-allow-methods", methods.join(", "));
  headers.set("access-control-allow-headers", "authorization, content-type");
  headers.set("access-control-max-age", "86400");
  return new Response(null, { status: 204, headers });
}

export function jsonResponse(
  request: Request,
  value: unknown,
  init: ResponseInit = {},
): Response {
  const response = Response.json(value, init);
  applyCorsHeaders(request, response.headers);
  response.headers.set("cache-control", "no-store");
  return response;
}

export function applyCorsHeaders(request: Request, headers: Headers): void {
  const origin = request.headers.get("origin");
  if (
    origin &&
    (origin === new URL(request.url).origin ||
      allowedPublicOrigins().has(origin))
  ) {
    headers.set("access-control-allow-origin", origin);
  }
  headers.append("vary", "Origin");
}

export async function requireQueueAuthorization(
  request: Request,
): Promise<Response | null> {
  const token = getArchiveEnv().PUBLISH_QUEUE_TOKEN;
  if (!token) {
    return jsonResponse(
      request,
      { error: "Publisher queue authentication is not configured." },
      { status: 503 },
    );
  }
  if (!(await bearerMatches(request, token))) {
    return jsonResponse(request, { error: "Unauthorized." }, { status: 401 });
  }
  return null;
}

export async function queueAuthorizationMatches(
  request: Request,
): Promise<boolean> {
  const token = getArchiveEnv().PUBLISH_QUEUE_TOKEN;
  return Boolean(token && (await bearerMatches(request, token)));
}

export async function enforceSubmissionRateLimit(
  request: Request,
  action: SubmissionAction,
): Promise<void> {
  const salt = getArchiveEnv().UPLOAD_RATE_SALT;
  if (!salt) {
    throw new ApiControlError(
      "Anonymous submission protection is not configured.",
      503,
    );
  }

  const address =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const fingerprint = await sha256Hex(`${salt}\u0000${address}`);
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  const rows = await getDb()
    .insert(submissionRateLimits)
    .values({
      fingerprint,
      action,
      windowStartedAt: now,
      count: 1,
    })
    .onConflictDoUpdate({
      target: [
        submissionRateLimits.fingerprint,
        submissionRateLimits.action,
      ],
      set: {
        windowStartedAt: sql`CASE
          WHEN ${submissionRateLimits.windowStartedAt} <= ${cutoff}
          THEN ${now}
          ELSE ${submissionRateLimits.windowStartedAt}
        END`,
        count: sql`CASE
          WHEN ${submissionRateLimits.windowStartedAt} <= ${cutoff}
          THEN 1
          ELSE ${submissionRateLimits.count} + 1
        END`,
      },
    })
    .returning({
      count: submissionRateLimits.count,
      windowStartedAt: submissionRateLimits.windowStartedAt,
    });

  const result = rows[0];
  if (!result) {
    throw new ApiControlError(
      "Submission protection did not return a counter.",
      503,
    );
  }
  if (result.count > RATE_LIMITS[action]) {
    const retrySeconds = Math.max(
      1,
      Math.ceil(
        (result.windowStartedAt + RATE_WINDOW_MS - Date.now()) / 1000,
      ),
    );
    const error = new ApiControlError(
      `Submission limit reached. Try again in ${retrySeconds} seconds.`,
      429,
    );
    error.retrySeconds = retrySeconds;
    throw error;
  }
}

export function apiControlErrorResponse(
  request: Request,
  error: unknown,
): Response | null {
  if (!(error instanceof ApiControlError)) return null;
  const retrySeconds =
    "retrySeconds" in error && typeof error.retrySeconds === "number"
      ? error.retrySeconds
      : null;
  const headers = retrySeconds
    ? { "retry-after": String(retrySeconds) }
    : undefined;
  return jsonResponse(
    request,
    { error: error.message },
    { status: error.status, headers },
  );
}

function allowedPublicOrigins(): Set<string> {
  const configured = getArchiveEnv().PUBLIC_CORS_ORIGIN;
  return new Set(
    (configured ? configured.split(",") : [DEFAULT_PUBLIC_ORIGIN])
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

function corsHeaders(request: Request): Headers {
  const headers = new Headers();
  applyCorsHeaders(request, headers);
  return headers;
}

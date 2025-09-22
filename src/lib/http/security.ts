import { type NextRequest, NextResponse } from "next/server";
import { createRequestLogger, generateRequestId } from "../logging/logger";

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  skipSuccessfulRequests?: boolean;
}

export interface SecurityConfig {
  enableRateLimit: boolean;
  enableCSRFProtection: boolean;
  rateLimitConfig: RateLimitConfig;
  trustedOrigins: string[];
}

const defaultConfig: SecurityConfig = {
  enableRateLimit: true,
  enableCSRFProtection: true,
  rateLimitConfig: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
  },
  trustedOrigins: ["http://localhost:3000", "https://localhost:3000"],
};

// Simple in-memory rate limiting store
// In production, use Redis or similar
class RateLimitStore {
  private store = new Map<string, { requests: number; resetTime: number }>();

  get(key: string): { requests: number; resetTime: number } | undefined {
    const entry = this.store.get(key);
    if (entry && entry.resetTime < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  set(key: string, requests: number, windowMs: number): void {
    this.store.set(key, {
      requests,
      resetTime: Date.now() + windowMs,
    });
  }

  increment(key: string, windowMs: number): number {
    const current = this.get(key);
    if (!current) {
      this.set(key, 1, windowMs);
      return 1;
    }

    const newCount = current.requests + 1;
    this.set(key, newCount, windowMs);
    return newCount;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key);
      }
    }
  }
}

const rateLimitStore = new RateLimitStore();

// Cleanup expired entries every 5 minutes
if (typeof window === "undefined") {
  setInterval(() => rateLimitStore.cleanup(), 5 * 60 * 1000);
}

export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  return "unknown";
}

export function rateLimit(
  config: RateLimitConfig = defaultConfig.rateLimitConfig,
) {
  return (request: NextRequest): NextResponse | null => {
    const ip = getClientIP(request);
    const key = `rate_limit:${ip}`;

    const requestCount = rateLimitStore.increment(key, config.windowMs);

    if (requestCount > config.maxRequests) {
      const resetTime = Math.ceil(
        (rateLimitStore.get(key)?.resetTime || Date.now()) / 1000,
      );

      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: `Too many requests. Try again later.`,
          retryAfter: resetTime,
        },
        {
          status: 429,
          headers: {
            "Retry-After": resetTime.toString(),
            "X-RateLimit-Limit": config.maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": resetTime.toString(),
          },
        },
      );
    }

    return null; // Allow request to proceed
  };
}

export function csrfProtection(
  trustedOrigins: string[] = defaultConfig.trustedOrigins,
) {
  return (request: NextRequest): NextResponse | null => {
    // Skip CSRF for GET requests
    if (request.method === "GET") {
      return null;
    }

    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");

    // Check origin header
    if (origin) {
      if (!trustedOrigins.includes(origin)) {
        return NextResponse.json(
          {
            error: "CSRF protection",
            message: "Origin not allowed",
          },
          { status: 403 },
        );
      }
    }

    // Fallback to referer check
    if (!origin && referer) {
      const refererOrigin = new URL(referer).origin;
      if (!trustedOrigins.includes(refererOrigin)) {
        return NextResponse.json(
          {
            error: "CSRF protection",
            message: "Referer not allowed",
          },
          { status: 403 },
        );
      }
    }

    // If neither origin nor referer is present for state-changing requests, block
    if (!origin && !referer) {
      return NextResponse.json(
        {
          error: "CSRF protection",
          message: "Origin or referer header required",
        },
        { status: 403 },
      );
    }

    return null; // Allow request to proceed
  };
}

export function withSecurity(
  handler: (
    request: NextRequest,
    context?: { params: Record<string, string | string[]> },
  ) => Promise<NextResponse>,
  config: Partial<SecurityConfig> = {},
) {
  const finalConfig = { ...defaultConfig, ...config };

  return async (
    request: NextRequest,
    context?: { params: Record<string, string | string[]> },
  ): Promise<NextResponse> => {
    const requestId = generateRequestId();
    const logger = createRequestLogger(request, requestId);

    try {
      // Add request ID to response headers
      const headers = new Headers();
      headers.set("X-Request-ID", requestId);

      // Apply rate limiting
      if (finalConfig.enableRateLimit) {
        const rateLimitResponse = rateLimit(finalConfig.rateLimitConfig)(
          request,
        );
        if (rateLimitResponse) {
          // Add request ID to rate limit response
          rateLimitResponse.headers.set("X-Request-ID", requestId);
          logger.warn("Rate limit exceeded", {
            ip: getClientIP(request),
            method: request.method,
            url: request.url,
          });
          return rateLimitResponse;
        }
      }

      // Apply CSRF protection
      if (finalConfig.enableCSRFProtection) {
        const csrfResponse = csrfProtection(finalConfig.trustedOrigins)(
          request,
        );
        if (csrfResponse) {
          // Add request ID to CSRF response
          csrfResponse.headers.set("X-Request-ID", requestId);
          logger.warn("CSRF protection triggered", {
            origin: request.headers.get("origin"),
            referer: request.headers.get("referer"),
            method: request.method,
            url: request.url,
          });
          return csrfResponse;
        }
      }

      // Call the actual handler
      logger.info("Processing request", {
        method: request.method,
        url: request.url,
        userAgent: request.headers.get("user-agent"),
      });

      const response = await handler(request, context);

      // Add security headers to response
      response.headers.set("X-Request-ID", requestId);
      response.headers.set("X-Content-Type-Options", "nosniff");
      response.headers.set("X-Frame-Options", "DENY");
      response.headers.set("X-XSS-Protection", "1; mode=block");

      logger.info("Request completed", {
        status: response.status,
        method: request.method,
        url: request.url,
      });

      return response;
    } catch (error) {
      logger.error("Request failed", error as Error, {
        method: request.method,
        url: request.url,
      });

      return NextResponse.json(
        {
          error: "Internal server error",
          message: "An unexpected error occurred",
          requestId,
        },
        {
          status: 500,
          headers: {
            "X-Request-ID": requestId,
          },
        },
      );
    }
  };
}

export function validateContentType(
  allowedTypes: string[] = ["application/json"],
) {
  return (request: NextRequest): NextResponse | null => {
    // Skip validation for GET requests
    if (request.method === "GET") {
      return null;
    }

    const contentType = request.headers.get("content-type");
    if (!contentType) {
      return NextResponse.json(
        {
          error: "Content-Type header required",
          allowedTypes,
        },
        { status: 400 },
      );
    }

    const isAllowed = allowedTypes.some((type) =>
      contentType.toLowerCase().includes(type.toLowerCase()),
    );

    if (!isAllowed) {
      return NextResponse.json(
        {
          error: "Unsupported Content-Type",
          contentType,
          allowedTypes,
        },
        { status: 415 },
      );
    }

    return null;
  };
}

export async function parseJsonBody<T>(request: NextRequest): Promise<T> {
  try {
    return await request.json();
  } catch (_error) {
    throw new Error("Invalid JSON body");
  }
}

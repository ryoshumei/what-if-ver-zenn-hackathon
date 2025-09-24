export interface LogContext {
  requestId?: string;
  userId?: string;
  operation?: string;
  metadata?: Record<string, unknown>;
}

export interface LogEntry {
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export class Logger {
  private context: LogContext = {};

  constructor(defaultContext: LogContext = {}) {
    this.context = defaultContext;
  }

  setContext(context: Partial<LogContext>): void {
    this.context = { ...this.context, ...context };
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log("debug", message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log("info", message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log("warn", message, metadata);
  }

  error(
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>,
  ): void {
    const errorInfo = error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : undefined;

    this.log("error", message, metadata, errorInfo);
  }

  private log(
    level: LogEntry["level"],
    message: string,
    metadata?: Record<string, unknown>,
    error?: LogEntry["error"],
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        ...this.context,
        ...(metadata && { metadata }),
      },
      ...(error && { error }),
    };

    // In development, use console logging with nice formatting
    if (process.env.NODE_ENV === "development") {
      this.consoleLog(entry);
    } else {
      // In production, use structured JSON logging
      this.structuredLog(entry);
    }
  }

  private consoleLog(entry: LogEntry): void {
    const { timestamp, level, message, context, error } = entry;

    const prefix = `[${timestamp}] ${level.toUpperCase()}`;
    const contextStr = context?.requestId ? ` [${context.requestId}]` : "";
    const userStr = context?.userId ? ` [user:${context.userId}]` : "";

    const fullMessage = `${prefix}${contextStr}${userStr} ${message}`;

    switch (level) {
      case "debug":
        console.debug(fullMessage, context?.metadata);
        break;
      case "info":
        console.info(fullMessage, context?.metadata);
        break;
      case "warn":
        console.warn(fullMessage, context?.metadata);
        break;
      case "error":
        console.error(fullMessage, error, context?.metadata);
        break;
    }
  }

  private structuredLog(entry: LogEntry): void {
    // Output structured JSON for log aggregation services
    console.log(JSON.stringify(entry));
  }

  // Create a child logger with additional context
  child(additionalContext: Partial<LogContext>): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }

  // Request-specific logger factory
  forRequest(requestId: string, userId?: string): Logger {
    return this.child({ requestId, userId });
  }

  // Operation-specific logger factory
  forOperation(operation: string, metadata?: Record<string, unknown>): Logger {
    return this.child({ operation, metadata });
  }
}

// Performance logging utilities
export class PerformanceLogger {
  private logger: Logger;
  private startTimes: Map<string, number> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  start(operation: string): void {
    this.startTimes.set(operation, Date.now());
    this.logger.debug(`Started ${operation}`);
  }

  end(operation: string, metadata?: Record<string, unknown>): void {
    const startTime = this.startTimes.get(operation);
    if (!startTime) {
      this.logger.warn(`No start time found for operation: ${operation}`);
      return;
    }

    const duration = Date.now() - startTime;
    this.startTimes.delete(operation);

    this.logger.info(`Completed ${operation}`, {
      duration_ms: duration,
      ...metadata,
    });

    // Log slow operations as warnings
    if (duration > 5000) {
      // 5 seconds
      this.logger.warn(`Slow operation detected: ${operation}`, {
        duration_ms: duration,
        ...metadata,
      });
    }
  }

  measure<T>(
    operation: string,
    fn: () => T | Promise<T>,
    metadata?: Record<string, unknown>,
  ): T | Promise<T> {
    this.start(operation);

    try {
      const result = fn();

      if (result instanceof Promise) {
        return result
          .then((value) => {
            this.end(operation, metadata);
            return value;
          })
          .catch((error) => {
            this.end(operation, { ...metadata, error: true });
            throw error;
          });
      } else {
        this.end(operation, metadata);
        return result;
      }
    } catch (error) {
      this.end(operation, { ...metadata, error: true });
      throw error;
    }
  }
}

// Request ID generation utility
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Error logging utilities
export function logError(logger: Logger, error: Error, context?: string): void {
  logger.error(
    context ? `${context}: ${error.message}` : error.message,
    error,
    {
      errorName: error.name,
      stack: error.stack,
    },
  );
}

export function logApiError(
  logger: Logger,
  error: Error,
  endpoint: string,
  statusCode?: number,
): void {
  logger.error(`API Error at ${endpoint}`, error, {
    endpoint,
    statusCode,
    userAgent: process.env.NODE_ENV === "development" ? "dev" : undefined,
  });
}

// Create default logger instance
export const logger = new Logger({
  operation: "app",
});

// Request logging middleware helper
export function createRequestLogger(
  req: { headers?: Record<string, string | string[] | undefined> | Headers },
  requestId?: string,
): Logger {
  const id = requestId || generateRequestId();

  // Handle both Headers object and plain object
  let userAgent: string | undefined;
  let ip: string | undefined;

  if (req.headers instanceof Headers) {
    userAgent = req.headers.get("user-agent") || undefined;
    ip = req.headers.get("x-forwarded-for") || "unknown";
  } else if (req.headers) {
    userAgent = Array.isArray(req.headers["user-agent"])
      ? req.headers["user-agent"][0]
      : req.headers["user-agent"];
    ip = Array.isArray(req.headers["x-forwarded-for"])
      ? req.headers["x-forwarded-for"][0]
      : req.headers["x-forwarded-for"] || "unknown";
  } else {
    userAgent = undefined;
    ip = "unknown";
  }

  return logger.forRequest(id).child({
    metadata: {
      userAgent,
      ip,
    },
  });
}

// Generation operation logger
export function createGenerationLogger(
  generationId: string,
  type: "image" | "video",
  userId?: string,
): Logger {
  return logger.forOperation("generation", {
    generationId,
    type,
    userId,
  });
}

// Export performance logger factory
export function createPerformanceLogger(baseLogger: Logger): PerformanceLogger {
  return new PerformanceLogger(baseLogger);
}

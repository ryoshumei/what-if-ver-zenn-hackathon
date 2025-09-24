import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createGenerationLogger,
  createPerformanceLogger,
  createRequestLogger,
  generateRequestId,
  type LogContext,
  Logger,
  PerformanceLogger,
} from "@/lib/logging/logger";

describe("Logger", () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    debug: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    // Set NODE_ENV to development for console logging behavior
    vi.stubEnv("NODE_ENV", "development");

    consoleSpy = {
      log: vi.spyOn(console, "log").mockImplementation(() => {}),
      debug: vi.spyOn(console, "debug").mockImplementation(() => {}),
      info: vi.spyOn(console, "info").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe("Logger class", () => {
    it("should create logger with default context", () => {
      const logger = new Logger();
      expect(logger).toBeInstanceOf(Logger);
    });

    it("should create logger with custom context", () => {
      const context: LogContext = {
        requestId: "req-123",
        userId: "user-456",
      };

      const logger = new Logger(context);
      logger.info("test message");

      // Verify the context is used in logging
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it("should set context", () => {
      const logger = new Logger();
      const context: LogContext = {
        requestId: "req-123",
        operation: "test",
      };

      logger.setContext(context);
      logger.info("test message");

      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it("should merge context when setting", () => {
      const logger = new Logger({ requestId: "req-123" });

      logger.setContext({ userId: "user-456" });
      logger.info("test message");

      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it("should log debug messages", () => {
      const logger = new Logger();
      logger.debug("debug message", { key: "value" });

      expect(consoleSpy.debug).toHaveBeenCalled();
    });

    it("should log info messages", () => {
      const logger = new Logger();
      logger.info("info message", { key: "value" });

      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it("should log warn messages", () => {
      const logger = new Logger();
      logger.warn("warn message", { key: "value" });

      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it("should log error messages", () => {
      const logger = new Logger();
      logger.error("error message", new Error("test error"), { key: "value" });

      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it("should log error messages without error object", () => {
      const logger = new Logger();
      logger.error("error message");

      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it("should create child logger", () => {
      const parentLogger = new Logger({ requestId: "req-123" });
      const childLogger = parentLogger.child({ userId: "user-456" });

      childLogger.info("child message");

      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it("should create operation logger", () => {
      const logger = new Logger();
      const operationLogger = logger.forOperation("test-operation", {
        key: "value",
      });

      operationLogger.info("operation message");

      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it("should create request logger", () => {
      const logger = new Logger();
      const requestLogger = logger.forRequest("req-123", "user-456");

      requestLogger.info("request message");

      expect(consoleSpy.info).toHaveBeenCalled();
    });
  });

  describe("PerformanceLogger", () => {
    it("should start and end operations", () => {
      const logger = new Logger();
      const perfLogger = new PerformanceLogger(logger);

      perfLogger.start("test-operation");
      perfLogger.end("test-operation");

      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining("Started test-operation"),
        undefined,
      );
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("Completed test-operation"),
        expect.any(Object),
      );
    });

    it("should handle end without start", () => {
      const logger = new Logger();
      const perfLogger = new PerformanceLogger(logger);

      perfLogger.end("non-existent-operation");

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining("No start time found"),
        undefined,
      );
    });

    it("should measure synchronous operations", () => {
      const logger = new Logger();
      const perfLogger = new PerformanceLogger(logger);

      const result = perfLogger.measure("sync-op", () => {
        return "result";
      });

      expect(result).toBe("result");
      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining("Started sync-op"),
        undefined,
      );
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("Completed sync-op"),
        expect.any(Object),
      );
    });

    it("should measure asynchronous operations", async () => {
      const logger = new Logger();
      const perfLogger = new PerformanceLogger(logger);

      const result = await perfLogger.measure("async-op", async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "async-result";
      });

      expect(result).toBe("async-result");
      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining("Started async-op"),
        undefined,
      );
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("Completed async-op"),
        expect.any(Object),
      );
    });

    it("should handle errors in measured operations", () => {
      const logger = new Logger();
      const perfLogger = new PerformanceLogger(logger);

      expect(() => {
        perfLogger.measure("error-op", () => {
          throw new Error("Test error");
        });
      }).toThrow("Test error");

      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining("Started error-op"),
        undefined,
      );
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("Completed error-op"),
        expect.any(Object),
      );
    });

    it("should handle async errors in measured operations", async () => {
      const logger = new Logger();
      const perfLogger = new PerformanceLogger(logger);

      await expect(
        perfLogger.measure("async-error-op", async () => {
          throw new Error("Async test error");
        }),
      ).rejects.toThrow("Async test error");

      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining("Started async-error-op"),
        undefined,
      );
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("Completed async-error-op"),
        expect.any(Object),
      );
    });
  });

  describe("Helper functions", () => {
    it("should generate request ID", () => {
      const requestId = generateRequestId();
      expect(requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    it("should generate unique request IDs", () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      expect(id1).not.toBe(id2);
    });

    it("should create request logger", () => {
      const mockRequest = {
        method: "GET",
        url: "/api/test",
        headers: new Headers(),
      } as { method: string; url: string; headers: Headers };

      const logger = createRequestLogger(mockRequest, "req-123");
      expect(logger).toBeInstanceOf(Logger);

      logger.info("test message");
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it("should create generation logger", () => {
      const logger = createGenerationLogger("gen-123", "video", "user-456");
      expect(logger).toBeInstanceOf(Logger);

      logger.info("generation message");
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it("should create performance logger", () => {
      const baseLogger = new Logger();
      const perfLogger = createPerformanceLogger(baseLogger);
      expect(perfLogger).toBeInstanceOf(PerformanceLogger);
    });
  });

  describe("Environment-specific behavior", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("should use console logging in development", () => {
      vi.stubEnv("NODE_ENV", "development");

      const logger = new Logger();
      logger.info("development message");

      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it("should use structured logging in production", () => {
      vi.stubEnv("NODE_ENV", "production");

      const logger = new Logger();
      logger.info("production message");

      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });
});

import { type NextRequest, NextResponse } from "next/server";
import { createRequestLogger } from "../../../lib/logging/logger";
import { jobRunner } from "../../../lib/jobs/runner";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const logger = createRequestLogger(request);

  try {
    // Handle empty request body gracefully
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      // If no body or invalid JSON, default to start action
      body = { action: "start" };
    }

    const { action } = body;

    if (action === "start") {
      logger.info("Starting job runner");

      if (jobRunner.isHealthy()) {
        return NextResponse.json({
          message: "Job runner is already running",
          status: "running",
        });
      }

      // Start the job runner in the background
      jobRunner.start().catch((error) => {
        console.error("Job runner failed:", error);
      });

      return NextResponse.json({
        message: "Job runner started successfully",
        status: "starting",
      });
    }

    if (action === "stop") {
      logger.info("Stopping job runner");
      jobRunner.stop();

      return NextResponse.json({
        message: "Job runner stopped",
        status: "stopped",
      });
    }

    if (action === "status") {
      const stats = jobRunner.getStats();
      const isHealthy = jobRunner.isHealthy();

      return NextResponse.json({
        isRunning: isHealthy,
        stats,
        status: isHealthy ? "running" : "stopped",
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'start', 'stop', or 'status'" },
      { status: 400 },
    );
  } catch (error) {
    logger.error("Job management failed", error as Error);

    return NextResponse.json(
      {
        error: "Job management failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const logger = createRequestLogger(request);

  try {
    const stats = jobRunner.getStats();
    const isHealthy = jobRunner.isHealthy();

    logger.info("Job runner status check", { isRunning: isHealthy, stats });

    return NextResponse.json({
      isRunning: isHealthy,
      stats,
      status: isHealthy ? "running" : "stopped",
    });
  } catch (error) {
    logger.error("Job status check failed", error as Error);

    return NextResponse.json(
      {
        error: "Status check failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";

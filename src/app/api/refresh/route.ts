import { NextResponse } from "next/server";
import { getRefreshStatus, setRefreshStatus, isCacheStale, getLastRefreshTime } from "@/lib/cache";

export async function GET() {
  try {
    const [status, stale, lastRefresh] = await Promise.all([
      getRefreshStatus(),
      isCacheStale(),
      getLastRefreshTime(),
    ]);

    return NextResponse.json({
      status,
      isStale: stale,
      lastRefresh: lastRefresh?.toISOString() || null,
    });
  } catch (error) {
    console.error("Error getting refresh status:", error);
    return NextResponse.json(
      { error: "Failed to get refresh status" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    // Check if already running
    const currentStatus = await getRefreshStatus();
    if (currentStatus === "running") {
      return NextResponse.json(
        { error: "Refresh already in progress", status: "running" },
        { status: 409 }
      );
    }

    // Check if cache is fresh (rate limiting)
    const stale = await isCacheStale();
    if (!stale) {
      const lastRefresh = await getLastRefreshTime();
      return NextResponse.json({
        message: "Cache is still fresh",
        status: "fresh",
        lastRefresh: lastRefresh?.toISOString() || null,
        nextRefreshAvailable: lastRefresh
          ? new Date(lastRefresh.getTime() + 3600000).toISOString()
          : null,
      });
    }

    // Trigger the Python refresh function
    // The Python function is at /api/refresh (refresh.py)
    // We need to call it via HTTP since it's a separate runtime
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // Set status to running before calling Python function
    await setRefreshStatus("running");

    // Call the Python function at /api/ig-refresh
    const response = await fetch(`${baseUrl}/api/ig-refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      await setRefreshStatus(`error:${error.error || "Failed to trigger refresh"}`);
      return NextResponse.json(
        { error: "Failed to trigger refresh", details: error },
        { status: 500 }
      );
    }

    const result = await response.json();
    return NextResponse.json({
      message: "Refresh triggered",
      status: "running",
      ...result,
    });
  } catch (error) {
    console.error("Error triggering refresh:", error);
    await setRefreshStatus(`error:${error instanceof Error ? error.message : "Unknown error"}`);
    return NextResponse.json(
      { error: "Failed to trigger refresh" },
      { status: 500 }
    );
  }
}

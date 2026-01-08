"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface RefreshStatus {
  status: "idle" | "running" | "complete" | `error:${string}`;
  isStale: boolean;
  lastRefresh: string | null;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function RefreshButton({ className }: { className?: string }) {
  const [status, setStatus] = useState<RefreshStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/refresh");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        return data.status;
      }
    } catch (err) {
      console.error("Failed to fetch status:", err);
    }
    return null;
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!isRefreshing) return;

    const interval = setInterval(async () => {
      const currentStatus = await fetchStatus();
      if (currentStatus && currentStatus !== "running") {
        setIsRefreshing(false);
        if (currentStatus === "complete") {
          window.location.reload();
        } else if (currentStatus.startsWith("error:")) {
          setError(currentStatus.replace("error:", ""));
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isRefreshing, fetchStatus]);

  const handleRefresh = async () => {
    setError(null);
    setIsRefreshing(true);

    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          // Already running
          return;
        }
        throw new Error(data.error || "Failed to trigger refresh");
      }

      if (data.status === "fresh") {
        setIsRefreshing(false);
        setStatus({
          status: "complete",
          isStale: false,
          lastRefresh: data.lastRefresh,
        });
      }
    } catch (err) {
      setIsRefreshing(false);
      setError(err instanceof Error ? err.message : "Failed to refresh");
    }
  };

  const isRunning = isRefreshing || status?.status === "running";
  const isComplete = status?.status === "complete";
  const hasError = error || status?.status?.startsWith("error:");

  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      <Button
        variant={hasError ? "destructive" : "outline"}
        size="sm"
        onClick={handleRefresh}
        disabled={isRunning}
        className="gap-2"
      >
        {isRunning ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            Refreshing...
          </>
        ) : hasError ? (
          <>
            <AlertCircle className="h-4 w-4" />
            Retry
          </>
        ) : isComplete ? (
          <>
            <Check className="h-4 w-4" />
            Refresh Data
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            Refresh Data
          </>
        )}
      </Button>
      {status?.lastRefresh && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Updated {formatTimeAgo(status.lastRefresh)}
          {status.isStale && " (stale)"}
        </div>
      )}
      {error && (
        <p className="text-xs text-destructive max-w-[200px] truncate">
          {error}
        </p>
      )}
    </div>
  );
}

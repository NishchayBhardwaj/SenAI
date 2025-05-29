"use client";

import { useState, useEffect } from "react";
import { getProcessingStats } from "../src/lib/redis";
import {
  ServerIcon,
  ArrowPathIcon,
  BoltIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

export default function RedisStatsDisplay() {
  const [stats, setStats] = useState({
    resumesProcessed: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cacheOperations: 0,
    cacheHitRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Function to fetch Redis stats
  const fetchStats = async () => {
    try {
      // Add a timeout for Redis operations
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Redis stats timeout")), 3000)
      );

      // Get Redis stats with timeout
      const statsPromise = getProcessingStats();

      // Return whichever finishes first
      const result = await Promise.race([statsPromise, timeoutPromise]);

      setStats(result);
      setLastUpdated(new Date());
      setError(null);
    } catch (error) {
      console.error("Failed to fetch Redis stats:", error);
      setError("Unable to fetch Redis statistics");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch stats on component mount and every 10 seconds
  useEffect(() => {
    fetchStats();

    // Set up auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchStats();
    }, 10000);

    // Clean up interval on component unmount
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 bg-github-canvas-subtle dark:bg-github-dark-canvas-subtle rounded-md flex items-center justify-center">
        <ArrowPathIcon className="h-5 w-5 animate-spin text-github-accent-fg dark:text-github-dark-accent-fg mr-2" />
        <span className="text-sm text-github-fg-muted dark:text-github-dark-fg-muted">
          Loading Redis statistics...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-github-danger-subtle dark:bg-github-dark-danger-subtle rounded-md border border-github-danger-muted dark:border-github-dark-danger-muted">
        <p className="text-sm text-github-danger-fg dark:text-github-dark-danger-fg flex items-center">
          <ServerIcon className="h-5 w-5 mr-2" />
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-github-canvas-subtle dark:bg-github-dark-canvas-subtle rounded-md p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-github-fg-default dark:text-github-dark-fg-default">
          Redis Cache Statistics
        </h3>
        <div className="flex items-center text-xs text-github-fg-muted dark:text-github-dark-fg-muted">
          <span>Auto-refresh: 10s</span>
          <div className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center p-2 bg-github-canvas-default dark:bg-github-dark-canvas-default rounded-md">
          <DocumentDuplicateIcon className="h-5 w-5 text-blue-500 mr-2" />
          <div>
            <p className="text-xs text-github-fg-muted dark:text-github-dark-fg-muted">
              Resumes Processed
            </p>
            <p className="text-sm font-medium">{stats.resumesProcessed}</p>
          </div>
        </div>

        <div className="flex items-center p-2 bg-github-canvas-default dark:bg-github-dark-canvas-default rounded-md">
          <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
          <div>
            <p className="text-xs text-github-fg-muted dark:text-github-dark-fg-muted">
              Cache Hits
            </p>
            <p className="text-sm font-medium">{stats.cacheHits}</p>
          </div>
        </div>

        <div className="flex items-center p-2 bg-github-canvas-default dark:bg-github-dark-canvas-default rounded-md">
          <BoltIcon className="h-5 w-5 text-amber-500 mr-2" />
          <div>
            <p className="text-xs text-github-fg-muted dark:text-github-dark-fg-muted">
              Hit Rate
            </p>
            <p className="text-sm font-medium">{stats.cacheHitRate}%</p>
          </div>
        </div>

        <div className="flex items-center p-2 bg-github-canvas-default dark:bg-github-dark-canvas-default rounded-md">
          <ServerIcon className="h-5 w-5 text-purple-500 mr-2" />
          <div>
            <p className="text-xs text-github-fg-muted dark:text-github-dark-fg-muted">
              Cache Operations
            </p>
            <p className="text-sm font-medium">{stats.cacheOperations}</p>
          </div>
        </div>
      </div>

      {lastUpdated && (
        <div className="mt-3 text-xs text-github-fg-muted dark:text-github-dark-fg-muted text-right">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

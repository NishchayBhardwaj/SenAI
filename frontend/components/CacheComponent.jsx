"use client";

import { useState, useEffect } from "react";
import { redis, incrementCounter } from "../src/lib/redis";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

export default function CacheComponent() {
  const [cacheKey, setCacheKey] = useState("");
  const [cacheValue, setCacheValue] = useState("");
  const [cachedData, setCachedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [lastOperation, setLastOperation] = useState(null);
  const [operationTime, setOperationTime] = useState(null);
  const [redisStatus, setRedisStatus] = useState("unknown"); // 'connected', 'error', 'unknown'

  // Fetch cached data on component mount
  useEffect(() => {
    checkRedisStatus();
    fetchCachedData();
  }, []);

  // Check if Redis is available
  const checkRedisStatus = async () => {
    try {
      // Set a timeout for the Redis operation
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Redis connection timed out")), 3000)
      );

      // Try to ping Redis
      const redisPromise = redis
        .set("system:ping", "pong", { ex: 60 })
        .then(() => redis.get("system:ping"));

      // Race between the Redis operation and the timeout
      const result = await Promise.race([redisPromise, timeoutPromise]);

      if (result === "pong") {
        setRedisStatus("connected");
      } else {
        setRedisStatus("error");
      }
    } catch (error) {
      console.error("Redis connectivity check failed:", error);
      setRedisStatus("error");
    }
  };

  // Function to store data in Redis
  const handleStore = async (e) => {
    e.preventDefault();
    if (!cacheKey || !cacheValue) return;

    setLoading(true);
    setLastOperation("store");
    const startTime = performance.now();

    try {
      // Set a timeout for the Redis operation
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Operation timed out")), 3000)
      );

      // Try to store in Redis with a timeout
      const redisPromise = redis
        .set(cacheKey, cacheValue, { ex: 3600 })
        .then(() => incrementCounter("cache_operations"));

      // Race between the Redis operation and the timeout
      await Promise.race([redisPromise, timeoutPromise]);

      // Update the UI
      setCachedData((prev) => [
        {
          key: cacheKey,
          value: cacheValue,
          timestamp: new Date().toISOString(),
        },
        ...prev.slice(0, 4), // Keep only the 5 most recent items
      ]);

      setCacheKey("");
      setCacheValue("");
      toast.success("Data stored successfully");

      const endTime = performance.now();
      setOperationTime(endTime - startTime);
      setRedisStatus("connected");
    } catch (error) {
      console.error("Error storing data:", error);
      toast.error(`Failed to store data: ${error.message}`);
      setRedisStatus("error");
    } finally {
      setLoading(false);
    }
  };

  // Function to retrieve all cached keys (for demo purposes)
  const fetchCachedData = async () => {
    setFetchLoading(true);
    setLastOperation("fetch");
    const startTime = performance.now();

    try {
      // This is just for demonstration - in a real app, you would need a more
      // sophisticated approach to list keys, as this is not directly supported
      // in the REST API

      // Try to fetch demo data if Redis is connected
      if (redisStatus === "connected") {
        try {
          // Set a timeout for the Redis operation
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Operation timed out")), 3000)
          );

          // Try to get a few sample keys
          const redisPromise = Promise.all([
            redis.get("resume:1234").catch(() => null),
            redis.get("task:5678").catch(() => null),
            redis.get("counter:resumes_processed").catch(() => null),
          ]);

          // Race between the Redis operation and the timeout
          const results = await Promise.race([redisPromise, timeoutPromise]);

          const demoData = [
            {
              key: "resume:1234",
              value: results[0] || "Cached resume data...",
              timestamp: new Date().toISOString(),
            },
            {
              key: "task:5678",
              value: results[1] || "Async task status",
              timestamp: new Date(Date.now() - 300000).toISOString(),
            },
            {
              key: "counter:resumes_processed",
              value: results[2] || "42",
              timestamp: new Date(Date.now() - 600000).toISOString(),
            },
          ];

          setCachedData(demoData);
        } catch (error) {
          // If fetching real data fails, show fallback demo data
          fallbackToDemoData();
        }
      } else {
        // If Redis is not connected, show fallback demo data
        fallbackToDemoData();
      }

      const endTime = performance.now();
      setOperationTime(endTime - startTime);
    } catch (error) {
      console.error("Error fetching cached data:", error);
      toast.error("Failed to fetch cache data");
      fallbackToDemoData();
    } finally {
      setFetchLoading(false);
    }
  };

  // Check if a specific resume is in the cache
  const checkResumeCache = async () => {
    if (!cacheKey) {
      toast.error("Please enter a resume key to check");
      return;
    }

    setLoading(true);
    setLastOperation("check");
    const startTime = performance.now();

    try {
      // Format the key properly if needed
      const resumeKey = cacheKey.startsWith("resume:")
        ? cacheKey
        : `resume:${cacheKey}`;

      // Set a timeout for the Redis operation
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Operation timed out")), 3000)
      );

      // Try to get the resume cache with timeout
      const redisPromise = redis.get(resumeKey);

      // Race between the Redis operation and the timeout
      const result = await Promise.race([redisPromise, timeoutPromise]);

      if (result) {
        toast.success(`Resume found in cache: ${resumeKey}`);

        // Add it to the displayed data
        setCachedData([
          {
            key: resumeKey,
            value:
              typeof result === "object"
                ? JSON.stringify(result).substring(0, 100) + "..."
                : String(result).substring(0, 100) + "...",
            timestamp: new Date().toISOString(),
          },
          ...cachedData.slice(0, 4),
        ]);
      } else {
        toast.error(`Resume not found in cache: ${resumeKey}`);
      }

      const endTime = performance.now();
      setOperationTime(endTime - startTime);
    } catch (error) {
      console.error("Error checking resume cache:", error);
      toast.error(`Failed to check cache: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fallback to demo data when Redis is unavailable
  const fallbackToDemoData = () => {
    const demoData = [
      {
        key: "resume:1234",
        value: "Cached resume data (demo)...",
        timestamp: new Date().toISOString(),
      },
      {
        key: "task:5678",
        value: "Async task status (demo)",
        timestamp: new Date(Date.now() - 300000).toISOString(),
      },
      {
        key: "counter:resumes_processed",
        value: "42 (demo)",
        timestamp: new Date(Date.now() - 600000).toISOString(),
      },
    ];

    setCachedData(demoData);
  };

  return (
    <div className="github-card p-6">
      <h2 className="text-xl font-semibold mb-4 text-github-fg-default dark:text-github-dark-fg-default">
        Redis Cache Explorer
      </h2>

      <div className="mb-6">
        <p className="text-sm text-github-fg-muted dark:text-github-dark-fg-muted mb-4">
          This component demonstrates the Redis caching capabilities of the
          application. Redis is used to cache parsed resume results and manage
          asynchronous processing tasks.
        </p>

        {/* Redis Status Indicator */}
        <div
          className={`text-sm p-2 rounded mb-4 ${
            redisStatus === "connected"
              ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400"
              : redisStatus === "error"
              ? "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"
              : "bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
          }`}
        >
          <div className="flex items-center">
            <div
              className={`w-2 h-2 rounded-full mr-2 ${
                redisStatus === "connected"
                  ? "bg-green-500"
                  : redisStatus === "error"
                  ? "bg-red-500"
                  : "bg-yellow-500"
              }`}
            ></div>
            <span>
              {redisStatus === "connected"
                ? "Redis connected"
                : redisStatus === "error"
                ? "Redis unavailable - using fallback mode"
                : "Redis connection status unknown"}
            </span>
          </div>
        </div>

        {lastOperation && operationTime && (
          <div className="text-sm bg-github-canvas-subtle dark:bg-github-dark-canvas-subtle p-2 rounded mb-4">
            Last {lastOperation} operation completed in{" "}
            <span className="font-medium text-github-accent-fg dark:text-github-dark-accent-fg">
              {operationTime.toFixed(2)}ms
            </span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleStore} className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-1">
            <label className="block text-sm font-medium mb-1">Cache Key</label>
            <input
              type="text"
              value={cacheKey}
              onChange={(e) => setCacheKey(e.target.value)}
              className="github-input w-full"
              placeholder="Enter key"
              required
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">
              Cache Value
            </label>
            <input
              type="text"
              value={cacheValue}
              onChange={(e) => setCacheValue(e.target.value)}
              className="github-input w-full"
              placeholder="Enter value"
              required
            />
          </div>
        </div>
        <div className="mt-4 flex space-x-3">
          <button
            type="submit"
            disabled={loading}
            className="btn-github-primary"
          >
            {loading ? "Storing..." : "Store in Redis"}
          </button>
          <button
            type="button"
            onClick={checkResumeCache}
            disabled={loading || !cacheKey}
            className="btn-github"
          >
            {loading ? "Checking..." : "Check Cache"}
          </button>
          <button
            type="button"
            onClick={() => {
              checkRedisStatus();
              fetchCachedData();
            }}
            disabled={fetchLoading}
            className="btn-github"
          >
            {fetchLoading ? "Fetching..." : "Refresh Cache Data"}
          </button>
        </div>
      </form>

      {/* Cached Data Display */}
      <div>
        <h3 className="text-lg font-medium mb-3">Cached Data</h3>
        {cachedData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-github-border-default dark:divide-github-dark-border-default">
              <thead className="bg-github-canvas-subtle dark:bg-github-dark-canvas-subtle">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-github-fg-muted dark:text-github-dark-fg-muted uppercase tracking-wider">
                    Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-github-fg-muted dark:text-github-dark-fg-muted uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-github-fg-muted dark:text-github-dark-fg-muted uppercase tracking-wider">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="bg-github-canvas-default dark:bg-github-dark-canvas-default divide-y divide-github-border-muted dark:divide-github-dark-border-muted">
                {cachedData.map((item, index) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="hover:bg-github-canvas-subtle dark:hover:bg-github-dark-canvas-subtle"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-github-fg-default dark:text-github-dark-fg-default">
                      {item.key}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-github-fg-muted dark:text-github-dark-fg-muted">
                      {item.value.length > 50
                        ? `${item.value.substring(0, 50)}...`
                        : item.value}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-github-fg-muted dark:text-github-dark-fg-muted">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 text-github-fg-muted dark:text-github-dark-fg-muted">
            No cached data available
          </div>
        )}
      </div>
    </div>
  );
}

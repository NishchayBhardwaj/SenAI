"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { redis } from "../src/lib/redis";
import { useEffect } from "react";

export default function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient());
  const [isRedisReady, setIsRedisReady] = useState(false);

  // Test Redis connection on component mount
  useEffect(() => {
    async function testRedisConnection() {
      try {
        // Add a timeout for Redis connection to prevent long loading times
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Redis connection timed out")),
            5000
          )
        );

        // Try to connect to Redis with a timeout
        const redisPromise = redis
          .set("system:ping", "pong", { ex: 60 })
          .then(() => redis.get("system:ping"));

        // Race between the Redis operation and the timeout
        const result = await Promise.race([redisPromise, timeoutPromise]);

        if (result === "pong") {
          console.log("✅ Redis connection successful!");
          setIsRedisReady(true);
        } else {
          console.warn(
            "⚠️ Redis connection established but unexpected response:",
            result
          );
          // Still proceed even if we get an unexpected response
          setIsRedisReady(true);
        }
      } catch (error) {
        console.error("⚠️ Redis connection failed:", error);
        // Proceed with the app even if Redis is not available
        setIsRedisReady(true);
      }
    }

    // Start testing Redis connection
    testRedisConnection();

    // Set a backup timer to proceed anyway after 3 seconds max
    const backupTimer = setTimeout(() => {
      if (!isRedisReady) {
        console.log(
          "⏱️ Redis connection backup timer elapsed, proceeding without Redis"
        );
        setIsRedisReady(true);
      }
    }, 3000);

    // Clean up the timer
    return () => clearTimeout(backupTimer);
  }, [isRedisReady]);

  // Show loading indicator while testing Redis connection
  if (!isRedisReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-github-canvas-default dark:bg-github-dark-canvas-default">
        <div className="text-center">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-github-accent-emphasis dark:border-github-dark-accent-emphasis rounded-full border-t-transparent"></div>
          <p className="mt-4 text-github-fg-default dark:text-github-dark-fg-default">
            Connecting to Redis...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <Toaster position="top-right" />
        {children}
      </QueryClientProvider>
    </>
  );
}

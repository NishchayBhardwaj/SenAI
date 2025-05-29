import { Redis } from "@upstash/redis";

// Initialize Redis client from environment variables
// This allows flexibility to use different credentials in development and production
const redis = new Redis({
  url:
    process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_URL ||
    "https://your-upstash-redis-url.upstash.io",
  token:
    process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_TOKEN ||
    "your-upstash-redis-token",
});

// Wrapper functions with fallbacks for when Redis is unavailable

// Cache resume parsing results for faster access
export async function cacheResumeResult(resumeId, parsedData) {
  if (!resumeId || !parsedData) return null;

  try {
    // Store the data with an expiration of 24 hours (86400 seconds)
    const key = `resume:${resumeId}`;

    // Make sure we're storing a string
    const dataToStore =
      typeof parsedData === "string" ? parsedData : JSON.stringify(parsedData);

    await redis.set(key, dataToStore, { ex: 86400 });

    // Increment the counter for cache operations
    await incrementCounter("cache_operations");
    return true;
  } catch (error) {
    console.warn("Redis caching failed:", error.message);
    return false;
  }
}

// Retrieve cached resume parsing results
export async function getCachedResumeResult(resumeId) {
  if (!resumeId) return null;

  try {
    const key = `resume:${resumeId}`;
    const cachedData = await redis.get(key);

    if (!cachedData) return null;

    try {
      // Check if the data is already an object (happens with Upstash Redis client)
      if (typeof cachedData === "object") {
        // Increment cache hit counter
        await incrementCounter("cache_hits");
        return cachedData;
      }

      // If it's a string, parse it
      await incrementCounter("cache_hits");
      return JSON.parse(cachedData);
    } catch (parseError) {
      console.error("Error parsing cached data:", parseError);
      // Increment cache miss counter in case of error
      await incrementCounter("cache_misses");
      return null;
    }
  } catch (error) {
    console.warn("Redis cache retrieval failed:", error.message);
    // Increment cache miss counter
    await incrementCounter("cache_misses");
    return null;
  }
}

// Queue a task for asynchronous processing
export async function queueResumeParsingTask(resumeFile, metadata = {}) {
  try {
    const taskId = `task:${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 10)}`;

    // Create a task entry with status "queued"
    const taskData = {
      id: taskId,
      status: "queued",
      file: {
        name: resumeFile.name,
        size: resumeFile.size,
        type: resumeFile.type,
      },
      metadata,
      queuedAt: new Date().toISOString(),
    };

    // Store the task in Redis with a 2-hour expiration
    await redis.set(taskId, JSON.stringify(taskData), { ex: 7200 });

    // Add to processing queue
    await redis.lpush("resume_parsing_queue", taskId);

    return taskId;
  } catch (error) {
    console.warn("Failed to queue task:", error.message);
    // Return a local ID even if Redis fails
    return `local:${Date.now()}`;
  }
}

// Get the status of an async task
export async function getTaskStatus(taskId) {
  try {
    const taskData = await redis.get(taskId);
    return taskData ? JSON.parse(taskData) : null;
  } catch (error) {
    console.warn("Failed to get task status:", error.message);
    return { status: "unknown", error: "Cache unavailable" };
  }
}

// Update the status of a task
export async function updateTaskStatus(taskId, status, result = null) {
  try {
    // Get the current task data
    const taskData = await redis.get(taskId);
    if (!taskData) return false;

    // Parse and update the task data
    const parsedData = JSON.parse(taskData);
    const updatedData = {
      ...parsedData,
      status,
      updatedAt: new Date().toISOString(),
    };

    // Add result data if provided
    if (result) {
      updatedData.result = result;
    }

    // Update the task in Redis
    await redis.set(taskId, JSON.stringify(updatedData), { ex: 7200 });
    return true;
  } catch (error) {
    console.warn("Failed to update task status:", error.message);
    return false;
  }
}

// Increment a counter in Redis
export async function incrementCounter(counterName) {
  try {
    return await redis.incr(`counter:${counterName}`);
  } catch (error) {
    console.warn("Failed to increment counter:", error.message);
    return 0;
  }
}

// Get stats for the dashboard
export async function getProcessingStats() {
  try {
    const pipeline = redis.pipeline();
    pipeline.get("counter:resumes_processed");
    pipeline.get("counter:cache_hits");
    pipeline.get("counter:cache_misses");
    pipeline.get("counter:cache_operations");

    const results = await pipeline.exec();

    return {
      resumesProcessed: parseInt(results[0] || "0"),
      cacheHits: parseInt(results[1] || "0"),
      cacheMisses: parseInt(results[2] || "0"),
      cacheOperations: parseInt(results[3] || "0"),
      cacheHitRate: calculateRate(
        parseInt(results[1] || "0"),
        parseInt(results[2] || "0")
      ),
    };
  } catch (error) {
    console.warn("Failed to get processing stats:", error.message);
    // Return fallback stats
    return {
      resumesProcessed: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cacheOperations: 0,
      cacheHitRate: 0,
    };
  }
}

// Helper function to calculate rate
function calculateRate(hits, misses) {
  const total = hits + misses;
  if (total === 0) return 0;
  return Math.round((hits / total) * 100);
}

// Export the Redis instance for direct use
export { redis };

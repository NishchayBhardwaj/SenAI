"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { resumeApi } from "../src/lib/api";
import { getProcessingStats } from "../src/lib/redis";
import {
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BoltIcon,
  DocumentDuplicateIcon,
  QueueListIcon,
  ServerIcon,
} from "@heroicons/react/24/outline";

const StatCard = ({ title, value, icon: Icon, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="github-card p-6"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-github-fg-muted dark:text-github-dark-fg-muted">
          {title}
        </p>
        <h3 className="text-2xl font-semibold mt-1 text-github-fg-default dark:text-github-dark-fg-default">
          {value}
        </h3>
      </div>
      <div className={`p-3 rounded-full ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
    </div>
  </motion.div>
);

export default function DashboardStats() {
  // Fetch candidate statistics
  const {
    data: candidates,
    isLoading: isCandidatesLoading,
    error: candidatesError,
  } = useQuery({
    queryKey: ["candidates-stats"],
    queryFn: () => resumeApi.getCandidatesStats(),
    retry: 2,
    // If API fails, use fallback data
    onError: (error) => {
      console.error("Failed to fetch candidate stats:", error);
      return {
        total: 0,
        shortlisted: 0,
        rejected: 0,
        pending: 0,
      };
    },
  });

  // Fetch Redis processing statistics
  const {
    data: redisStats,
    isLoading: isRedisLoading,
    error: redisError,
  } = useQuery({
    queryKey: ["redis-stats"],
    queryFn: async () => {
      try {
        // Add a timeout for Redis operation
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Redis stats timeout")), 3000)
        );

        // Get Redis stats with timeout
        const statsPromise = getProcessingStats();

        // Return whichever finishes first
        return await Promise.race([statsPromise, timeoutPromise]);
      } catch (error) {
        console.error("Redis stats error:", error);
        // Return fallback data if Redis is unavailable
        return {
          resumesProcessed: 0,
          cacheHits: 0,
          cacheMisses: 0,
          cacheOperations: 0,
          cacheHitRate: 0,
        };
      }
    },
    retry: 1,
    staleTime: 30000, // 30 seconds
  });

  // Get fallback values for candidates if loading or error
  const candidateStats = candidates || {
    total: 0,
    shortlisted: 0,
    rejected: 0,
    pending: 0,
  };

  // Get fallback values for Redis stats if loading or error
  const processingStats = redisStats || {
    resumesProcessed: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cacheOperations: 0,
    cacheHitRate: 0,
  };

  // Display loading indicator or error message
  if (isCandidatesLoading && isRedisLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="github-card p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="w-2/3">
                <div className="h-3 bg-github-border-muted dark:bg-github-dark-border-muted rounded w-3/4"></div>
                <div className="h-6 bg-github-border-muted dark:bg-github-dark-border-muted rounded mt-2 w-1/2"></div>
              </div>
              <div className="h-12 w-12 bg-github-border-muted dark:bg-github-dark-border-muted rounded-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Display a warning if Redis is unavailable
  const showRedisWarning = redisError && !isRedisLoading;

  return (
    <>
      {showRedisWarning && (
        <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800/30 dark:text-yellow-400">
          <div className="flex items-start">
            <ServerIcon className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Redis connection issue</p>
              <p className="text-sm mt-1">
                Redis caching service is currently unavailable. The application
                will continue to work without caching functionality, but
                performance may be affected.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Candidate Stats */}
        <StatCard
          title="Total Candidates"
          value={candidateStats.total.toLocaleString()}
          icon={UserGroupIcon}
          color="bg-indigo-600"
          delay={0.1}
        />
        <StatCard
          title="Shortlisted"
          value={candidateStats.shortlisted.toLocaleString()}
          icon={CheckCircleIcon}
          color="bg-green-600"
          delay={0.2}
        />
        <StatCard
          title="Rejected"
          value={candidateStats.rejected.toLocaleString()}
          icon={XCircleIcon}
          color="bg-red-600"
          delay={0.3}
        />
        <StatCard
          title="Pending Review"
          value={candidateStats.pending.toLocaleString()}
          icon={ClockIcon}
          color="bg-amber-600"
          delay={0.4}
        />

        {/* Processing Stats */}
        <StatCard
          title="Resumes Processed"
          value={processingStats.resumesProcessed.toLocaleString()}
          icon={DocumentDuplicateIcon}
          color="bg-blue-600"
          delay={0.5}
        />
        <StatCard
          title="Cache Operations"
          value={processingStats.cacheOperations.toLocaleString()}
          icon={QueueListIcon}
          color="bg-purple-600"
          delay={0.6}
        />
        <StatCard
          title="Cache Hit Rate"
          value={`${processingStats.cacheHitRate}%`}
          icon={BoltIcon}
          color="bg-teal-600"
          delay={0.7}
        />
        <StatCard
          title="Cache Hits"
          value={processingStats.cacheHits.toLocaleString()}
          icon={ServerIcon}
          color="bg-cyan-600"
          delay={0.8}
        />
      </div>
    </>
  );
}

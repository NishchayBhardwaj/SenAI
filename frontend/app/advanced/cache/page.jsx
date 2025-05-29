"use client";

import React from "react";
import dynamic from "next/dynamic";
import ProtectedZone from "../../../components/Protected";
import { useRouteProtection } from "../../../src/lib/routes";

// Dynamically import the components to avoid SSR issues
const CacheComponent = dynamic(
  () => import("../../../components/CacheComponent"),
  {
    ssr: false,
  }
);

export default function CachePage() {
  // Use route protection to verify authentication
  useRouteProtection();

  return (
    <ProtectedZone>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">
            Redis-Powered Caching & Async Processing
          </h1>
          <p className="text-lg text-gray-200 max-w-3xl">
            Our application uses Redis to enhance performance and scalability
            through intelligent caching and asynchronous task processing.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Cache Component */}
          <CacheComponent />

          {/* Architecture Explanation */}
          <div className="github-card p-6">
            <h2 className="text-xl font-semibold mb-4 text-github-fg-default dark:text-github-dark-fg-default">
              Redis Architecture Overview
            </h2>

            <div className="prose max-w-none">
              <p>
                Our application leverages Redis for several key functions that
                enhance performance and user experience:
              </p>

              <h3>1. Resume Parsing Cache</h3>
              <p>
                When a resume is parsed, the results are cached in Redis with a
                unique key based on the file content. If the same resume is
                uploaded again, the system retrieves the cached result instead
                of re-parsing, which significantly reduces processing time and
                server load.
              </p>

              <h3>2. Asynchronous Task Queue</h3>
              <p>
                For batch processing of multiple resumes, we use Redis as a
                queue. Tasks are added to the queue and processed
                asynchronously, allowing users to continue using the application
                without waiting for the parsing to complete. The task status is
                regularly updated in Redis.
              </p>

              <h3>3. Performance Metrics</h3>
              <p>
                Redis counters track key performance metrics like the number of
                resumes processed, success rates, and cache hit ratios. These
                metrics help optimize the system and provide transparency to
                administrators.
              </p>

              <h3>Technical Implementation</h3>
              <p>We use Upstash's serverless Redis service, which provides:</p>
              <ul>
                <li>REST API access to Redis functionality</li>
                <li>Global distribution for low-latency access</li>
                <li>No server management overhead</li>
                <li>Cost-effective pay-per-use model</li>
              </ul>

              <p>
                The integration is lightweight and doesn't require running a
                separate Redis server, making deployment simpler.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedZone>
  );
}

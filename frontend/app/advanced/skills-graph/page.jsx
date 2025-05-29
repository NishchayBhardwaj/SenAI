"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { resumeApi } from "../../../src/lib/api";
import ProtectedZone from "../../../components/Protected";
import { useRouteProtection } from "../../../src/lib/routes";
import SkillGraphVisualizer from "../../../components/SkillGraphVisualizer";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

export default function SkillsGraphPage() {
  // Use route protection to verify authentication
  useRouteProtection();

  // Fetch all candidates for the skills graph
  const {
    data: candidates,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["candidates-for-skills-graph"],
    queryFn: () => resumeApi.getCandidates({ limit: 500 }),
  });

  return (
    <ProtectedZone>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Skills Co-occurrence Graph
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl">
            This visualization shows how skills appear together across
            candidates' resumes, helping identify skill clusters, common
            combinations, and potential skill gaps in your talent pool.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-96">
            <ArrowPathIcon className="h-12 w-12 animate-spin text-indigo-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4">
            <p>
              Error loading candidate data: {error.message || "Unknown error"}
            </p>
          </div>
        ) : (
          <SkillGraphVisualizer candidates={candidates || []} />
        )}

        <div className="mt-12 bg-indigo-50 border border-indigo-100 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-indigo-900 mb-4">
            Understanding the Skills Graph
          </h2>
          <div className="space-y-4 text-indigo-800">
            <div>
              <h3 className="font-medium text-lg">Graph Elements</h3>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li>
                  <strong>Nodes:</strong> Each node represents a skill found in
                  candidate resumes. Larger nodes indicate more common skills.
                </li>
                <li>
                  <strong>Connections:</strong> Lines between skills show how
                  often they appear together. Thicker lines mean stronger
                  co-occurrence.
                </li>
                <li>
                  <strong>Colors:</strong> Skills are color-coded by category
                  for easier identification.
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-lg">Strategic Use Cases</h3>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li>
                  <strong>Identify skill clusters:</strong> Closely related
                  groups of skills often indicate specialized roles or domains.
                </li>
                <li>
                  <strong>Spot skill gaps:</strong> Missing connections between
                  otherwise related skills can highlight training opportunities.
                </li>
                <li>
                  <strong>Hiring planning:</strong> Understand which
                  complementary skills to look for when hiring for specific
                  positions.
                </li>
                <li>
                  <strong>Training programs:</strong> Design training
                  initiatives around skill clusters to create well-rounded
                  expertise.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ProtectedZone>
  );
}

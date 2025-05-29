"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { resumeApi } from "@/src/lib/api";
import {
  ChevronUpIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export default function Candidateslist() {
  const [selectedStatus, setSelectedStatus] = useState("");
  const [searchId, setSearchId] = useState("");
  const [searchedCandidate, setSearchedCandidate] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const queryClient = useQueryClient();

  // Fetch candidates
  const {
    data: candidates,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => resumeApi.getCandidates(100),
  });

  // Filter candidates on the client side
  const filteredCandidates = useMemo(() => {
    if (!candidates) return [];
    if (!selectedStatus) return candidates;
    return candidates.filter(
      (candidate) => candidate.status === selectedStatus
    );
  }, [candidates, selectedStatus]);

  // Determine which candidates to display
  const displayCandidates = searchedCandidate
    ? [searchedCandidate]
    : filteredCandidates;

  // Shortlist mutation
  const shortlist = useMutation({
    mutationFn: (candidateId) => resumeApi.shortlistCandidate(candidateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      toast.success("Candidate shortlisted successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to shortlist candidate");
    },
  });

  // Unshortlist mutation
  const unshortlist = useMutation({
    mutationFn: (candidateId) => resumeApi.unshortlistCandidate(candidateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      toast.success("Candidate removed from shortlist");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove candidate from shortlist");
    },
  });

  // Search candidate by ID
  const handleSearch = async () => {
    if (!searchId || isNaN(parseInt(searchId))) {
      toast.error("Please enter a valid candidate ID");
      return;
    }

    setIsSearching(true);
    try {
      const candidate = await resumeApi.getCandidate(parseInt(searchId));
      setSearchedCandidate(candidate);
    } catch (error) {
      console.error("Error searching candidate:", error);
      toast.error("Candidate not found");
      setSearchedCandidate(null);
    } finally {
      setIsSearching(false);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchId("");
    setSearchedCandidate(null);
  };

  if (error) {
    return (
      <div className="text-github-danger-fg dark:text-github-dark-danger-fg text-center py-4">
        Error loading candidates:{" "}
        {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  const statusBadgeColors = {
    pending:
      "bg-github-neutral-muted dark:bg-github-dark-neutral-muted text-github-fg-default dark:text-github-dark-fg-default",
    shortlisted:
      "bg-github-success-subtle dark:bg-github-dark-success-subtle text-github-success-fg dark:text-github-dark-success-fg border border-github-success-muted dark:border-github-dark-success-muted",
    rejected:
      "bg-github-danger-subtle dark:bg-github-dark-danger-subtle text-github-danger-fg dark:text-github-dark-danger-fg border border-github-danger-muted dark:border-github-dark-danger-muted",
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-github-fg-default dark:text-github-dark-fg-default mb-4">
          Candidate Database
        </h2>

        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          {/* Status Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-github-fg-default dark:text-github-dark-fg-default mb-2">
              Filter by Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setSearchedCandidate(null);
                setSearchId("");
              }}
              className="github-input w-full md:max-w-xs text-sm"
              disabled={searchedCandidate !== null}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Search by ID */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-github-fg-default dark:text-github-dark-fg-default mb-2">
              Search by Candidate ID
            </label>
            <div className="flex">
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="Enter candidate ID"
                className="github-input w-full md:max-w-xs text-sm"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="ml-2 btn-github-primary text-sm"
              >
                {isSearching ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  <MagnifyingGlassIcon className="h-4 w-4" />
                )}
              </button>
              {searchedCandidate && (
                <button
                  onClick={clearSearch}
                  className="ml-2 btn-github text-sm"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search Results Banner */}
      {searchedCandidate && (
        <div className="mb-4 p-3 bg-github-accent-subtle dark:bg-github-dark-accent-subtle rounded-md border border-github-accent-muted dark:border-github-dark-accent-muted text-github-accent-fg dark:text-github-dark-accent-fg flex justify-between items-center">
          <span>
            Showing search result for Candidate ID: <strong>{searchId}</strong>
          </span>
          <button
            onClick={clearSearch}
            className="text-github-accent-fg dark:text-github-dark-accent-fg hover:text-github-fg-default dark:hover:text-github-dark-fg-default"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Candidates Table */}
      <div className="overflow-x-auto rounded-md border border-github-border-default dark:border-github-dark-border-default">
        <table className="min-w-full divide-y divide-github-border-default dark:divide-github-dark-border-default">
          <thead className="bg-github-canvas-subtle dark:bg-github-dark-canvas-subtle">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-github-fg-muted dark:text-github-dark-fg-muted uppercase tracking-wider"
              >
                ID
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-github-fg-muted dark:text-github-dark-fg-muted uppercase tracking-wider"
              >
                Name
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-github-fg-muted dark:text-github-dark-fg-muted uppercase tracking-wider"
              >
                Email
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-github-fg-muted dark:text-github-dark-fg-muted uppercase tracking-wider"
              >
                Years Exp
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-github-fg-muted dark:text-github-dark-fg-muted uppercase tracking-wider"
              >
                Skills
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-github-fg-muted dark:text-github-dark-fg-muted uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-github-fg-muted dark:text-github-dark-fg-muted uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-github-canvas-default dark:bg-github-dark-canvas-default divide-y divide-github-border-muted dark:divide-github-dark-border-muted">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center">
                  <div className="flex justify-center">
                    <svg
                      className="animate-spin h-5 w-5 text-github-accent-emphasis dark:text-github-dark-accent-emphasis"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                </td>
              </tr>
            ) : displayCandidates && displayCandidates.length > 0 ? (
              displayCandidates.map((candidate) => (
                <tr
                  key={candidate.candidate_id}
                  className="hover:bg-github-canvas-subtle dark:hover:bg-github-dark-canvas-subtle"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-github-fg-default dark:text-github-dark-fg-default">
                    {candidate.candidate_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-github-fg-default dark:text-github-dark-fg-default font-medium">
                    {candidate.full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-github-fg-muted dark:text-github-dark-fg-muted">
                    {candidate.email || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-github-fg-muted dark:text-github-dark-fg-muted">
                    {candidate.years_experience || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-sm text-github-fg-muted dark:text-github-dark-fg-muted">
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {/* Display "No skills listed" if no skills are available */}
                      {!candidate.skills || candidate.skills.length === 0 ? (
                        <span className="text-sm text-github-fg-muted dark:text-github-dark-fg-muted">
                          No skills listed
                        </span>
                      ) : (
                        /* If there are skills, display up to 5 of them */
                        <>
                          {candidate.skills.slice(0, 5).map((skill, idx) => {
                            const skillName =
                              typeof skill === "object" && skill !== null
                                ? skill.skill_name || "Unknown"
                                : typeof skill === "string"
                                ? skill
                                : "Unknown";

                            return (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-github-accent-subtle dark:bg-github-dark-accent-subtle text-github-accent-fg dark:text-github-dark-accent-fg border border-github-accent-muted dark:border-github-dark-accent-muted"
                                title={skillName}
                              >
                                {skillName}
                              </span>
                            );
                          })}

                          {/* Show the "+X more" badge if there are more than 5 skills */}
                          {candidate.skills.length > 5 && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-github-neutral-muted dark:bg-github-dark-neutral-muted">
                              +{candidate.skills.length - 5} more
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        statusBadgeColors[candidate.status]
                      }`}
                    >
                      {candidate.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {candidate.status === "shortlisted" ? (
                      <button
                        onClick={() =>
                          unshortlist.mutate(candidate.candidate_id)
                        }
                        disabled={unshortlist.isPending}
                        className="btn-github text-sm hover:bg-github-danger-subtle dark:hover:bg-github-dark-danger-subtle hover:text-github-danger-fg dark:hover:text-github-dark-danger-fg"
                      >
                        {unshortlist.isPending &&
                        unshortlist.variables === candidate.candidate_id ? (
                          <ChevronUpIcon className="animate-bounce h-4 w-4" />
                        ) : (
                          <>
                            <XMarkIcon className="h-4 w-4 inline mr-1" />
                            Unshortlist
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => shortlist.mutate(candidate.candidate_id)}
                        disabled={shortlist.isPending}
                        className={`btn-github text-sm hover:bg-github-success-subtle dark:hover:bg-github-dark-success-subtle hover:text-github-success-fg dark:hover:text-github-dark-success-fg`}
                      >
                        {shortlist.isPending &&
                        shortlist.variables === candidate.candidate_id ? (
                          <ChevronUpIcon className="animate-bounce h-4 w-4" />
                        ) : (
                          "Shortlist"
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-4 text-center text-sm text-github-fg-muted dark:text-github-dark-fg-muted"
                >
                  No candidates found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

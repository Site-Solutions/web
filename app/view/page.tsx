"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

export default function ViewPage() {
  const { user: clerkUser } = useUser();
  const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Get current logged in user
  const user = useQuery(api.users.getCurrentUser);
  const organizationId = user?.organizationIds?.[0]?.organizationId;

  // Get projects for the organization
  const projects = useQuery(
    api.projects.getProjectsForCurrentUser,
    organizationId ? { organizationId } : "skip"
  );

  // Get selected project details
  const selectedProject = useQuery(
    api.projects.getProject,
    selectedProjectId ? { projectId: selectedProjectId } : "skip"
  );

  // Search results - only query when user searches
  const searchResults = useQuery(
    api.search.searchAddressesOrWOIDs,
    selectedProjectId && debouncedSearchTerm.length >= 2
      ? {
        projectId: selectedProjectId,
        searchTerm: debouncedSearchTerm,
      }
      : "skip"
  );

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status?: string) => {
    const statusColors: Record<string, string> = {
      complete: "bg-green-100 text-green-800",
      incomplete: "bg-yellow-100 text-yellow-800",
      void: "bg-red-100 text-red-800",
    };
    const color = statusColors[status || ""] || "bg-gray-100 text-gray-800";
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown"}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Address & WOID Search
        </h1>

        {/* Project Selection */}
        <div className="mb-6">
          <label
            htmlFor="project"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Select Project <span className="text-red-500">*</span>
          </label>
          <select
            id="project"
            value={selectedProjectId || ""}
            onChange={(e) => {
              setSelectedProjectId(e.target.value as Id<"projects"> | null);
              setSearchTerm(""); // Clear search when changing projects
            }}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900"
            disabled={!organizationId || projects === undefined}
          >
            <option value="">
              {!organizationId
                ? "Loading user..."
                : projects === undefined
                  ? "Loading projects..."
                  : projects.length === 0
                    ? "No projects available"
                    : "Select a project..."}
            </option>
            {projects?.map((project: { _id: Id<"projects">; name: string }) => (
              <option key={project._id} value={project._id}>
                {project.name}
              </option>
            ))}
          </select>
          {selectedProject?.completingTeamId && (
            <p className="mt-2 text-sm text-blue-600">
              Completing team configured for completion tracking
            </p>
          )}
        </div>

        {/* Search Box */}
        {selectedProjectId && (
          <div className="mb-6">
            <label
              htmlFor="search"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Search by Address or WOID
            </label>
            <input
              id="search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Type at least 2 characters to search..."
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 text-lg"
            />
            {searchTerm.length > 0 && searchTerm.length < 2 && (
              <p className="mt-1 text-sm text-gray-500">
                Type at least 2 characters to search
              </p>
            )}
          </div>
        )}

        {/* Search Results */}
        {searchResults && searchResults.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Found {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
            </h2>
            <div className="space-y-3">
              {searchResults.map((result: any, index: number) => (
                <Link
                  key={`${result.address}-${index}`}
                  href={`/address-history?address=${encodeURIComponent(result.address)}&projectId=${result.projectId}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-purple-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {result.address}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span>
                          <strong>{result.woidCount}</strong> WOID{result.woidCount !== 1 ? "s" : ""}
                        </span>
                        <span>
                          <strong>{result.teamCount}</strong> Team{result.teamCount !== 1 ? "s" : ""}
                        </span>
                        <span>
                          <strong>{result.reportCount}</strong> Report{result.reportCount !== 1 ? "s" : ""}
                        </span>
                        {result.ticketCount > 0 && (
                          <span>
                            <strong>{result.ticketCount}</strong> Ticket{result.ticketCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      {result.woidCount <= 3 && (
                        <div className="mt-2 text-xs text-gray-500">
                          WOIDs: {result.woids.join(", ")}
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex flex-col items-end gap-2">
                      {result.latestStatus && getStatusBadge(result.latestStatus)}
                      {result.latestReportDate && (
                        <span className="text-xs text-gray-500">
                          {formatDate(result.latestReportDate)}
                        </span>
                      )}
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {searchResults && searchResults.length === 0 && debouncedSearchTerm.length >= 2 && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try searching with a different address or WOID
            </p>
          </div>
        )}

        {/* Empty State */}
        {!selectedProjectId && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Select a project to get started
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Choose a project above to search for addresses and WOIDs
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


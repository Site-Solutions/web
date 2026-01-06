"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export default function SearchPage() {
  const { user: clerkUser } = useUser();
  const [searchAddress, setSearchAddress] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Get current logged in user (uses auth context)
  const user = useQuery(api.users.getCurrentUser);

  // Get organization ID from user
  const organizationId = user?.organizationIds?.[0]?.organizationId;

  // Debug logging
  console.log("Search Page Debug:", {
    user: user ? { id: user._id, orgs: user.organizationIds } : null,
    organizationId,
    clerkUser: clerkUser ? { id: clerkUser.id, email: clerkUser.emailAddresses?.[0]?.emailAddress } : null,
  });

  // Get projects for the organization
  const projects = useQuery(
    api.projects.getProjectsForCurrentUser,
    organizationId
      ? {
        organizationId,
      }
      : "skip"
  );

  console.log("Projects:", projects);

  // Search results
  const searchResults = useQuery(
    api.addressSearch.searchByAddress,
    selectedProjectId && searchQuery
      ? {
        address: searchQuery,
        projectId: selectedProjectId,
      }
      : "skip"
  );

  const handleSearch = () => {
    if (searchAddress.trim() && selectedProjectId) {
      setSearchQuery(searchAddress.trim());
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatStatus = (status: string) => {
    const statusColors: Record<string, string> = {
      complete: "bg-green-100 text-green-800",
      incomplete: "bg-yellow-100 text-yellow-800",
      "in progress": "bg-blue-100 text-blue-800",
      "not started": "bg-gray-100 text-gray-800",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status.toLowerCase()] || "bg-gray-100 text-gray-800"
          }`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Address Search</h1>

          {/* Search Form */}
          <div className="mb-8 space-y-4">
            <div>
              <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-2">
                Select Project
              </label>
              <select
                id="project"
                value={selectedProjectId || ""}
                onChange={(e) => setSelectedProjectId(e.target.value as Id<"projects"> | null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
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
              {user && !organizationId && (
                <p className="mt-2 text-sm text-yellow-600">
                  User is not associated with any organization.
                </p>
              )}
              {organizationId && projects && projects.length === 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  No projects found for your organization.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                Search Address
              </label>
              <div className="flex gap-2">
                <input
                  id="address"
                  type="text"
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Enter address..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                />
                <button
                  onClick={handleSearch}
                  disabled={!searchAddress.trim() || !selectedProjectId}
                  className="px-6 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Search
                </button>
              </div>
            </div>
          </div>

          {/* Search Results */}
          {searchQuery && (
            <div className="mt-8">
              {searchResults === undefined ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
                  <p className="mt-2 text-gray-600">Loading...</p>
                </div>
              ) : searchResults?.woids.length === 0 && searchResults?.tickets.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  <p>No results found for &quot;{searchQuery}&quot;</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* WOIDs Section */}
                  {searchResults?.woids && searchResults.woids.length > 0 && (
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        Work Orders ({searchResults.woids.length})
                      </h2>
                      <div className="space-y-4">
                        {searchResults.woids.map(
                          (
                            woidData: {
                              woid: string;
                              address: string;
                              teams: {
                                taskForceName: string;
                                lastUpdated: number;
                                status: string;
                              }[];
                            }
                          ) => (
                            <div
                              key={woidData.woid}
                              className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm"
                            >
                              <div className="flex items-center justify-between mb-4">
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900">
                                    WOID: {woidData.woid}
                                  </h3>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Address: {woidData.address}
                                  </p>
                                </div>
                              </div>

                              {/* Teams */}
                              {woidData.teams.length > 0 ? (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">Teams:</h4>
                                  <div className="space-y-2">
                                    {woidData.teams.map((team, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                                      >
                                        <div>
                                          <p className="font-medium text-gray-900">
                                            {team.taskForceName}
                                          </p>
                                          <p className="text-xs text-gray-500 mt-1">
                                            Last updated: {formatDate(team.lastUpdated)}
                                          </p>
                                        </div>
                                        {formatStatus(team.status)}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">No teams assigned</p>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Tickets Section */}
                  {searchResults?.tickets && searchResults.tickets.length > 0 && (
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        Tickets ({searchResults.tickets.length})
                      </h2>
                      <div className="space-y-4">
                        {searchResults.tickets.map(
                          (
                            ticket: {
                              ticketId: string;
                              assignedDate: number;
                              woids: string[];
                            }
                          ) => (
                            <div
                              key={ticket.ticketId}
                              className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900">
                                    {ticket.ticketId}
                                  </h3>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Assigned: {formatDate(ticket.assignedDate)}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    WOIDs: {ticket.woids.join(", ")}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


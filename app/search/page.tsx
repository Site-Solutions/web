"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Image from "next/image";

export default function SearchPage() {
  const { user: clerkUser } = useUser();
  const router = useRouter();
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

  // Search results - simplified view
  const searchResults = useQuery(
    api.addressSearch.searchSimplified,
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
              ) : !searchResults || searchResults.length === 0 ? (
                <div className="text-center py-12">
                  <Image
                    src="/images/undraw_empty.svg"
                    alt="No results"
                    width={200}
                    height={200}
                    className="mx-auto mb-6 opacity-50"
                  />
                  <p className="text-xl font-medium text-gray-700 mb-2">No results found</p>
                  <p className="text-gray-500">No results found for &quot;{searchQuery}&quot;</p>
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Search Results ({searchResults.length})
                  </h2>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Address
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            WOID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Latest Ticket
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Utility Statuses
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {searchResults.map((row: {
                          address: string;
                          woid: string;
                          latestTicket: {
                            ticketId: string;
                            createdAt: number;
                            utilityStatuses: { utilityCompany: string; status: string; updateDate: number }[];
                          } | null;
                        }) => (
                          <tr
                            key={`${row.address}-${row.woid}`}
                            onClick={() =>
                              router.push(
                                `/search/detail?address=${encodeURIComponent(row.address)}&woid=${encodeURIComponent(row.woid)}&projectId=${selectedProjectId}`
                              )
                            }
                            className="hover:bg-purple-50 cursor-pointer transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {row.address}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row.woid}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row.latestTicket ? (
                                <div>
                                  <div className="font-medium text-purple-600">{row.latestTicket.ticketId}</div>
                                  <div className="text-xs text-gray-500">
                                    {formatDate(row.latestTicket.createdAt)}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400">No tickets</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {row.latestTicket && row.latestTicket.utilityStatuses.length > 0 ? (
                                <div className="space-y-1">
                                  {row.latestTicket.utilityStatuses.map((utility, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      <span className="font-medium text-xs">{utility.utilityCompany}:</span>
                                      <span className="text-xs text-gray-600">{utility.status}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400">No updates</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

export default function ViewPage() {
  const { user: clerkUser } = useUser();
  const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | null>(null);
  const [searchWOID, setSearchWOID] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Get current logged in user (uses auth context)
  const user = useQuery(api.users.getCurrentUser);

  // Get organization ID from user
  const organizationId = user?.organizationIds?.[0]?.organizationId;

  // Get projects for the organization
  const projects = useQuery(
    api.projects.getProjectsForCurrentUser,
    organizationId
      ? {
        organizationId,
      }
      : "skip"
  );

  // Get selected project details (including completing team)
  const selectedProject = useQuery(
    api.projects.getProject,
    selectedProjectId ? { projectId: selectedProjectId } : "skip"
  );

  // Get all WOID data with teams and tickets
  const woidData = useQuery(
    api.woidAssignments.getAllWithDetails,
    selectedProjectId
      ? {
        projectId: selectedProjectId,
      }
      : "skip"
  );

  // Get dailyReports for searched WOID
  const searchedReports = useQuery(
    api.woidAssignments.getDailyReportsByWOID,
    selectedProjectId && searchQuery
      ? {
        workOrderId: searchQuery,
        projectId: selectedProjectId,
      }
      : "skip"
  );

  const handleSearch = () => {
    if (searchWOID.trim() && selectedProjectId) {
      setSearchQuery(searchWOID.trim());
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
      void: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || "bg-gray-100 text-gray-800"
          }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">WOID Assignments View</h1>

        <div className="space-y-6">
          {/* Project Selection */}
          <div>
            <label
              htmlFor="project"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Select Project <span className="text-red-500">*</span>
            </label>
            <select
              id="project"
              value={selectedProjectId || ""}
              onChange={(e) =>
                setSelectedProjectId(e.target.value as Id<"projects"> | null)
              }
              className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900 text-sm font-medium"
              style={{
                color: selectedProjectId ? "#111827" : "#6B7280",
              }}
              disabled={!organizationId || projects === undefined}
            >
              <option value="" className="text-gray-500">
                {!organizationId
                  ? "Loading user..."
                  : projects === undefined
                    ? "Loading projects..."
                    : projects.length === 0
                      ? "No projects available"
                      : "Select a project..."}
              </option>
              {projects?.map((project: { _id: Id<"projects">; name: string }) => (
                <option key={project._id} value={project._id} className="text-gray-900">
                  {project.name}
                </option>
              ))}
            </select>
            {selectedProjectId && projects && (
              <p className="mt-2 text-sm text-gray-600">
                Selected:{" "}
                <span className="font-semibold text-gray-900">
                  {projects.find(
                    (p: { _id: Id<"projects">; name: string }) =>
                      p._id === selectedProjectId
                  )?.name}
                </span>
              </p>
            )}

            {/* WOID Search */}
            <div className="mt-4">
              <label
                htmlFor="woid-search"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Search for WOID Daily Reports
              </label>
              <div className="flex gap-2">
                <input
                  id="woid-search"
                  type="text"
                  value={searchWOID}
                  onChange={(e) => setSearchWOID(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Enter WOID to search..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  disabled={!selectedProjectId}
                />
                <button
                  onClick={handleSearch}
                  disabled={!selectedProjectId || !searchWOID.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Search
                </button>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchWOID("");
                      setSearchQuery("");
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Search Results */}
          {searchQuery && searchedReports !== undefined && (
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Daily Reports for WOID: {searchQuery}
              </h2>
              {searchedReports && searchedReports.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                          Task Order ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                          Task Force ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Work Order ID
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {searchedReports.map(
                        (
                          report: {
                            _id: string;
                            taskOrderId: string;
                            taskForceId?: string;
                            completionStatus: string;
                            date: number;
                            workOrderId: string;
                          },
                          index: number
                        ) => (
                          <tr key={report._id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">
                              {report.taskOrderId}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-300">
                              {report.taskForceId || <span className="text-gray-400 italic">None</span>}
                            </td>
                            <td className="px-4 py-3 text-sm border-r border-gray-300">
                              {formatStatus(report.completionStatus)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">
                              {formatDate(report.date)}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {report.workOrderId}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">No daily reports found for WOID: {searchQuery}</p>
              )}
            </div>
          )}

          {/* Main Data Table - only show when not searching */}
          {!searchQuery && woidData && woidData.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                      WOID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                      Teams
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                      Date of Completion
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tickets
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {woidData.map(
                    (
                      addressData: {
                        address: string;
                        woids: {
                          workOrderId: string;
                          teams: {
                            taskForceId: string;
                            taskForceName: string;
                            status?: string;
                            completionDate?: number;
                          }[];
                        }[];
                        projectName: string;
                        tickets: { ticketId: string; creationDate: number }[];
                      },
                      addressIndex: number
                    ) => {
                      // Check if any team under this address has void status
                      const hasVoidTeam = addressData.woids.some(woid =>
                        woid.teams.some(team => team.status?.toLowerCase() === "void")
                      );

                      // Check if the completing team is complete
                      const completingTeamId = selectedProject?.completingTeamId;
                      const isAddressComplete = completingTeamId
                        ? addressData.woids.some(woid =>
                          woid.teams.some(
                            team =>
                              team.taskForceId === completingTeamId &&
                              team.status?.toLowerCase() === "complete"
                          )
                        )
                        : false;

                      const addressRowClass = hasVoidTeam
                        ? "bg-orange-100 border-b-2 border-orange-300"
                        : isAddressComplete
                          ? "bg-green-50 border-b-2 border-green-300"
                          : "bg-purple-50 border-b-2 border-purple-200";

                      return (
                        <>
                          {/* Address row - parent */}
                          <tr
                            key={`address-${addressData.address}`}
                            className={addressRowClass}
                          >
                            <td className="px-6 py-4 text-sm font-bold text-gray-900 border-r border-gray-300">
                              <Link
                                href={`/address-history?address=${encodeURIComponent(addressData.address)}&projectId=${selectedProjectId}`}
                                className="text-purple-600 hover:text-purple-800 hover:underline cursor-pointer"
                              >
                                {addressData.address}
                              </Link>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 border-r border-gray-300 italic">
                              {addressData.woids.length} WOID{addressData.woids.length !== 1 ? "s" : ""}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 border-r border-gray-300"></td>
                            <td className="px-6 py-4 text-sm text-gray-500 border-r border-gray-300"></td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-300">
                              {addressData.projectName}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {addressData.tickets.length > 0 ? (
                                <div className="flex flex-col gap-2">
                                  {addressData.tickets.map((ticket) => (
                                    <div key={ticket.ticketId} className="flex items-center gap-2">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {ticket.ticketId}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {formatDate(ticket.creationDate)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">No tickets</span>
                              )}
                            </td>
                          </tr>
                          {/* WOID rows - children */}
                          {addressData.woids.map((woid, woidIndex) => (
                            <tr
                              key={`woid-${woid.workOrderId}`}
                              className={
                                woidIndex % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }
                            >
                              <td className="px-6 py-4 border-r border-gray-300"></td>
                              <td className="px-6 py-4 pl-12 text-sm font-medium text-gray-900 border-r border-gray-300">
                                <span className="inline-flex items-center">
                                  <svg
                                    className="w-4 h-4 mr-2 text-gray-400"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path d="M9 5l7 7-7 7"></path>
                                  </svg>
                                  {woid.workOrderId}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-300">
                                {woid.teams.length > 0 ? (
                                  <div className="space-y-2">
                                    {woid.teams.map((team) => {
                                      const isCompletingTeam = team.taskForceId === selectedProject?.completingTeamId;
                                      return (
                                        <div key={team.taskForceId} className="flex items-center gap-2">
                                          <span className="font-medium">{team.taskForceName}</span>
                                          {isCompletingTeam && (
                                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                                              COMPLETING
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic">No teams assigned</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-300">
                                {woid.teams.length > 0 ? (
                                  <div className="space-y-2">
                                    {woid.teams.map((team) => {
                                      const statusKey = team.status?.toLowerCase();
                                      const statusColors: Record<string, string> = {
                                        complete: "bg-green-100 text-green-800",
                                        incomplete: "bg-gray-100 text-gray-600",
                                        void: "bg-orange-100 text-orange-800",
                                      };
                                      const bgColor = statusKey
                                        ? statusColors[statusKey] ?? "bg-gray-100 text-gray-800"
                                        : "bg-gray-100 text-gray-800";
                                      const status = statusKey;

                                      return (
                                        <div key={team.taskForceId} className={`px-3 py-2 rounded ${bgColor}`}>
                                          {status === "void" ? (
                                            <span className="whitespace-nowrap font-medium">VOID</span>
                                          ) : team.completionDate ? (
                                            <span className="whitespace-nowrap font-medium">
                                              {formatDate(team.completionDate)}
                                            </span>
                                          ) : (
                                            <span className="italic">—</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic">—</span>
                                )}
                              </td>
                              <td className="px-6 py-4 border-r border-gray-300"></td>
                              <td className="px-6 py-4"></td>
                            </tr>
                          ))}
                        </>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!searchQuery && woidData && woidData.length === 0 && selectedProjectId && (
            <div className="text-center py-12">
              <p className="text-gray-500">No WOID assignments found for this project.</p>
            </div>
          )}

          {!searchQuery && !selectedProjectId && (
            <div className="text-center py-12">
              <p className="text-gray-500">Please select a project to view WOID assignments.</p>
            </div>
          )}

          {!searchQuery && woidData === undefined && selectedProjectId && (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading WOID data...</p>
            </div>
          )}

          {searchQuery && searchedReports === undefined && (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading daily reports...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


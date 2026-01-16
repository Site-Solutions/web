"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

export default function AddressHistoryPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get("address");
  const projectId = searchParams.get("projectId") as Id<"projects"> | null;

  const history = useQuery(
    api.addressHistory.getAddressHistory,
    address && projectId ? { address, projectId } : "skip"
  );

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!address || !projectId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Missing Parameters</h1>
          <p className="text-gray-600">Please provide an address and project ID.</p>
          <Link href="/view" className="mt-4 inline-block text-purple-600 hover:text-purple-800">
            ← Back to View
          </Link>
        </div>
      </div>
    );
  }

  if (history === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading address history...</p>
        </div>
      </div>
    );
  }

  if (history === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Data Found</h1>
          <p className="text-gray-600">No history found for this address.</p>
          <Link href="/view" className="mt-4 inline-block text-purple-600 hover:text-purple-800">
            ← Back to View
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/view" className="text-purple-600 hover:text-purple-800 mb-4 inline-block">
            ← Back to View
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Address History</h1>
          <p className="text-xl text-gray-600">{history.address}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-purple-600">{history.summary.totalWOIDs}</div>
            <div className="text-sm text-gray-600">Work Orders</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{history.summary.totalTeams}</div>
            <div className="text-sm text-gray-600">Team Assignments</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">{history.summary.totalReports}</div>
            <div className="text-sm text-gray-600">Daily Reports</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-orange-600">{history.summary.totalTickets}</div>
            <div className="text-sm text-gray-600">Tickets</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-red-600">{history.summary.totalUpdates}</div>
            <div className="text-sm text-gray-600">Ticket Updates</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-indigo-600">{history.summary.totalFiles}</div>
            <div className="text-sm text-gray-600">Files</div>
          </div>
        </div>

        {/* Work Orders Section */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Work Orders</h2>
          </div>
          <div className="p-6">
            {history.woidAssignments.map((woid: any) => {
              const teamInfo = history.taskForceAssignments.find(
                (ta: any) => ta.workOrderId === woid.workOrderId
              );
              const reportInfo = history.dailyReports.find(
                (dr: any) => dr.workOrderId === woid.workOrderId
              );

              return (
                <div key={woid._id} className="mb-6 last:mb-0 border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      WOID: {woid.workOrderId}
                    </h3>
                    <span className="text-sm text-gray-500">
                      Created {formatDate(woid._creationTime)}
                    </span>
                  </div>

                  {/* Teams */}
                  {teamInfo && teamInfo.teams.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Assigned Teams:</h4>
                      <div className="flex flex-wrap gap-2">
                        {teamInfo.teams.map((team: any) => {
                          const statusColors: Record<string, string> = {
                            complete: "bg-green-100 text-green-800 border-green-300",
                            incomplete: "bg-gray-100 text-gray-600 border-gray-300",
                            void: "bg-orange-100 text-orange-800 border-orange-300",
                          };
                          const statusKey = team.status?.toLowerCase();
                          const colorClass = statusKey
                            ? statusColors[statusKey] ?? "bg-gray-100 text-gray-800 border-gray-300"
                            : "bg-gray-100 text-gray-800 border-gray-300";

                          return (
                            <div
                              key={team._id}
                              className={`px-3 py-2 rounded-lg border ${colorClass}`}
                            >
                              <div className="font-medium">{team.taskForceName}</div>
                              {team.status && (
                                <div className="text-xs mt-1 capitalize">{team.status}</div>
                              )}
                              {team.completionDate && (
                                <div className="text-xs mt-1">
                                  Completed: {formatDate(team.completionDate)}
                                </div>
                              )}
                              {team.date && (
                                <div className="text-xs mt-1">
                                  Updated: {formatDate(team.date)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Daily Reports */}
                  {reportInfo && reportInfo.reports.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Daily Reports ({reportInfo.reports.length}):
                      </h4>
                      <div className="space-y-2">
                        {reportInfo.reports.map((report: any) => (
                          <div
                            key={report._id}
                            className="bg-gray-50 rounded p-3 text-sm"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-medium text-gray-900">
                                {formatDate(report._creationTime)}
                              </span>
                              {report.files && report.files.length > 0 && (
                                <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                                  {report.files.length} file{report.files.length !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                            {report.notes && (
                              <p className="text-gray-600 mb-2">{report.notes}</p>
                            )}
                            {report.files && report.files.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {report.files.map((file: any) => (
                                  <a
                                    key={file._id}
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                                  >
                                    {file.name || "View File"}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tickets Section */}
        {history.tickets.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Tickets & Updates</h2>
            </div>
            <div className="p-6">
              {history.tickets.map((ticket: any) => (
                <div key={ticket.ticketId} className="mb-6 last:mb-0 border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Ticket #{ticket.ticketId}
                      </h3>
                      {ticket.ticketType && (
                        <span className="text-sm text-gray-600">{ticket.ticketType}</span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      Created {formatDate(ticket.creationDate)}
                    </span>
                  </div>

                  {/* Ticket Updates */}
                  {ticket.updates.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Updates ({ticket.updates.length}):
                      </h4>
                      <div className="space-y-3">
                        {ticket.updates.map((update: any) => (
                          <div
                            key={update._id}
                            className="bg-gray-50 rounded p-3 border-l-4 border-blue-500"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="font-medium text-gray-900">
                                  {update.utilityCompany}
                                </span>
                                {update.emailSubject && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {update.emailSubject}
                                  </div>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {formatDate(update._creationTime)}
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">Status:</span>{" "}
                              <span className="text-gray-700">{update.status}</span>
                            </div>
                            {update.emailFrom && (
                              <div className="text-xs text-gray-500 mt-1">
                                From: {update.emailFrom}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Files Section */}
        {history.files.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">All Files</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {history.files.map((file: any) => (
                  <a
                    key={file._id}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {file.name || "Unnamed File"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(file._creationTime)}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


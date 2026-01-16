"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useState } from "react";

export default function AddressHistoryPage() {
    const searchParams = useSearchParams();
    const address = searchParams.get("address");
    const projectId = searchParams.get("projectId") as Id<"projects"> | null;
    const [activeTab, setActiveTab] = useState<"overview" | "teams" | "files" | "tickets">("overview");

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
                        ← Back to Search
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
                        ← Back to Search
                    </Link>
                </div>
            </div>
        );
    }

    // Build timeline from all activities
    const timeline = [
        ...history.dailyReports.flatMap((dr: any) =>
            dr.reports.map((r: any) => ({
                type: "report",
                date: r._creationTime,
                workOrderId: dr.workOrderId,
                report: r,
            }))
        ),
        ...history.tickets.flatMap((t: any) =>
            t.updates.map((u: any) => ({
                type: "ticket_update",
                date: u._creationTime,
                ticketId: t.ticketId,
                update: u,
            }))
        ),
    ].sort((a, b) => b.date - a.date);

    // Group teams across all WOIDs
    const allTeams = new Map();
    history.taskForceAssignments.forEach((ta: any) => {
        ta.teams.forEach((team: any) => {
            if (!allTeams.has(team.taskForceId)) {
                allTeams.set(team.taskForceId, {
                    ...team,
                    woids: [],
                    reportCount: 0,
                });
            }
            allTeams.get(team.taskForceId).woids.push(ta.workOrderId);
        });
    });

    // Count reports per team
    history.dailyReports.forEach((dr: any) => {
        dr.reports.forEach((r: any) => {
            const teamData = Array.from(allTeams.values()).find(
                (t: any) => dr.workOrderId && t.woids.includes(dr.workOrderId)
            );
            if (teamData) {
                teamData.reportCount++;
            }
        });
    });

    const tabs = [
        { id: "overview", label: "Overview", icon: "📊" },
        { id: "teams", label: "Teams & Work", icon: "👥" },
        { id: "files", label: "Files", icon: "📁", count: history.summary.totalFiles },
        { id: "tickets", label: "Tickets", icon: "🎫", count: history.summary.totalTickets },
    ];

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <Link href="/view" className="text-purple-600 hover:text-purple-800 mb-4 inline-block">
                        ← Back to Search
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{history.address}</h1>
                    <p className="text-gray-600">Address History & Activity</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-purple-600">{history.summary.totalWOIDs}</div>
                        <div className="text-sm text-gray-600">Work Orders</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-blue-600">{history.summary.totalTeams}</div>
                        <div className="text-sm text-gray-600">Teams</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-green-600">{history.summary.totalReports}</div>
                        <div className="text-sm text-gray-600">Reports</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-2xl font-bold text-indigo-600">{history.summary.totalFiles}</div>
                        <div className="text-sm text-gray-600">Files</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-lg shadow mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="flex -mb-px">
                            {tabs.map((tab: any) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`
                    relative px-6 py-4 text-sm font-medium transition-colors
                    ${activeTab === tab.id
                                            ? "border-b-2 border-purple-500 text-purple-600"
                                            : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                        }
                  `}
                                >
                                    <span className="mr-2">{tab.icon}</span>
                                    {tab.label}
                                    {tab.count > 0 && (
                                        <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="p-6">
                        {/* Overview Tab */}
                        {activeTab === "overview" && (
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Activity Timeline</h2>
                                <div className="space-y-4">
                                    {timeline.slice(0, 20).map((activity: any, index: number) => (
                                        <div key={index} className="flex gap-4 border-l-2 border-purple-200 pl-4 pb-4">
                                            <div className="flex-shrink-0 w-24 text-sm text-gray-500">
                                                {formatDate(activity.date)}
                                            </div>
                                            <div className="flex-1">
                                                {activity.type === "report" && (
                                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-green-700 font-medium">📝 Report Filed</span>
                                                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                                                {activity.workOrderId}
                                                            </span>
                                                        </div>
                                                        {activity.report.notes && (
                                                            <p className="text-sm text-gray-700 mt-2">{activity.report.notes}</p>
                                                        )}
                                                        {activity.report.files?.length > 0 && (
                                                            <div className="mt-2 text-xs text-gray-600">
                                                                📎 {activity.report.files.length} file(s) attached
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {activity.type === "ticket_update" && (
                                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-blue-700 font-medium">🎫 Ticket Update</span>
                                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                                                #{activity.ticketId}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm text-gray-700 mt-2">
                                                            <span className="font-medium">{activity.update.utilityCompany}</span>:{" "}
                                                            {activity.update.status}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Teams Tab */}
                        {activeTab === "teams" && (
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Teams & Their Work</h2>
                                <div className="space-y-4">
                                    {Array.from(allTeams.values()).map((team: any) => {
                                        const statusColors: Record<string, string> = {
                                            complete: "bg-green-100 border-green-300 text-green-800",
                                            incomplete: "bg-gray-100 border-gray-300 text-gray-600",
                                            void: "bg-orange-100 border-orange-300 text-orange-800",
                                        };
                                        const colorClass = team.status
                                            ? statusColors[team.status.toLowerCase()] || "bg-gray-100 border-gray-300"
                                            : "bg-gray-100 border-gray-300";

                                        return (
                                            <div key={team.taskForceId} className={`rounded-lg border-2 p-4 ${colorClass}`}>
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <h3 className="text-lg font-semibold">{team.taskForceName}</h3>
                                                        {team.status && (
                                                            <span className="text-sm capitalize">{team.status}</span>
                                                        )}
                                                    </div>
                                                    <div className="text-right text-sm text-gray-600">
                                                        <div>{team.reportCount} reports</div>
                                                        <div>{team.woids.length} work order(s)</div>
                                                    </div>
                                                </div>
                                                {team.completionDate && (
                                                    <div className="text-sm">
                                                        ✅ Completed: {formatDate(team.completionDate)}
                                                    </div>
                                                )}
                                                <div className="mt-2 text-xs text-gray-600">
                                                    WOIDs: {team.woids.join(", ")}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Files Tab */}
                        {activeTab === "files" && (
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-4">
                                    All Files ({history.files.length})
                                </h2>
                                {history.files.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {history.files.map((file: any) => (
                                            <a
                                                key={file._id}
                                                href={file.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-purple-300 transition-colors"
                                            >
                                                <div className="flex-shrink-0">
                                                    <svg
                                                        className="w-10 h-10 text-gray-400"
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
                                                <svg
                                                    className="w-5 h-5 text-gray-400 flex-shrink-0"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                                    />
                                                </svg>
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-gray-500">
                                        No files uploaded yet
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tickets Tab */}
                        {activeTab === "tickets" && (
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-4">
                                    Tickets & Updates ({history.tickets.length})
                                </h2>
                                {history.tickets.length > 0 ? (
                                    <div className="space-y-6">
                                        {history.tickets.map((ticket: any) => (
                                            <div key={ticket.ticketId} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <h3 className="text-lg font-semibold">Ticket #{ticket.ticketId}</h3>
                                                        {ticket.ticketType && (
                                                            <span className="text-sm text-gray-600">{ticket.ticketType}</span>
                                                        )}
                                                    </div>
                                                    <span className="text-sm text-gray-500">
                                                        {formatDate(ticket.creationDate)}
                                                    </span>
                                                </div>
                                                <div className="space-y-2">
                                                    {ticket.updates.map((update: any) => (
                                                        <div
                                                            key={update._id}
                                                            className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded"
                                                        >
                                                            <div className="flex justify-between items-start mb-1">
                                                                <span className="font-medium text-gray-900">
                                                                    {update.utilityCompany}
                                                                </span>
                                                                <span className="text-xs text-gray-500">
                                                                    {formatDate(update._creationTime)}
                                                                </span>
                                                            </div>
                                                            <div className="text-sm text-gray-700">
                                                                Status: <span className="font-medium">{update.status}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-gray-500">
                                        No tickets found
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}


"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
    ArrowLeft,
    FileText,
    Users,
    Ticket,
    Clock,
    CheckCircle2,
    Circle,
    Filter,
    Image as ImageIcon,
    X,
    Download,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

export default function AddressHistoryPage() {
    const searchParams = useSearchParams();
    const address = searchParams.get("address");
    const projectId = searchParams.get("projectId") as Id<"projects"> | null;
    const [selectedWoid, setSelectedWoid] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"activity" | "teams" | "utilities" | "files">("activity");
    const [timelineFilter, setTimelineFilter] = useState<"all" | "reports" | "tickets">("all");
    const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);
    const [selectedReport, setSelectedReport] = useState<any | null>(null);

    const historyData = useQuery(
        api.addressHistory.getAddressHistory,
        address && projectId ? { address, projectId } : "skip"
    );

    if (!address || !projectId) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 text-5xl mb-4">⚠️</div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Missing Parameters</h1>
                    <p className="text-gray-600">Address and Project ID are required.</p>
                </div>
            </div>
        );
    }

    if (!historyData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading address history...</p>
                </div>
            </div>
        );
    }

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const isImageFile = (fileName: string, fileType?: string) => {
        if (fileType && fileType.includes("image")) return true;
        const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"];
        return imageExtensions.some((ext) => fileName.toLowerCase().endsWith(ext));
    };

    // Build WOID-centric data structure
    const woidTeamMap = new Map<string, Array<{ teamName: string; status: string; completionDate?: number }>>();

    // Initialize WOIDs
    for (const assignment of historyData.woidAssignments) {
        if (!woidTeamMap.has(assignment.workOrderId)) {
            woidTeamMap.set(assignment.workOrderId, []);
        }
    }

    // Add team assignments (taskForceAssignments is already grouped by WOID)
    for (const taskForceGroup of historyData.taskForceAssignments) {
        const teams = taskForceGroup.teams.map((team: any) => ({
            teamName: team.taskForceName,
            status: team.status,
            completionDate: team.completionDate,
        }));
        woidTeamMap.set(taskForceGroup.workOrderId, teams);
    }

    // Group reports by WOID (dailyReports is already grouped by WOID)
    const reportsByWoid = new Map<string, Array<any>>();
    for (const dr of historyData.dailyReports) {
        reportsByWoid.set(dr.workOrderId, dr.reports);
    }

    // Group files by WOID
    const filesByWoid = new Map<string, typeof historyData.files>();
    for (const file of historyData.files) {
        const woid = file.workOrderId;
        if (!woid) continue;
        if (!filesByWoid.has(woid)) {
            filesByWoid.set(woid, []);
        }
        filesByWoid.get(woid)!.push(file);
    }

    // Calculate completion stats
    let completeWoids = 0;
    let voidWoids = 0;
    let inProgressWoids = 0;

    for (const [woid, teams] of woidTeamMap.entries()) {
        const hasVoid = teams.some(t => t.status === "void");
        const allComplete = teams.length > 0 && teams.every(t => t.status === "complete");

        if (hasVoid) voidWoids++;
        else if (allComplete) completeWoids++;
        else inProgressWoids++;
    }

    const totalWoids = woidTeamMap.size;
    const completionPercentage = totalWoids > 0 ? Math.round((completeWoids / totalWoids) * 100) : 0;

    // Build timeline
    const timeline = [
        ...historyData.dailyReports.flatMap((dr: { workOrderId: string; reports: Array<any> }) =>
            dr.reports.map((report: any) => ({
                type: "report" as const,
                date: report._creationTime,
                workOrderId: dr.workOrderId,
                report,
            }))
        ),
        ...historyData.tickets.flatMap((t: { ticketId: string; updates: Array<{ _creationTime: number; utilityCompany: string; status: string }> }) =>
            t.updates.map((u: { _creationTime: number; utilityCompany: string; status: string }) => ({
                type: "ticket_update" as const,
                date: u._creationTime,
                ticketId: t.ticketId,
                update: u,
            })),
        ),
    ]
        .filter((item) => {
            if (timelineFilter === "all") return true;
            if (timelineFilter === "reports") return item.type === "report";
            if (timelineFilter === "tickets") return item.type === "ticket_update";
            return true;
        })
        .sort((a, b) => b.date - a.date);

    // Group timeline by date
    const groupedTimeline = timeline.reduce(
        (acc, item) => {
            const dateKey = new Date(item.date).toDateString();
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(item);
            return acc;
        },
        {} as Record<string, typeof timeline>
    );

    const getStatusColor = (status: string) => {
        const s = status.toLowerCase();
        if (s.includes("clear") || s.includes("marked")) return "bg-green-500";
        if (s.includes("pending") || s.includes("wait")) return "bg-yellow-500";
        return "bg-gray-500";
    };

    const getWoidStatus = (woid: string) => {
        const teams = woidTeamMap.get(woid) || [];
        const hasVoid = teams.some(t => t.status === "void");
        const allComplete = teams.length > 0 && teams.every(t => t.status === "complete");

        if (hasVoid) return "void";
        if (allComplete) return "complete";
        if (teams.length > 0) return "in_progress";
        return "not_started";
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <Link
                                href="/view"
                                className="mt-1 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="h-5 w-5 text-gray-600" />
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{address}</h1>
                                <p className="text-gray-600 text-sm mt-1">
                                    {totalWoids} work orders across {historyData.summary.totalTeams} teams
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <div className="text-sm text-gray-600">Overall Progress</div>
                                <div className="text-lg font-bold text-gray-900">{completionPercentage}%</div>
                            </div>
                            <div className="w-24">
                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-purple-600 h-full transition-all"
                                        style={{ width: `${completionPercentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary Stats */}
                    {/* <div className="grid grid-cols-4 gap-4 mt-6">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                <div>
                                    <p className="text-2xl font-bold text-green-900">{completeWoids}</p>
                                    <p className="text-xs text-green-700">Complete</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-blue-600" />
                                <div>
                                    <p className="text-2xl font-bold text-blue-900">{inProgressWoids}</p>
                                    <p className="text-xs text-blue-700">In Progress</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <div className="flex items-center gap-2">
                                <Circle className="w-5 h-5 text-orange-600" />
                                <div>
                                    <p className="text-2xl font-bold text-orange-900">{voidWoids}</p>
                                    <p className="text-xs text-orange-700">Void</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <div className="flex items-center gap-2">
                                <Ticket className="w-5 h-5 text-purple-600" />
                                <div>
                                    <p className="text-2xl font-bold text-purple-900">{historyData.summary.totalTickets}</p>
                                    <p className="text-xs text-purple-700">Tickets</p>
                                </div>
                            </div>
                        </div>
                    </div> */}
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Sidebar - Work Orders */}
                    <aside className="lg:col-span-3">
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div className="p-4 border-b border-gray-200">
                                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                                    Work Orders ({totalWoids})
                                </h2>
                            </div>
                            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                                {/* All Work Orders option */}
                                <button
                                    onClick={() => setSelectedWoid(null)}
                                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${selectedWoid === null ? "bg-purple-50 border-l-4 border-purple-600" : ""
                                        }`}
                                >
                                    <div className="font-medium text-gray-900">All Work Orders</div>
                                    <div className="text-sm text-gray-600">View combined activity</div>
                                </button>

                                {/* Individual WOIDs */}
                                {Array.from(woidTeamMap.keys()).map((woid) => {
                                    const teams = woidTeamMap.get(woid) || [];
                                    const reports = reportsByWoid.get(woid) || [];
                                    const status = getWoidStatus(woid);
                                    const isSelected = selectedWoid === woid;

                                    return (
                                        <button
                                            key={woid}
                                            onClick={() => setSelectedWoid(woid)}
                                            className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${isSelected ? "bg-purple-50 border-l-4 border-purple-600" : ""
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-mono text-sm font-bold text-gray-900">{woid}</span>
                                                {status === "complete" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                                {status === "in_progress" && <Clock className="w-4 h-4 text-blue-500" />}
                                                {status === "void" && <Circle className="w-4 h-4 text-orange-500" />}
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {teams.length}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <FileText className="w-3 h-3" />
                                                    {reports.length}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="lg:col-span-9">
                        {/* Tabs */}
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div className="border-b border-gray-200">
                                <div className="flex">
                                    {[
                                        { id: "activity", label: "Activity", icon: Clock },
                                        { id: "teams", label: "Teams", icon: Users },
                                        { id: "utilities", label: "Utilities", icon: Ticket },
                                        { id: "files", label: "Files", icon: FileText, badge: historyData.summary.totalFiles },
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                                ? "border-purple-600 text-purple-600"
                                                : "border-transparent text-gray-600 hover:text-gray-900"
                                                }`}
                                        >
                                            <tab.icon className="w-4 h-4" />
                                            {tab.label}
                                            {tab.badge !== undefined && tab.badge > 0 && (
                                                <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                                                    {tab.badge}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6">
                                {/* Activity Tab */}
                                {activeTab === "activity" && (
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-semibold text-gray-900">Activity Timeline</h3>
                                            <div className="flex items-center gap-2">
                                                <Filter className="w-4 h-4 text-gray-500" />
                                                <div className="flex gap-1">
                                                    {(["all", "reports", "tickets"] as const).map((filter) => (
                                                        <button
                                                            key={filter}
                                                            onClick={() => setTimelineFilter(filter)}
                                                            className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${timelineFilter === filter
                                                                ? "bg-purple-600 text-white"
                                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                                }`}
                                                        >
                                                            {filter}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="max-h-[500px] overflow-y-auto space-y-6">
                                            {Object.keys(groupedTimeline).length > 0 ? (
                                                (Object.entries(groupedTimeline) as Array<[string, typeof timeline]>).map(([dateKey, items]) => (
                                                    <div key={dateKey}>
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <div className="h-px flex-1 bg-gray-300" />
                                                            <span className="text-xs font-medium text-gray-500 px-2">
                                                                {formatDate(new Date(dateKey).getTime())}
                                                            </span>
                                                            <div className="h-px flex-1 bg-gray-300" />
                                                        </div>
                                                        <div className="space-y-3">
                                                            {items.map((activity: typeof timeline[0], index: number) => {
                                                                const Component = activity.type === "report" ? "button" : "div";
                                                                return (
                                                                    <Component
                                                                        key={index}
                                                                        onClick={activity.type === "report" ? () => setSelectedReport(activity.report) : undefined}
                                                                        className={`w-full text-left flex gap-3 p-4 rounded-lg border transition-all ${activity.type === "report"
                                                                            ? "bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer"
                                                                            : "bg-blue-50 border-blue-200"
                                                                            }`}
                                                                    >
                                                                        <div
                                                                            className={`flex items-center justify-center w-8 h-8 rounded-full ${activity.type === "report" ? "bg-green-500" : "bg-blue-500"
                                                                                }`}
                                                                        >
                                                                            {activity.type === "report" ? (
                                                                                <FileText className="w-4 h-4 text-white" />
                                                                            ) : (
                                                                                <Ticket className="w-4 h-4 text-white" />
                                                                            )}
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                <span className="font-medium text-sm text-gray-900">
                                                                                    {activity.type === "report" ? "Report Filed" : "Utility Update"}
                                                                                </span>
                                                                                <span className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs font-mono">
                                                                                    {activity.type === "report"
                                                                                        ? activity.workOrderId
                                                                                        : `#${activity.ticketId}`}
                                                                                </span>
                                                                                <span className="text-xs text-gray-500 ml-auto">
                                                                                    {formatTime(activity.date)}
                                                                                </span>
                                                                            </div>
                                                                            {activity.type === "report" && (activity.report.notes || activity.report.comment) && (
                                                                                <p className="text-sm text-gray-600 mt-1">
                                                                                    {activity.report.notes || activity.report.comment}
                                                                                </p>
                                                                            )}
                                                                            {activity.type === "ticket_update" && (
                                                                                <p className="text-sm mt-1">
                                                                                    <span className="font-medium text-gray-900">
                                                                                        {activity.update.utilityCompany}
                                                                                    </span>
                                                                                    <span className="text-gray-500"> - </span>
                                                                                    <span className="text-gray-700">{activity.update.status}</span>
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </Component>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-12 text-gray-500">No activity found</div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Teams Tab */}
                                {activeTab === "teams" && (
                                    <div className="space-y-4">
                                        {Array.from(woidTeamMap.entries())
                                            .filter(([woid]) => !selectedWoid || woid === selectedWoid)
                                            .map(([woid, teams]) => (
                                                <div key={woid} className="border border-gray-200 rounded-lg p-4">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="text-base font-mono font-semibold text-gray-900">{woid}</h3>
                                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                                                                {teams.length} teams
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {teams.map((team, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-white"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 font-medium">
                                                                        {team.teamName?.slice(0, 2).toUpperCase() || "TM"}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-medium text-gray-900">{team.teamName}</div>
                                                                        {team.completionDate && (
                                                                            <div className="text-xs text-gray-500">
                                                                                Completed {formatDate(team.completionDate)}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <span
                                                                    className={`px-3 py-1 rounded-full text-xs font-medium ${team.status === "complete"
                                                                        ? "bg-green-100 text-green-800"
                                                                        : team.status === "void"
                                                                            ? "bg-orange-100 text-orange-800"
                                                                            : "bg-gray-200 text-gray-800"
                                                                        }`}
                                                                >
                                                                    {team.status || "Not Started"}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}

                                {/* Utilities Tab */}
                                {activeTab === "utilities" && (
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Utility Clearance Status</h3>
                                        <p className="text-sm text-gray-600 mb-4">
                                            {historyData.tickets.length} ticket(s) with utility updates
                                        </p>
                                        {historyData.tickets.length > 0 ? (
                                            <div className="space-y-6">
                                                {historyData.tickets.map((ticket: { _id: string; ticketId: string; updates: Array<{ _creationTime: number; utilityCompany: string; status: string }> }) => {
                                                    const utilities = new Map<string, { status: string; updateDate: number }>();
                                                    ticket.updates.forEach((update: { _creationTime: number; utilityCompany: string; status: string }) => {
                                                        const existing = utilities.get(update.utilityCompany);
                                                        if (!existing || update._creationTime > existing.updateDate) {
                                                            utilities.set(update.utilityCompany, {
                                                                status: update.status,
                                                                updateDate: update._creationTime,
                                                            });
                                                        }
                                                    });

                                                    return (
                                                        <div key={ticket._id} className="border border-gray-200 rounded-lg p-4">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="px-2 py-1 bg-gray-100 text-gray-900 rounded text-sm font-mono">
                                                                        #{ticket.ticketId}
                                                                    </span>
                                                                </div>
                                                                <span className="text-xs text-gray-500">
                                                                    {ticket.updates.length} updates
                                                                </span>
                                                            </div>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                                {Array.from(utilities.entries()).map(([company, data]) => (
                                                                    <div key={company} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                                                                        <div className={`w-2 h-2 rounded-full ${getStatusColor(data.status)}`} />
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="text-sm font-medium text-gray-900 truncate">{company}</div>
                                                                            <div className="text-xs text-gray-600 truncate">{data.status}</div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 text-gray-500">No tickets found for this address</div>
                                        )}
                                    </div>
                                )}

                                {/* Files Tab */}
                                {activeTab === "files" && (
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            Files ({historyData.files.length})
                                        </h3>
                                        <p className="text-sm text-gray-600 mb-4">All files associated with this address</p>
                                        {historyData.files.length > 0 ? (
                                            <div className="space-y-2">
                                                {historyData.files.map((file: { _id: string; _creationTime: number; name: string; googleUrl?: string; fileType?: string }) => {
                                                    const isImage = isImageFile(file.name, file.fileType);

                                                    if (isImage) {
                                                        return (
                                                            <button
                                                                key={file._id}
                                                                onClick={() => setSelectedImage({ url: file.googleUrl || "", name: file.name })}
                                                                className="w-full group flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-left"
                                                            >
                                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                    <div className="flex-shrink-0 p-2 rounded-md bg-blue-100">
                                                                        <ImageIcon className="h-5 w-5 text-blue-600" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-sm font-medium text-gray-900 group-hover:text-purple-600">
                                                                            {file.name || "Unnamed File"}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500 flex items-center gap-2">
                                                                            <span>{formatDate(file._creationTime)}</span>
                                                                            <span className="text-blue-600">• Image</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex-shrink-0 ml-2">
                                                                    <div className="text-xs text-blue-600 font-medium">View</div>
                                                                </div>
                                                            </button>
                                                        );
                                                    } else {
                                                        return (
                                                            <a
                                                                key={file._id}
                                                                href={file.googleUrl || "#"}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="group flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                                                            >
                                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                    <div className="flex-shrink-0 p-2 rounded-md bg-gray-100">
                                                                        <FileText className="h-5 w-5 text-gray-600" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="text-sm font-medium text-gray-900 group-hover:text-purple-600">
                                                                            {file.name || "Unnamed File"}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500 flex items-center gap-2">
                                                                            <span>{formatDate(file._creationTime)}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex-shrink-0 ml-2">
                                                                    <Download className="h-4 w-4 text-gray-400 group-hover:text-purple-600" />
                                                                </div>
                                                            </a>
                                                        );
                                                    }
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 text-gray-500">No files uploaded yet</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </main>
                </div>
            </div>

            {/* Image Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative max-w-7xl max-h-full">
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute -top-12 right-0 p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">{selectedImage.name}</h3>
                                <a
                                    href={selectedImage.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Download className="h-4 w-4" />
                                    Open Original
                                </a>
                            </div>
                            <div className="p-4 bg-gray-100">
                                <img
                                    src={selectedImage.url}
                                    alt={selectedImage.name}
                                    className="max-w-full max-h-[70vh] mx-auto object-contain"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Details Modal */}
            {selectedReport && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
                    onClick={() => setSelectedReport(null)}
                >
                    <div
                        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Daily Report</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    {formatDate(selectedReport._creationTime)} at {formatTime(selectedReport._creationTime)}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedReport(null)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-600" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
                            {/* WOID */}
                            <div className="mb-4">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Work Order</label>
                                <p className="text-sm font-mono font-medium text-gray-900 mt-1">{selectedReport.workOrderId}</p>
                            </div>

                            {/* Status */}
                            {selectedReport.completionStatus && (
                                <div className="mb-4">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</label>
                                    <div className="mt-1">
                                        <span
                                            className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${selectedReport.completionStatus === "complete"
                                                ? "bg-green-100 text-green-800"
                                                : selectedReport.completionStatus === "void"
                                                    ? "bg-orange-100 text-orange-800"
                                                    : "bg-gray-200 text-gray-800"
                                                }`}
                                        >
                                            {selectedReport.completionStatus}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Notes/Comments */}
                            {(selectedReport.notes || selectedReport.comment) && (
                                <div className="mb-4">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</label>
                                    <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                                        {selectedReport.notes || selectedReport.comment}
                                    </p>
                                </div>
                            )}

                            {/* Details */}
                            {selectedReport.details && Object.keys(selectedReport.details).length > 0 && (
                                <div className="mb-4">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                                        Report Details
                                    </label>
                                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                        {Object.entries(selectedReport.details).map(([key, value]: [string, any]) => (
                                            <div key={key} className="flex justify-between">
                                                <span className="text-xs font-medium text-gray-600">{key}:</span>
                                                <span className="text-xs text-gray-900">{String(value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Attached Files */}
                            {selectedReport.files && selectedReport.files.length > 0 && (
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                                        Attached Files ({selectedReport.files.length})
                                    </label>
                                    <div className="space-y-2">
                                        {selectedReport.files.map((file: any) => {
                                            const isImage = isImageFile(file.name, file.fileType);
                                            return (
                                                <div key={file._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                        {isImage ? (
                                                            <ImageIcon className="h-4 w-4 text-blue-600" />
                                                        ) : (
                                                            <FileText className="h-4 w-4 text-gray-600" />
                                                        )}
                                                        <span className="text-sm text-gray-900">{file.name}</span>
                                                    </div>
                                                    {isImage ? (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedReport(null);
                                                                setSelectedImage({ url: file.googleUrl || "", name: file.name });
                                                            }}
                                                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                                        >
                                                            View
                                                        </button>
                                                    ) : (
                                                        <a
                                                            href={file.googleUrl || "#"}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                                                        >
                                                            Download
                                                        </a>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

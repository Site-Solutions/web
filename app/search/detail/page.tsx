"use client";

import { use, Suspense } from "react";
import { useQuery } from "convex/react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

function DetailPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const address = searchParams.get("address");
    const woid = searchParams.get("woid");
    const projectId = searchParams.get("projectId") as Id<"projects"> | null;

    // Get full details for this address
    const details = useQuery(
        api.addressSearch.searchByAddress,
        address && projectId
            ? {
                address,
                projectId,
            }
            : "skip"
    );

    // Get all ticket updates for this address
    const ticketUpdates = useQuery(
        api.ticketUpdates.getUpdatesByTicket,
        details?.tickets && details.tickets.length > 0
            ? {
                ticketId: details.tickets[0].ticketId,
                address: address || undefined,
            }
            : "skip"
    );

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatStatus = (status: string) => {
        const statusColors: Record<string, string> = {
            complete: "bg-green-100 text-green-800",
            incomplete: "bg-yellow-100 text-yellow-800",
            "in progress": "bg-blue-100 text-blue-800",
            "not started": "bg-gray-100 text-gray-800",
            void: "bg-orange-100 text-orange-800",
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

    if (!address || !projectId) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 font-medium">Missing required parameters</p>
                    <button
                        onClick={() => router.push("/search")}
                        className="mt-4 px-4 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-800"
                    >
                        Back to Search
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center text-purple-700 hover:text-purple-800 font-medium"
                    >
                        <svg
                            className="w-5 h-5 mr-2"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Search
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-8">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-gray-900">{address}</h1>
                        {woid && <p className="text-lg text-gray-600 mt-2">WOID: {woid}</p>}
                    </div>

                    {details === undefined ? (
                        <div className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
                            <p className="mt-2 text-gray-600">Loading details...</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Work Orders Section */}
                            {details.woids && details.woids.length > 0 && (
                                <div>
                                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                                        Work Orders
                                    </h2>
                                    <div className="space-y-6">
                                        {details.woids
                                            .filter((woidData: { woid: string }) =>
                                                !woid || woidData.woid === woid
                                            )
                                            .map((woidData: {
                                                woid: string;
                                                address: string;
                                                teams: {
                                                    taskForceName: string;
                                                    lastUpdated: number;
                                                    status: string;
                                                }[];
                                            }) => (
                                                <div
                                                    key={woidData.woid}
                                                    className="border border-gray-200 rounded-lg p-6"
                                                >
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                                        WOID: {woidData.woid}
                                                    </h3>

                                                    {/* Teams */}
                                                    {woidData.teams.length > 0 ? (
                                                        <div>
                                                            <h4 className="text-sm font-medium text-gray-700 mb-3">
                                                                Assigned Teams:
                                                            </h4>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {woidData.teams.map((team, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        className="bg-gray-50 rounded-md p-4"
                                                                    >
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <p className="font-medium text-gray-900">
                                                                                {team.taskForceName}
                                                                            </p>
                                                                            {formatStatus(team.status)}
                                                                        </div>
                                                                        <p className="text-xs text-gray-500">
                                                                            Last updated: {formatDate(team.lastUpdated)}
                                                                        </p>
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
                            {details.tickets && details.tickets.length > 0 && (
                                <div>
                                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                                        Tickets
                                    </h2>
                                    <div className="space-y-6">
                                        {details.tickets.map((ticket: { ticketId: string; assignedDate: number }) => (
                                            <div
                                                key={ticket.ticketId}
                                                className="border border-gray-200 rounded-lg p-6"
                                            >
                                                <div className="mb-4">
                                                    <h3 className="text-lg font-semibold text-purple-700">
                                                        {ticket.ticketId}
                                                    </h3>
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        Created: {formatDate(ticket.assignedDate)}
                                                    </p>
                                                </div>

                                                {/* Utility Status Updates */}
                                                {ticketUpdates && ticketUpdates.length > 0 && (
                                                    <div>
                                                        <h4 className="text-sm font-medium text-gray-700 mb-3">
                                                            Utility Company Updates:
                                                        </h4>
                                                        <div className="space-y-3">
                                                            {ticketUpdates.map((update: {
                                                                _id: string;
                                                                utilityCompany: string;
                                                                status: string;
                                                                updateDate: number;
                                                            }) => (
                                                                <div
                                                                    key={update._id}
                                                                    className="bg-gray-50 rounded-md p-4"
                                                                >
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <p className="font-medium text-gray-900">
                                                                            {update.utilityCompany}
                                                                        </p>
                                                                        <span className="text-xs text-gray-500">
                                                                            {formatDate(update.updateDate)}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm text-gray-700">{update.status}</p>
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

                            {details.woids.length === 0 && details.tickets.length === 0 && (
                                <div className="text-center py-8 text-gray-600">
                                    <p>No data found for this address</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function DetailPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
            </div>
        }>
            <DetailPageContent />
        </Suspense>
    );
}



"use client";

import { FileText, Ticket, Filter, ImageIcon } from "lucide-react";
import { colors } from "@/lib/colors";

type TimelineItem =
  | {
      type: "report";
      date: number;
      workOrderId: string;
      report: any & { isNewReport?: boolean };
      teamName?: string;
    }
  | {
      type: "ticket_update";
      date: number;
      ticketId: string;
      startDate?: number;
      update: { _creationTime: number; utilityCompany: string; status: string };
    };

interface ActivityTimelineProps {
  groupedTimeline: Record<string, TimelineItem[]>;
  timelineFilter: "all" | "reports" | "tickets";
  onFilterChange: (filter: "all" | "reports" | "tickets") => void;
  onSelectReport: (report: any) => void;
  formatDate: (timestamp: number) => string;
  formatTime: (timestamp: number) => string;
  selectedWoid: string | null;
}

function TicketStatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  let badgeClasses = "bg-gray-100 text-gray-700";
  if (s.includes("clear") || s.includes("marked")) {
    badgeClasses = "bg-green-100 text-green-800";
  } else if (s.includes("pending") || s.includes("wait")) {
    badgeClasses = "bg-yellow-100 text-yellow-800";
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${badgeClasses}`}>
      {status}
    </span>
  );
}

export default function ActivityTimeline({
  groupedTimeline,
  timelineFilter,
  onFilterChange,
  onSelectReport,
  formatDate,
  formatTime,
  selectedWoid,
}: ActivityTimelineProps) {
  const dateKeys = Object.keys(groupedTimeline);

  return (
    <div>
      {/* Header with filter pills */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-gray-900">Activity Timeline</h3>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <div className="flex gap-1">
            {(["all", "reports", "tickets"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => onFilterChange(filter)}
                className="px-3 py-1 text-xs font-medium rounded-full capitalize transition-colors"
                style={{
                  backgroundColor:
                    timelineFilter === filter ? colors.primary : "#f3f4f6",
                  color: timelineFilter === filter ? "white" : "#4b5563",
                }}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="max-h-[600px] overflow-y-auto pr-1">
        {dateKeys.length > 0 ? (
          dateKeys.map((dateKey) => {
            // Filter items by selected WOID if one is selected
            const allItems = groupedTimeline[dateKey];
            const items = selectedWoid
              ? allItems.filter(
                  (item) =>
                    item.type === "ticket_update" ||
                    (item.type === "report" && item.workOrderId === selectedWoid)
                )
              : allItems;
            
            // Skip rendering this date if no items after filtering
            if (items.length === 0) return null;
            
            return (
              <div key={dateKey} className="mb-6 last:mb-0">
                {/* Sticky date header */}
                <div className="sticky top-0 z-[1] bg-white/95 backdrop-blur-sm pb-2 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {formatDate(new Date(dateKey).getTime())}
                    </span>
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                      {items.length} event{items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Timeline items with left line */}
                <div className="relative ml-3 pl-5 border-l-2 border-gray-200 space-y-3">
                  {items.map((activity, index) => {
                    const isReport = activity.type === "report";
                    return (
                      <div key={index} className="relative">
                        {/* Timeline dot */}
                        <div
                          className="absolute -left-[27px] top-3 w-3 h-3 rounded-full border-2 border-white"
                          style={{
                            backgroundColor: isReport ? "#22c55e" : "#3b82f6",
                          }}
                        />

                        {isReport ? (
                          <button
                            onClick={() => onSelectReport(activity.report)}
                            className="w-full text-left p-3 rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all group"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-green-600" />
                                <span className="font-medium text-sm text-gray-900">
                                  {activity.teamName ? (
                                    <>
                                      {activity.teamName}
                                      {activity.report.isNewReport ? (
                                        <>
                                          {" filed new report"}
                                          {activity.report.date && (
                                            <span className="text-gray-500 text-xs ml-1">
                                              (work scheduled for {formatDate(activity.report.date)})
                                            </span>
                                          )}
                                        </>
                                      ) : activity.report.status === "complete" ? (
                                        <>
                                          {" "}
                                          <span className="text-green-600 font-semibold">
                                            completed work
                                          </span>
                                        </>
                                      ) : activity.report.status === "void" ? (
                                        <>
                                          {" "}
                                          <span className="text-orange-600 font-semibold">
                                            voided work
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          {" "}
                                          <span className="text-gray-600">
                                            updated status
                                          </span>
                                        </>
                                      )}
                                    </>
                                  ) : (
                                    "Report Filed"
                                  )}
                                </span>
                              </span>
                              <span className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[11px] font-mono text-gray-600">
                                {activity.workOrderId}
                              </span>
                              {activity.report.files && activity.report.files.length > 0 && (
                                <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
                                  <ImageIcon className="w-3 h-3" />
                                  {activity.report.files.length}
                                </span>
                              )}
                              <span className="text-[11px] text-gray-400 ml-auto">
                                {formatTime(activity.date)}
                              </span>
                            </div>
                            {(activity.report.notes || activity.report.comment) && (
                              <p className="text-sm text-gray-600 mt-1.5 line-clamp-2">
                                {activity.report.notes || activity.report.comment}
                              </p>
                            )}
                          </button>
                        ) : (
                          <div className="p-3 rounded-lg border border-gray-200 bg-white">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="flex items-center gap-1.5">
                                <Ticket className="w-3.5 h-3.5 text-blue-600" />
                                <span className="font-medium text-sm text-gray-900">
                                  Utility Update
                                </span>
                              </span>
                              <span className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[11px] font-mono text-gray-600">
                                #{activity.ticketId}
                              </span>
                              {activity.startDate && (
                                <span className="text-[11px] text-gray-400">
                                  Start: {formatDate(activity.startDate)}
                                </span>
                              )}
                              <span className="text-[11px] text-gray-400 ml-auto">
                                {formatTime(activity.date)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-sm font-medium text-gray-900">
                                {activity.update.utilityCompany}
                              </span>
                              <TicketStatusBadge status={activity.update.status} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-16 text-gray-400">
            <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No activity found</p>
          </div>
        )}
      </div>
    </div>
  );
}

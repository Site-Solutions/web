"use client";

import { CheckCircle2, Clock, Circle, Users, FileText } from "lucide-react";
import { colors } from "@/lib/colors";

interface WorkOrderSidebarProps {
  woidTeamMap: Map<string, Array<{ teamName: string; status: string; completionDate?: number }>>;
  reportsByWoid: Map<string, Array<any>>;
  selectedWoid: string | null;
  onSelectWoid: (woid: string | null) => void;
  getWoidStatus: (woid: string) => string;
}

function StatusDot({ status }: { status: string }) {
  const dotColors: Record<string, string> = {
    complete: "#22c55e",
    in_progress: "#3b82f6",
    void: "#f97316",
    not_started: "#9ca3af",
  };
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: dotColors[status] || "#9ca3af" }}
    />
  );
}

export default function WorkOrderSidebar({
  woidTeamMap,
  reportsByWoid,
  selectedWoid,
  onSelectWoid,
  getWoidStatus,
}: WorkOrderSidebarProps) {
  const woids = Array.from(woidTeamMap.keys());

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Work Orders ({woids.length})
            </h2>
          </div>
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
            {/* All Work Orders */}
            <button
              onClick={() => onSelectWoid(null)}
              className="w-full text-left px-4 py-3 transition-colors border-l-[3px]"
              style={{
                borderLeftColor: selectedWoid === null ? colors.primary : "transparent",
                backgroundColor: selectedWoid === null ? `${colors.primary}08` : "transparent",
              }}
            >
              <div className="font-medium text-sm text-gray-900">All Work Orders</div>
              <div className="text-xs text-gray-500 mt-0.5">View combined activity</div>
            </button>

            {/* Individual WOIDs */}
            {woids.map((woid) => {
              const teams = woidTeamMap.get(woid) || [];
              const reports = reportsByWoid.get(woid) || [];
              const status = getWoidStatus(woid);
              const isSelected = selectedWoid === woid;
              const completedTeams = teams.filter((t) => t.status === "complete").length;

              return (
                <button
                  key={woid}
                  onClick={() => onSelectWoid(woid)}
                  className="w-full text-left px-4 py-3 transition-colors border-l-[3px] border-t border-t-gray-50"
                  style={{
                    borderLeftColor: isSelected ? colors.primary : "transparent",
                    backgroundColor: isSelected ? `${colors.primary}08` : "transparent",
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <StatusDot status={status} />
                      <span className="font-mono text-sm font-semibold text-gray-900">
                        {woid}
                      </span>
                    </div>
                    {status === "complete" && (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    )}
                    {status === "in_progress" && (
                      <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    )}
                    {status === "void" && (
                      <Circle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    )}
                  </div>
                  {/* Mini progress bar */}
                  {teams.length > 0 && (
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(completedTeams / teams.length) * 100}%`,
                          backgroundColor:
                            completedTeams === teams.length ? "#22c55e" : colors.primary,
                        }}
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {teams.length}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {reports.length}
                    </span>
                    {teams.length > 0 && (
                      <span className="ml-auto text-[10px] text-gray-400">
                        {completedTeams}/{teams.length} done
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Mobile Horizontal Pill Bar */}
      <div className="lg:hidden">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
          <button
            onClick={() => onSelectWoid(null)}
            className="snap-start flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap border"
            style={{
              backgroundColor: selectedWoid === null ? colors.primary : "white",
              color: selectedWoid === null ? "white" : "#374151",
              borderColor: selectedWoid === null ? colors.primary : "#e5e7eb",
            }}
          >
            All
          </button>
          {woids.map((woid) => {
            const status = getWoidStatus(woid);
            const isSelected = selectedWoid === woid;
            return (
              <button
                key={woid}
                onClick={() => onSelectWoid(woid)}
                className="snap-start flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap border"
                style={{
                  backgroundColor: isSelected ? colors.primary : "white",
                  color: isSelected ? "white" : "#374151",
                  borderColor: isSelected ? colors.primary : "#e5e7eb",
                }}
              >
                <StatusDot status={status} />
                <span className="font-mono text-xs">{woid}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

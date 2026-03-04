"use client";

import { Users, Star } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface TeamsPanelProps {
  woidTeamMap: Map<string, Array<{ taskForceId: string; teamName: string; status: string; completionDate?: number }>>;
  selectedWoid: string | null;
  formatDate: (timestamp: number) => string;
  priorityTeamId?: Id<"taskForces">;
}

function TeamStatusBadge({ status }: { status: string }) {
  let classes = "bg-gray-100 text-gray-700";
  if (status === "complete") {
    classes = "bg-green-100 text-green-800";
  } else if (status === "void") {
    classes = "bg-orange-100 text-orange-800";
  } else if (status === "in_progress") {
    classes = "bg-blue-100 text-blue-800";
  }

  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${classes}`}>
      {status || "Not Started"}
    </span>
  );
}

export default function TeamsPanel({
  woidTeamMap,
  selectedWoid,
  formatDate,
  priorityTeamId,
}: TeamsPanelProps) {
  const entries = Array.from(woidTeamMap.entries()).filter(
    ([woid]) => !selectedWoid || woid === selectedWoid
  );

  if (entries.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No team assignments found</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {entries.map(([woid, teams]) => {
        const completedCount = teams.filter((t) => t.status === "complete").length;
        return (
          <div key={woid}>
            {/* WOID header */}
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-sm font-mono font-bold text-gray-900">{woid}</h3>
              <span className="text-xs text-gray-400">
                {completedCount}/{teams.length} complete
              </span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>

            {/* Team cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {teams.map((team, idx) => {
                const isPriorityTeam = priorityTeamId && team.taskForceId === priorityTeamId;
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-4 rounded-xl border ${
                      isPriorityTeam
                        ? "border-yellow-400 bg-yellow-50 ring-2 ring-yellow-400 ring-opacity-30"
                        : "border-gray-200 bg-white"
                    } hover:shadow-sm transition-shadow`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${
                        isPriorityTeam ? "bg-yellow-100" : "bg-gray-100"
                      } flex items-center justify-center text-gray-600 font-semibold text-sm relative`}>
                        {isPriorityTeam && (
                          <Star className="absolute -top-1 -right-1 w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                        {team.teamName?.slice(0, 2).toUpperCase() || "TM"}
                      </div>
                      <div>
                        <div className="font-medium text-sm text-gray-900 flex items-center gap-1.5">
                          {team.teamName}
                          {isPriorityTeam && (
                            <span className="text-xs text-yellow-600 font-semibold">(Priority)</span>
                          )}
                        </div>
                        {team.completionDate && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            Completed {formatDate(team.completionDate)}
                          </div>
                        )}
                      </div>
                    </div>
                    <TeamStatusBadge status={team.status} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

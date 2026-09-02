"use client";

import { Users, Star, Settings2 } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

interface TeamsPanelProps {
  woidTeamMap: Map<string, Array<{ taskForceId: string; teamName: string; status: string; completionDate?: number }>>;
  selectedWoid: string | null;
  formatDate: (timestamp: number) => string;
  priorityTeamId?: Id<"taskForces">;
  projectId?: Id<"projects">;
  organizationId?: string;
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
  projectId,
  organizationId,
}: TeamsPanelProps) {
  const { userId } = useAuth();
  const [expandedWoid, setExpandedWoid] = useState<string | null>(null);
  
  // Get current user to check if admin
  const convexUser = useQuery(
    api.users.getCurrentUser,
    userId ? undefined : "skip"
  );
  
  // Get all task forces for the project to show in dropdown
  const taskForces = useQuery(
    api.taskForce_project.getTaskForcesByProject,
    projectId ? { projectId } : "skip"
  );
  
  // Get priority team overrides for all WOIDs
  const workOrderIds = Array.from(woidTeamMap.keys());
  const priorityTeamOverrides = useQuery(
    api.woidAssignments.getPriorityTeamOverrides,
    projectId && workOrderIds.length > 0
      ? { workOrderIds, projectId }
      : "skip"
  );
  
  // Mutation to set priority team override
  const setPriorityTeamOverride = useMutation(api.woidAssignments.setPriorityTeamOverride);
  
  // Check if user is admin
  const isAdmin = convexUser?.organizationIds?.some(
    (org: { organizationId: string; role: string }) =>
      org.organizationId === organizationId && org.role === "admin"
  ) || false;
  
  const entries = Array.from(woidTeamMap.entries()).filter(
    ([woid]) => !selectedWoid || woid === selectedWoid
  );
  
  const handleSetOverride = async (woid: string, teamId: Id<"taskForces"> | null) => {
    if (!projectId || !organizationId || !userId) return;
    
    try {
      // Construct token identifier matching the app's format
      const clerkHostname = process.env.NEXT_PUBLIC_CLERK_HOSTNAME || "clerk.buildsimpli.com";
      const tokenIdentifier = `https://${clerkHostname}|${userId}`;
      
      await setPriorityTeamOverride({
        workOrderId: woid,
        projectId,
        priorityTeamId: teamId,
        organizationId,
        tokenIdentifier,
      });
      
      setExpandedWoid(null);
    } catch (error) {
      console.error("Failed to set priority team override:", error);
      alert(`Failed to set override: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

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
        // Get effective priority team (override takes precedence)
        const overrideTeamId = priorityTeamOverrides?.[woid];
        const effectivePriorityTeamId = overrideTeamId || priorityTeamId;
        const hasOverride = !!overrideTeamId;
        
        return (
          <div key={woid}>
            {/* WOID header */}
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-sm font-mono font-bold text-gray-900">{woid}</h3>
              <span className="text-xs text-gray-400">
                {completedCount}/{teams.length} complete
              </span>
              {hasOverride && (
                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                  Override
                </span>
              )}
              {isAdmin && (
                <button
                  onClick={() => setExpandedWoid(expandedWoid === woid ? null : woid)}
                  className="ml-auto p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Set priority team override"
                >
                  <Settings2 className="w-4 h-4 text-gray-500" />
                </button>
              )}
              <div className="h-px flex-1 bg-gray-100" />
            </div>
            
            {/* Admin override controls */}
            {isAdmin && expandedWoid === woid && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-xs font-semibold text-blue-900 mb-2">
                  Priority Team Override (Admin Only)
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleSetOverride(woid, null)}
                    className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                      !hasOverride
                        ? "bg-gray-200 text-gray-700 cursor-not-allowed"
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                    disabled={!hasOverride}
                  >
                    Use Project Default
                  </button>
                  {taskForces?.map((team: Doc<"taskForces">) => (
                    <button
                      key={team._id}
                      onClick={() => handleSetOverride(woid, team._id)}
                      className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                        overrideTeamId === team._id
                          ? "bg-blue-600 text-white"
                          : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {team.name}
                    </button>
                  ))}
                </div>
                {hasOverride && (
                  <div className="mt-2 text-xs text-blue-700">
                    Current override: {taskForces?.find((t: Doc<"taskForces">) => t._id === overrideTeamId)?.name || "Unknown"}
                  </div>
                )}
              </div>
            )}

            {/* Team cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {teams.map((team, idx) => {
                const isPriorityTeam = effectivePriorityTeamId && team.taskForceId === effectivePriorityTeamId;
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
                            <span className={`text-xs font-semibold ${
                              hasOverride ? "text-blue-600" : "text-yellow-600"
                            }`}>
                              ({hasOverride ? "Override" : "Priority"})
                            </span>
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

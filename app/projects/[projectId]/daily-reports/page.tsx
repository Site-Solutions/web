"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { buildClerkTokenIdentifier } from "@/lib/clerkToken";
import {
  getLocalDateUTCStart,
  utcDayTimestampToLocalDate,
} from "@/lib/time";
import { formatUTCDate } from "@/lib/dateFormat";
import { colors } from "@/lib/colors";
import { ArrowLeft, CalendarDays } from "lucide-react";
import ProjectNav from "@/components/ProjectNav";

type CompletionStatus = "complete" | "void" | "incomplete";

function statusBadgeClass(status: CompletionStatus): string {
  if (status === "complete") return "bg-green-100 text-green-800";
  if (status === "void") return "bg-amber-100 text-amber-900";
  return "bg-gray-100 text-gray-700";
}

export default function ProjectDailyReportsPage() {
  const params = useParams();
  const projectId = params.projectId as Id<"projects">;
  const { userId: clerkUserId } = useAuth();
  const tokenIdentifier = buildClerkTokenIdentifier(clerkUserId ?? undefined);

  const user = useQuery(api.users.getCurrentUser);
  const organizationId = user?.organizationIds?.[0]?.organizationId;

  const project = useQuery(
    api.projects.getProject,
    projectId ? { projectId } : "skip"
  );

  // Date + team live in the URL (?date=YYYY-MM-DD&team=…) so that coming BACK
  // from a report restores the same view. With component state only, back
  // remounted this page reset to today/first team — losing the user's place.
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [date, setDate] = useState<number>(() => {
    const q = searchParams.get("date");
    if (q) {
      const [y, m, d] = q.split("-").map(Number);
      if (y && m && d) return getLocalDateUTCStart(new Date(y, m - 1, d));
    }
    return getLocalDateUTCStart(null);
  });
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(
    () => searchParams.get("team"),
  );
  const [filters, setFilters] = useState<CompletionStatus[]>([
    "complete",
    "void",
    "incomplete",
  ]);

  const taskForces = useQuery(
    api.taskForce_project.getTaskForcesByProjectAndUserToken,
    projectId && tokenIdentifier && organizationId
      ? { projectId, tokenIdentifier, organizationId }
      : "skip"
  );

  const selectedTaskForce = useMemo(() => {
    if (!taskForces?.length) return undefined;
    if (selectedTeamId) {
      return taskForces.find((t: Doc<"taskForces">) => t._id === selectedTeamId) ?? taskForces[0];
    }
    return taskForces[0];
  }, [taskForces, selectedTeamId]);

  useEffect(() => {
    if (taskForces?.length && !selectedTeamId) {
      setSelectedTeamId(taskForces[0]._id);
    }
  }, [taskForces, selectedTeamId]);

  const dailyReports = useQuery(
    api.dailyReports.getDailyReportByDateAndProjectId,
    projectId && selectedTaskForce
      ? { projectId, taskForce: selectedTaskForce, date }
      : "skip"
  );

  const filteredReports = useMemo(() => {
    if (!dailyReports) return [];
    return dailyReports.filter((r: Doc<"dailyReports">) => filters.includes(r.completionStatus));
  }, [dailyReports, filters]);

  const dateInputValue = useMemo(() => {
    const local = utcDayTimestampToLocalDate(date);
    const y = local.getFullYear();
    const m = String(local.getMonth() + 1).padStart(2, "0");
    const d = String(local.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [date]);

  useEffect(() => {
    const q = new URLSearchParams();
    q.set("date", dateInputValue);
    if (selectedTeamId) q.set("team", selectedTeamId);
    const next = `${pathname}?${q.toString()}`;
    if (`${pathname}?${searchParams.toString()}` !== next) {
      router.replace(next, { scroll: false });
    }
  }, [dateInputValue, selectedTeamId, pathname, router, searchParams]);

  const onDateInput = useCallback((iso: string) => {
    if (!iso) return;
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return;
    setDate(getLocalDateUTCStart(new Date(y, m - 1, d)));
  }, []);

  const toggleFilter = (s: CompletionStatus) => {
    setFilters((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  if (user === undefined || project === undefined) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-gray-500">
        Loading…
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <p className="text-gray-700">Project not found or no access.</p>
        <Link
          href="/projects"
          className="mt-4 inline-flex items-center text-sm font-medium"
          style={{ color: colors.primary }}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to projects
        </Link>
      </div>
    );
  }

  return (
    <>
    <ProjectNav projectId={projectId} />
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/projects"
        className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Projects
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily reports</h1>
          <p className="mt-1 text-gray-600">{project.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
            <CalendarDays className="h-4 w-4 text-gray-500" />
            <span className="sr-only">Date</span>
            <input
              type="date"
              value={dateInputValue}
              max={(() => {
                const t = getLocalDateUTCStart(null);
                const l = utcDayTimestampToLocalDate(t);
                const y = l.getFullYear();
                const m = String(l.getMonth() + 1).padStart(2, "0");
                const d = String(l.getDate()).padStart(2, "0");
                return `${y}-${m}-${d}`;
              })()}
              onChange={(e) => onDateInput(e.target.value)}
              className="border-0 p-0 text-gray-900 focus:ring-0"
            />
          </label>
        </div>
      </div>

      <p className="mt-2 text-sm text-gray-500">
        Showing {formatUTCDate(date)} (local calendar day)
      </p>

      {taskForces === undefined ? (
        <p className="mt-8 text-gray-500">Loading teams…</p>
      ) : taskForces.length === 0 ? (
        <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 text-sm">
          No teams are assigned to you on this project. Daily reports are
          organized by team—ask an admin to add you to a team or assign a
          supervisor role.
        </div>
      ) : (
        <>
          <div className="mt-6">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Team
            </label>
            <select
              value={selectedTaskForce?._id ?? ""}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="block w-full max-w-md rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm text-gray-900"
            >
              {taskForces.map((tf: Doc<"taskForces">) => (
                <option key={tf._id} value={tf._id}>
                  {tf.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {(
              [
                ["complete", "Complete"],
                ["void", "Void"],
                ["incomplete", "Incomplete"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => toggleFilter(value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  filters.includes(value)
                    ? "text-white border-transparent"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
                style={
                  filters.includes(value)
                    ? { backgroundColor: colors.primary }
                    : undefined
                }
              >
                {label}
              </button>
            ))}
          </div>

          {dailyReports === undefined ? (
            <p className="mt-8 text-gray-500">Loading reports…</p>
          ) : filteredReports.length === 0 ? (
            <p className="mt-8 text-gray-600">
              No reports for this team and date with the selected statuses.
            </p>
          ) : (
            <div className="mt-8 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      Work order
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      Task #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      Address
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredReports.map((r: Doc<"dailyReports">) => {
                    const addr =
                      r.details &&
                      typeof r.details === "object" &&
                      "Address" in r.details
                        ? String((r.details as Record<string, string>).Address)
                        : "—";
                    return (
                      <tr key={r._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                          {r.workOrderId || "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {r.taskOrderId}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass(
                              r.completionStatus
                            )}`}
                          >
                            {r.completionStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                          {addr}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/projects/${projectId}/daily-reports/${r._id}`}
                            className="text-sm font-medium"
                            style={{ color: colors.primary }}
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
    </>
  );
}

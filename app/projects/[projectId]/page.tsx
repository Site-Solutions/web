"use client";

/**
 * Project Home hub — the web mirror of the mobile app's ProjectHomeView:
 * a week calendar strip, per-team "N stops — X complete, Y incomplete"
 * cards and job cards for the selected day, and a quick-access grid to
 * every project section.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  FileText,
  Briefcase,
  Receipt,
  ClipboardList,
  AlertTriangle,
  Wrench,
  CalendarClock,
  Images,
  FolderOpen,
  ChevronRight,
} from "lucide-react";
import WeekStrip from "@/components/WeekStrip";
import { colors } from "@/lib/colors";

// The deployed Convex getActivityInRange has returned two shapes over time
// (aggregate per team/day vs one row per report). Read whichever the row has —
// same guard the mobile app ships in ProjectHomeView.
const reportCounts = (r: any): { total: number; complete: number; incomplete: number } => {
  if (typeof r?.completionStatus === "string") {
    return {
      total: 1,
      complete: r.completionStatus === "complete" ? 1 : 0,
      incomplete: r.completionStatus === "incomplete" ? 1 : 0,
    };
  }
  return {
    total: Number(r?.total ?? 1),
    complete: Number(r?.complete ?? 0),
    incomplete: Number(r?.incomplete ?? 0),
  };
};

const SECTIONS = [
  { segment: "daily-reports", label: "Daily Reports", Icon: FileText },
  { segment: "jobs", label: "Jobs", Icon: Briefcase },
  { segment: "invoices", label: "Invoices", Icon: Receipt },
  { segment: "task-lists", label: "Task Lists", Icon: ClipboardList },
  { segment: "incidents", label: "Incidents", Icon: AlertTriangle },
  { segment: "toolbox-talks", label: "Toolbox Talks", Icon: Wrench },
  { segment: "schedules", label: "Schedules", Icon: CalendarClock },
  { segment: "photos", label: "Photos", Icon: Images },
  { segment: "files", label: "Files", Icon: FolderOpen },
];

/** UTC-midnight timestamp for a local calendar date — how report dates are stored. */
const utcStart = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

export default function ProjectHomePage() {
  const params = useParams();
  const projectId = params.projectId as Id<"projects">;

  const project = useQuery(api.projects.getProject, projectId ? { projectId } : "skip");

  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const range = useMemo(() => {
    const now = new Date();
    return {
      startDate: utcStart(now) - 30 * 86400000,
      endDate: utcStart(now) + 30 * 86400000,
    };
  }, []);
  const activity = useQuery(
    api.projectCalendar.getActivityInRange,
    projectId ? { projectId, ...range } : "skip",
  );

  const activityDates = useMemo(() => {
    const s = new Set<number>();
    for (const r of activity?.reports ?? []) s.add((r as any).date);
    for (const j of activity?.jobs ?? []) {
      if ((j as any).status !== "cancelled") s.add((j as any).activityDate);
    }
    return s;
  }, [activity]);

  const dayStart = utcStart(selectedDate);

  const teamCards = useMemo(() => {
    const byTeam = new Map<string, { total: number; complete: number; incomplete: number }>();
    for (const r of activity?.reports ?? []) {
      if ((r as any).date !== dayStart) continue;
      const team = ((r as any).teamName || "Unassigned").trim() || "Unassigned";
      const c = reportCounts(r);
      const e = byTeam.get(team) || { total: 0, complete: 0, incomplete: 0 };
      e.total += c.total;
      e.complete += c.complete;
      e.incomplete += c.incomplete;
      byTeam.set(team, e);
    }
    return Array.from(byTeam.entries());
  }, [activity, dayStart]);

  const dayJobs = useMemo(
    () =>
      (activity?.jobs ?? []).filter(
        (j: any) => j.activityDate === dayStart && j.status !== "cancelled",
      ),
    [activity, dayStart],
  );

  const base = `/projects/${projectId}`;

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {/* Brand header, like the app's project screen */}
      <div className="px-4 pb-10 pt-6 text-white" style={{ backgroundColor: colors.primary }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/projects" className="text-sm font-medium text-white/80 hover:text-white">
            ← Projects
          </Link>
          <h1 className="text-lg font-bold">{project?.name ?? "…"}</h1>
          <Link
            href={`${base}/schedules`}
            className="text-sm font-medium text-white/80 hover:text-white"
          >
            Schedules
          </Link>
        </div>
      </div>

      <div className="mx-auto -mt-6 max-w-3xl space-y-4 px-4">
        <WeekStrip
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          hasDot={(d) => activityDates.has(utcStart(d))}
        />

        {/* Day activity — team stop cards + jobs, like the app's day list */}
        <div className="space-y-2">
          {teamCards.map(([team, c]) => (
            <Link
              key={team}
              href={`${base}/daily-reports`}
              className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${colors.primary}1A` }}
              >
                <FileText size={22} style={{ color: colors.primary }} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-gray-900">
                  {team === "Unassigned" ? `${c.total} stop${c.total === 1 ? "" : "s"} on Daily Route` : `${team} has ${c.total} stop${c.total === 1 ? "" : "s"}`}
                </span>
                <span className="block text-sm text-gray-400">
                  {c.complete} complete, {c.incomplete} incomplete
                </span>
              </span>
              <ChevronRight size={20} className="text-gray-300" />
            </Link>
          ))}

          {dayJobs.map((j: any, i: number) => (
            <Link
              key={j.jobId ?? j._id ?? i}
              href={j.jobId || j._id ? `${base}/jobs/${j.jobId ?? j._id}` : `${base}/jobs`}
              className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50">
                <Briefcase size={22} className="text-indigo-500" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-gray-900">{j.title ?? "Job"}</span>
                <span className="block truncate text-sm text-gray-400">
                  {[j.clientName, j.taskCount != null ? `${j.taskCount} task${j.taskCount === 1 ? "" : "s"}` : null]
                    .filter(Boolean)
                    .join(" · ") || "Scheduled"}
                </span>
              </span>
              <ChevronRight size={20} className="text-gray-300" />
            </Link>
          ))}

          {activity && teamCards.length === 0 && dayJobs.length === 0 && (
            <div className="rounded-2xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
              Nothing scheduled this day
            </div>
          )}
          {!activity && (
            <div className="rounded-2xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
              Loading activity…
            </div>
          )}
        </div>

        {/* Quick access grid — the app's section cards */}
        <div>
          <h2 className="mb-2 mt-4 px-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Quick Access
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {SECTIONS.map(({ segment, label, Icon }) => (
              <Link
                key={segment}
                href={`${base}/${segment}`}
                className="flex flex-col items-center gap-2 rounded-2xl bg-white px-2 py-4 text-center shadow-sm transition-shadow hover:shadow-md"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${colors.primary}1A` }}
                >
                  <Icon size={20} style={{ color: colors.primary }} />
                </span>
                <span className="text-xs font-medium text-gray-800">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

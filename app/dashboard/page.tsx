"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useOrg } from "@/lib/useOrg";
import {
  getLocalDateUTCStart,
  utcDayTimestampToLocalDate,
} from "@/lib/time";
import {
  Card,
  CardHeader,
  PageContainer,
  PageHeader,
  LoadingState,
  EmptyState,
  Badge,
  Input,
} from "@/components/ui";
import {
  Lock,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Users,
} from "lucide-react";

type DailyOverviewEntry = {
  projectId: Id<"projects">;
  stats: {
    projectName: string;
    tasksCompletedToday: number;
    incidentsReportedToday: number;
    toolboxTalksToday: number;
    activeTeamsToday: number;
    teamActivity: Array<{
      teamId: Id<"taskForces">;
      teamName: string;
      completionsToday: number;
      dailyReportsCompleted: number;
      dailyReportsTotal: number;
      totalMembers: number;
      activeMembers: number;
    }>;
  };
};

function dateInputValue(utcTs: number): string {
  const d = utcDayTimestampToLocalDate(utcTs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function MiniStat({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
      <span style={{ color: accent }}>{icon}</span>
      <div>
        <p className="text-lg font-bold leading-none text-gray-900">{value}</p>
        <p className="mt-0.5 text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function DailyOverviewPage() {
  const { organizationId, user, isSupervisor, isLoading } = useOrg();
  const tokenIdentifier = user?.tokenIdentifier;

  const [date, setDate] = useState<number>(() => getLocalDateUTCStart(null));

  const overview = useQuery(
    api.adminDashboard.getDailyOverviewForDate,
    organizationId && tokenIdentifier
      ? { organizationId, tokenIdentifier, date }
      : "skip"
  ) as DailyOverviewEntry[] | undefined;

  const selectedLabel = useMemo(
    () =>
      utcDayTimestampToLocalDate(date).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [date]
  );

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState />
      </PageContainer>
    );
  }

  if (!isSupervisor) {
    return (
      <PageContainer>
        <PageHeader title="Daily Overview" backHref="/" />
        <EmptyState
          icon={<Lock className="h-10 w-10" />}
          title="Admins and supervisors only"
          description="The daily overview is restricted to leadership roles in your organization."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Daily Overview"
        subtitle="Completion stats across your accessible projects"
        backHref="/"
        actions={
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-gray-400" />
            <Input
              type="date"
              value={dateInputValue(date)}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                const [y, m, d] = v.split("-").map(Number);
                setDate(getLocalDateUTCStart(new Date(y, m - 1, d)));
              }}
              className="w-auto"
            />
          </div>
        }
      />

      <p className="mb-5 text-sm font-medium text-gray-600">{selectedLabel}</p>

      {overview === undefined ? (
        <LoadingState />
      ) : overview.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-10 w-10" />}
          title="No activity for this date"
          description="No projects had daily reports scheduled for the selected day. Try another date."
        />
      ) : (
        <div className="space-y-5">
          {overview.map((entry) => {
            const { stats } = entry;
            const reportsCompleted = stats.teamActivity.reduce(
              (sum, t) => sum + t.dailyReportsCompleted,
              0
            );
            const reportsTotal = stats.teamActivity.reduce(
              (sum, t) => sum + t.dailyReportsTotal,
              0
            );
            const reportsIncomplete = Math.max(
              0,
              reportsTotal - reportsCompleted
            );

            return (
              <Card key={entry.projectId}>
                <CardHeader
                  title={stats.projectName}
                  subtitle={`${reportsCompleted} of ${reportsTotal} daily report${
                    reportsTotal === 1 ? "" : "s"
                  } complete`}
                  action={
                    <Badge
                      tone={
                        reportsTotal > 0 && reportsIncomplete === 0
                          ? "green"
                          : reportsIncomplete > 0
                            ? "yellow"
                            : "gray"
                      }
                    >
                      {reportsTotal > 0 && reportsIncomplete === 0
                        ? "All complete"
                        : `${reportsIncomplete} incomplete`}
                    </Badge>
                  }
                />

                <div className="grid grid-cols-2 gap-3 px-5 py-4 sm:grid-cols-4">
                  <MiniStat
                    label="Tasks completed"
                    value={stats.tasksCompletedToday}
                    icon={<CheckCircle2 className="h-5 w-5" />}
                    accent="#16a34a"
                  />
                  <MiniStat
                    label="Incidents"
                    value={stats.incidentsReportedToday}
                    icon={<AlertTriangle className="h-5 w-5" />}
                    accent="#dc2626"
                  />
                  <MiniStat
                    label="Toolbox talks"
                    value={stats.toolboxTalksToday}
                    icon={<ShieldCheck className="h-5 w-5" />}
                    accent="#2563eb"
                  />
                  <MiniStat
                    label="Active teams"
                    value={stats.activeTeamsToday}
                    icon={<Users className="h-5 w-5" />}
                    accent="#7c3aed"
                  />
                </div>

                {stats.teamActivity.length > 0 ? (
                  <div className="overflow-x-auto border-t border-gray-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                          <th className="px-5 py-3">Team</th>
                          <th className="px-5 py-3 text-center">
                            Reports complete
                          </th>
                          <th className="px-5 py-3 text-center">Incomplete</th>
                          <th className="px-5 py-3 text-center">Tasks done</th>
                          <th className="px-5 py-3 text-center">
                            Active members
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.teamActivity.map((t) => {
                          const incomplete = Math.max(
                            0,
                            t.dailyReportsTotal - t.dailyReportsCompleted
                          );
                          return (
                            <tr
                              key={t.teamId}
                              className="border-t border-gray-50"
                            >
                              <td className="px-5 py-3 font-medium text-gray-900">
                                {t.teamName}
                              </td>
                              <td className="px-5 py-3 text-center text-gray-700">
                                {t.dailyReportsCompleted}/{t.dailyReportsTotal}
                              </td>
                              <td className="px-5 py-3 text-center">
                                {incomplete > 0 ? (
                                  <span className="font-medium text-amber-700">
                                    {incomplete}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">0</span>
                                )}
                              </td>
                              <td className="px-5 py-3 text-center text-gray-700">
                                {t.completionsToday}
                              </td>
                              <td className="px-5 py-3 text-center text-gray-600">
                                {t.activeMembers}/{t.totalMembers}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}

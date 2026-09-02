"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useOrg } from "@/lib/useOrg";
import { buildClerkTokenIdentifier } from "@/lib/clerkToken";
import { formatUTCDate } from "@/lib/dateFormat";
import { getLocalDateUTCStart } from "@/lib/time";
import { humanize } from "@/lib/format";
import {
  Button,
  Card,
  Field,
  Input,
  Select,
  Badge,
  Modal,
  LoadingState,
  EmptyState,
  PageHeader,
  PageContainer,
  cx,
} from "@/components/ui";
import ProjectNav from "@/components/ProjectNav";
import {
  CalendarClock,
  Plus,
  Users,
  Play,
  Trash2,
  Repeat,
} from "lucide-react";

type RecurrencePattern =
  | "daily"
  | "weekdays"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "custom";

type ScheduleType = "daily_report" | "task_list" | "job";

type ScheduleRow = Doc<"schedules"> & { taskForceName: string };

type TaskForce = { _id: Id<"taskForces">; name: string };

const TYPE_LABELS: Record<ScheduleType, string> = {
  daily_report: "Daily Report",
  task_list: "Task List",
  job: "Job",
};

const PATTERN_OPTIONS: Array<{ value: RecurrencePattern; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays (Mon–Fri)" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom days" },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function recurrenceSummary(rec: ScheduleRow["recurrence"]): string {
  switch (rec.pattern) {
    case "daily":
      return "Every day";
    case "weekdays":
      return "Weekdays (Mon–Fri)";
    case "weekly":
    case "custom": {
      const days = (rec.daysOfWeek ?? [])
        .slice()
        .sort((a: number, b: number) => a - b)
        .map((d: number) => DAY_LABELS[d])
        .join(", ");
      return days ? `${rec.pattern === "weekly" ? "Weekly" : "Custom"} · ${days}` : "Weekly";
    }
    case "biweekly": {
      const days = (rec.daysOfWeek ?? [])
        .slice()
        .sort((a: number, b: number) => a - b)
        .map((d: number) => DAY_LABELS[d])
        .join(", ");
      return days ? `Every ${rec.interval ?? 2} weeks · ${days}` : "Biweekly";
    }
    case "monthly": {
      const days = (rec.daysOfMonth ?? []).slice().sort((a: number, b: number) => a - b).join(", ");
      return days ? `Monthly · day ${days}` : "Monthly";
    }
    default:
      return humanize(rec.pattern);
  }
}

export default function ProjectSchedulesPage() {
  const params = useParams();
  const projectId = params.projectId as Id<"projects">;

  const { user, organizationId, isLoading, hasOrg } = useOrg();
  const { userId: clerkUserId } = useAuth();
  const tokenIdentifier = buildClerkTokenIdentifier(clerkUserId ?? undefined);

  const schedules = useQuery(
    api.schedules.getByProject,
    projectId ? { projectId } : "skip"
  ) as ScheduleRow[] | undefined;

  const teams = useQuery(
    api.taskForce_project.getTaskForcesByProjectAndUserToken,
    projectId && tokenIdentifier && organizationId
      ? { projectId, tokenIdentifier, organizationId }
      : "skip"
  ) as TaskForce[] | undefined;

  const createSchedule = useMutation(api.schedules.create);
  const toggleActive = useMutation(api.schedules.toggleActive);
  const triggerGenerate = useMutation(api.schedules.triggerGenerate);
  const removeSchedule = useMutation(api.schedules.remove);

  const [modalOpen, setModalOpen] = useState(false);

  // Create-form state
  const [name, setName] = useState("");
  const [type, setType] = useState<ScheduleType>("daily_report");
  const [teamId, setTeamId] = useState<string>("");
  const [pattern, setPattern] = useState<RecurrencePattern>("weekdays");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [daysOfMonth, setDaysOfMonth] = useState<string>("1");
  const [interval, setIntervalValue] = useState<number>(2);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [endDate, setEndDate] = useState<string>("");

  // job-only fields
  const [jobTitle, setJobTitle] = useState("");
  const [jobAddress, setJobAddress] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default team selection once teams load.
  useEffect(() => {
    if (teams?.length && !teamId) setTeamId(teams[0]._id);
  }, [teams, teamId]);

  const sorted = useMemo(() => {
    if (!schedules) return [];
    return schedules
      .slice()
      .sort((a: ScheduleRow, b: ScheduleRow) => b.createdAt - a.createdAt);
  }, [schedules]);

  function toggleDayOfWeek(day: number) {
    setDaysOfWeek((prev: number[]) =>
      prev.includes(day) ? prev.filter((d: number) => d !== day) : [...prev, day]
    );
  }

  function resetForm() {
    setName("");
    setType("daily_report");
    setTeamId(teams?.[0]?._id ?? "");
    setPattern("weekdays");
    setDaysOfWeek([1, 2, 3, 4, 5]);
    setDaysOfMonth("1");
    setIntervalValue(2);
    const d = new Date();
    setStartDate(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
    setEndDate("");
    setJobTitle("");
    setJobAddress("");
    setError(null);
  }

  async function handleCreate() {
    if (!user || !organizationId) return;
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!teamId) {
      setError("Select a team.");
      return;
    }
    const needsDow = pattern === "weekly" || pattern === "biweekly" || pattern === "custom";
    if (needsDow && daysOfWeek.length === 0) {
      setError("Select at least one day of the week.");
      return;
    }
    const parsedDaysOfMonth =
      pattern === "monthly"
        ? daysOfMonth
            .split(",")
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => Number.isInteger(n) && n >= 1 && n <= 31)
        : [];
    if (pattern === "monthly" && parsedDaysOfMonth.length === 0) {
      setError("Enter at least one day of the month (1–31).");
      return;
    }
    if (type === "job" && (!jobTitle.trim() || !jobAddress.trim())) {
      setError("Job schedules need a title and address.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createSchedule({
        projectId,
        taskForceId: teamId as Id<"taskForces">,
        organizationId,
        name: name.trim(),
        type,
        recurrence: {
          pattern,
          daysOfWeek: needsDow ? daysOfWeek : undefined,
          daysOfMonth: pattern === "monthly" ? parsedDaysOfMonth : undefined,
          interval: pattern === "biweekly" ? interval : undefined,
        },
        startDate: getLocalDateUTCStart(new Date(startDate)),
        endDate: endDate ? getLocalDateUTCStart(new Date(endDate)) : undefined,
        createdBy: user._id as Id<"users">,
        ...(type === "job"
          ? {
              jobTemplate: {
                title: jobTitle.trim(),
                address: jobAddress.trim(),
                tasks: [],
              },
            }
          : {}),
      });
      // Materialize instances immediately so the calendar / jobs list pick them up.
      try {
        await triggerGenerate({});
      } catch {
        // non-fatal — the cron will catch up
      }
      resetForm();
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create schedule.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(scheduleId: Id<"schedules">) {
    try {
      await toggleActive({ scheduleId });
    } catch {
      // surfaced via reactive state; nothing else to do
    }
  }

  async function handleRunNow() {
    setRunning(true);
    try {
      await triggerGenerate({});
    } catch {
      // non-fatal
    } finally {
      setRunning(false);
    }
  }

  async function handleDelete(scheduleId: Id<"schedules">) {
    if (!window.confirm("Delete this schedule? Future generated items will stop.")) {
      return;
    }
    try {
      await removeSchedule({ scheduleId });
    } catch {
      // non-fatal
    }
  }

  const ready = !isLoading && hasOrg;
  const needsDow = pattern === "weekly" || pattern === "biweekly" || pattern === "custom";

  return (
    <>
      <ProjectNav projectId={projectId} />
      <PageContainer>
        <PageHeader
          title="Schedules"
          subtitle="Recurring daily reports, task lists, and jobs."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                leftIcon={<Play className="h-4 w-4" />}
                onClick={handleRunNow}
                loading={running}
                disabled={!ready}
              >
                Run now
              </Button>
              <Button
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setModalOpen(true)}
                disabled={!ready}
              >
                New Schedule
              </Button>
            </div>
          }
        />

        {isLoading || schedules === undefined ? (
          <LoadingState label="Loading schedules…" />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="h-8 w-8" />}
            title="No schedules yet"
            description="Create a recurring schedule to auto-generate daily reports, task lists, or jobs."
            action={
              <Button
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setModalOpen(true)}
                disabled={!ready}
              >
                New Schedule
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3">
            {sorted.map((s: ScheduleRow) => (
              <Card key={s._id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-base font-semibold text-gray-900">
                        {s.name}
                      </h3>
                      <Badge tone="blue">{TYPE_LABELS[s.type as ScheduleType] ?? s.type}</Badge>
                      <Badge tone={s.isActive ? "green" : "gray"}>
                        {s.isActive ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Repeat className="h-4 w-4" />
                        {recurrenceSummary(s.recurrence)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {s.taskForceName}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-4 w-4" />
                        Starts {formatUTCDate(s.startDate)}
                        {s.endDate ? ` · ends ${formatUTCDate(s.endDate)}` : ""}
                      </span>
                      {s.lastRunDate ? (
                        <span className="text-gray-400">
                          Last run {formatUTCDate(s.lastRunDate)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleToggle(s._id)}
                    >
                      {s.isActive ? "Pause" : "Resume"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(s._id)}
                      aria-label="Delete schedule"
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Modal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            resetForm();
          }}
          title="New Schedule"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setModalOpen(false);
                  resetForm();
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} loading={submitting}>
                Create Schedule
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <Field label="Name" htmlFor="sched-name" required>
              <Input
                id="sched-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Morning crew daily report"
              />
            </Field>

            <Field label="Type" htmlFor="sched-type">
              <Select
                id="sched-type"
                value={type}
                onChange={(e) => setType(e.target.value as ScheduleType)}
              >
                <option value="daily_report">Daily Report</option>
                <option value="task_list">Task List</option>
                <option value="job">Job</option>
              </Select>
            </Field>

            <Field label="Team" htmlFor="sched-team" required>
              <Select
                id="sched-team"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
              >
                <option value="">Select a team</option>
                {(teams ?? []).map((t: TaskForce) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>

            {type === "job" ? (
              <>
                <Field label="Job title" htmlFor="sched-job-title" required>
                  <Input
                    id="sched-job-title"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Weekly site inspection"
                  />
                </Field>
                <Field label="Job address" htmlFor="sched-job-address" required>
                  <Input
                    id="sched-job-address"
                    value={jobAddress}
                    onChange={(e) => setJobAddress(e.target.value)}
                    placeholder="123 Main St"
                  />
                </Field>
              </>
            ) : null}

            <Field label="Frequency" htmlFor="sched-pattern">
              <Select
                id="sched-pattern"
                value={pattern}
                onChange={(e) => setPattern(e.target.value as RecurrencePattern)}
              >
                {PATTERN_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>

            {needsDow ? (
              <Field label="Days of week">
                <div className="flex flex-wrap gap-1.5">
                  {DAY_LABELS.map((label, idx) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleDayOfWeek(idx)}
                      className={cx(
                        "rounded-md border px-3 py-1.5 text-sm font-medium",
                        daysOfWeek.includes(idx)
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Field>
            ) : null}

            {pattern === "biweekly" ? (
              <Field label="Interval (weeks)" htmlFor="sched-interval">
                <Input
                  id="sched-interval"
                  type="number"
                  min={1}
                  value={interval}
                  onChange={(e) =>
                    setIntervalValue(Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                />
              </Field>
            ) : null}

            {pattern === "monthly" ? (
              <Field
                label="Days of month"
                htmlFor="sched-dom"
                hint="Comma-separated, 1–31 (e.g. 1, 15)"
              >
                <Input
                  id="sched-dom"
                  value={daysOfMonth}
                  onChange={(e) => setDaysOfMonth(e.target.value)}
                  placeholder="1, 15"
                />
              </Field>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date" htmlFor="sched-start" required>
                <Input
                  id="sched-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </Field>
              <Field label="End date" htmlFor="sched-end" hint="Optional">
                <Input
                  id="sched-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </Field>
            </div>
          </div>
        </Modal>
      </PageContainer>
    </>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useOrg } from "@/lib/useOrg";
import { formatUTCDate } from "@/lib/dateFormat";
import { humanize } from "@/lib/format";
import {
  Button,
  Card,
  Field,
  Input,
  Textarea,
  Select,
  Modal,
  LoadingState,
  EmptyState,
  StatusBadge,
  PageHeader,
  PageContainer,
} from "@/components/ui";
import ProjectNav from "@/components/ProjectNav";
import {
  Briefcase,
  Plus,
  MapPin,
  User as UserIcon,
  CalendarDays,
  CheckSquare,
  Trash2,
} from "lucide-react";

type JobRow = Doc<"jobs"> & {
  clientName: string | null;
  taskCount: number;
  completedTaskCount: number;
  scheduleInfo: string | null;
};

type StatusFilter = "all" | "active" | "completed" | "cancelled";

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

type DraftTask = { id: string; name: string };

function makeTaskId(): string {
  return Math.random().toString(36).slice(2);
}

export default function ProjectJobsPage() {
  const params = useParams();
  const projectId = params.projectId as Id<"projects">;

  const { user, organizationId, isLoading, hasOrg } = useOrg();

  const jobs = useQuery(
    api.jobs.getByProject,
    projectId ? { projectId } : "skip"
  ) as JobRow[] | undefined;

  const clients = useQuery(
    api.clients.getClientsByProject,
    projectId ? { projectId } : "skip"
  ) as Array<Doc<"clients">> | undefined;

  const createJob = useMutation(api.jobs.create);

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [modalOpen, setModalOpen] = useState(false);

  // Create-form state
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [tasks, setTasks] = useState<DraftTask[]>([]);
  const [newTaskName, setNewTaskName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];
    if (filter === "all") return jobs;
    return jobs.filter((j: JobRow) => j.status === filter);
  }, [jobs, filter]);

  function resetForm() {
    setTitle("");
    setAddress("");
    setClientId("");
    setNotes("");
    setTasks([]);
    setNewTaskName("");
    setError(null);
  }

  function addDraftTask() {
    const name = newTaskName.trim();
    if (!name) return;
    setTasks((prev: DraftTask[]) => [...prev, { id: makeTaskId(), name }]);
    setNewTaskName("");
  }

  function removeDraftTask(id: string) {
    setTasks((prev: DraftTask[]) => prev.filter((t: DraftTask) => t.id !== id));
  }

  async function handleCreate() {
    if (!user || !organizationId) return;
    if (!title.trim() || !address.trim()) {
      setError("Title and address are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createJob({
        organizationId,
        projectId,
        title: title.trim(),
        address: address.trim(),
        clientId: clientId ? (clientId as Id<"clients">) : undefined,
        notes: notes.trim() ? notes.trim() : undefined,
        tasks: tasks.map((t: DraftTask, i: number) => ({
          name: t.name,
          sortOrder: i,
        })),
        createdBy: user._id as Id<"users">,
      });
      resetForm();
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job.");
    } finally {
      setSubmitting(false);
    }
  }

  const ready = !isLoading && hasOrg;

  return (
    <>
      <ProjectNav projectId={projectId} />
      <PageContainer>
        <PageHeader
          title="Jobs"
          subtitle="Track on-site work, tasks, and client updates."
          actions={
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setModalOpen(true)}
              disabled={!ready}
            >
              New Job
            </Button>
          }
        />

        <div className="mb-6 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={
                filter === f.value
                  ? "rounded-full border border-gray-900 bg-gray-900 px-3 py-1.5 text-sm font-medium text-white"
                  : "rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading || jobs === undefined ? (
          <LoadingState label="Loading jobs…" />
        ) : filteredJobs.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="h-8 w-8" />}
            title={filter === "all" ? "No jobs yet" : `No ${filter} jobs`}
            description="Create a job to start tracking site work and tasks."
            action={
              <Button
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setModalOpen(true)}
                disabled={!ready}
              >
                New Job
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3">
            {filteredJobs.map((job: JobRow) => (
              <Link
                key={job._id}
                href={`/projects/${projectId}/jobs/${job._id}`}
                className="block"
              >
                <Card className="px-5 py-4 transition-colors hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-gray-900">
                          {job.title}
                        </h3>
                        <StatusBadge status={humanize(job.status)} />
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="truncate">{job.address}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                        {job.clientName ? (
                          <span className="inline-flex items-center gap-1">
                            <UserIcon className="h-4 w-4" />
                            {job.clientName}
                          </span>
                        ) : null}
                        {job.startDate ? (
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-4 w-4" />
                            {formatUTCDate(job.startDate)}
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1">
                          <CheckSquare className="h-4 w-4" />
                          {job.completedTaskCount}/{job.taskCount} tasks
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <Modal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            resetForm();
          }}
          title="New Job"
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
                Create Job
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

            <Field label="Title" htmlFor="job-title" required>
              <Input
                id="job-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Kitchen remodel"
              />
            </Field>

            <Field label="Address" htmlFor="job-address" required>
              <Input
                id="job-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St"
              />
            </Field>

            <Field label="Client" htmlFor="job-client">
              <Select
                id="job-client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">No client</option>
                {(clients ?? []).map((c: Doc<"clients">) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Notes" htmlFor="job-notes">
              <Textarea
                id="job-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
              />
            </Field>

            <Field label="Tasks">
              <div className="flex gap-2">
                <Input
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addDraftTask();
                    }
                  }}
                  placeholder="Add a task and press Enter"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addDraftTask}
                >
                  Add
                </Button>
              </div>
              {tasks.length > 0 ? (
                <ul className="mt-3 space-y-1.5">
                  {tasks.map((t: DraftTask) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700"
                    >
                      <span className="truncate">{t.name}</span>
                      <button
                        type="button"
                        onClick={() => removeDraftTask(t.id)}
                        className="text-gray-400 hover:text-red-600"
                        aria-label="Remove task"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Field>
          </div>
        </Modal>
      </PageContainer>
    </>
  );
}

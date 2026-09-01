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
import { humanize } from "@/lib/format";
import { colors } from "@/lib/colors";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  LoadingState,
  Modal,
  PageContainer,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
  cx,
} from "@/components/ui";
import ProjectNav from "@/components/ProjectNav";
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  History,
  MapPin,
  Plus,
  Trash2,
  X,
} from "lucide-react";

type CompletionStatus = "complete" | "void" | "incomplete";

const STATUS_OPTIONS: CompletionStatus[] = ["incomplete", "complete", "void"];

/** Returns the effective status for a (task, address) pair. */
function statusFor(
  task: Doc<"taskListTasks">,
  address: string,
  statuses: Array<Doc<"taskListTaskStatus">>
): CompletionStatus {
  const match = statuses.find(
    (s) => s.taskId === task._id && s.address === address
  );
  return match?.completionStatus ?? "incomplete";
}

export default function ProjectTaskListsPage() {
  const params = useParams();
  const projectId = params.projectId as Id<"projects">;

  const { user, organizationId, isLoading } = useOrg();
  const { userId: clerkUserId } = useAuth();
  const tokenIdentifier = buildClerkTokenIdentifier(clerkUserId ?? undefined);

  const project = useQuery(
    api.projects.getProject,
    projectId ? { projectId } : "skip"
  );

  const taskLists = useQuery(
    api.taskLists.getTaskListsForProject,
    projectId ? { projectId } : "skip"
  );

  const [selectedListId, setSelectedListId] = useState<Id<"taskLists"> | null>(
    null
  );

  // Default to the first task list once they load.
  useEffect(() => {
    if (taskLists && taskLists.length > 0 && !selectedListId) {
      setSelectedListId(taskLists[0]._id);
    }
  }, [taskLists, selectedListId]);

  const details = useQuery(
    api.taskLists.getTaskListWithDetails,
    selectedListId ? { taskListId: selectedListId } : "skip"
  );

  // Task forces (teams) are needed to create a new task list.
  const taskForces = useQuery(
    api.taskForce_project.getTaskForcesByProjectAndUserToken,
    projectId && tokenIdentifier && organizationId
      ? { projectId, tokenIdentifier, organizationId }
      : "skip"
  );

  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Distinct addresses present on the selected task list (derived from statuses).
  const addresses = useMemo(() => {
    if (!details?.statuses) return [] as string[];
    const set = new Set<string>();
    details.statuses.forEach((s: Doc<"taskListTaskStatus">) => set.add(s.address));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [details]);

  if (isLoading || project === undefined) {
    return (
      <>
        <ProjectNav projectId={projectId} />
        <PageContainer>
          <LoadingState label="Loading task lists…" />
        </PageContainer>
      </>
    );
  }

  if (project === null) {
    return (
      <>
        <ProjectNav projectId={projectId} />
        <PageContainer>
          <EmptyState
            title="Project not found"
            description="This project doesn't exist or you don't have access to it."
          />
        </PageContainer>
      </>
    );
  }

  const selectedAddressObj = selectedAddress
    ? { address: selectedAddress }
    : null;

  return (
    <>
      <ProjectNav projectId={projectId} />
      <PageContainer>
        <PageHeader
          title="Task Lists"
          subtitle={project.name}
          actions={
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setCreateOpen(true)}
            >
              New Task List
            </Button>
          }
        />

        {taskLists === undefined ? (
          <LoadingState label="Loading task lists…" />
        ) : taskLists.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-10 w-10" />}
            title="No task lists yet"
            description="Create a task list to track per-address checklists for a team."
            action={
              <Button
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setCreateOpen(true)}
              >
                New Task List
              </Button>
            }
          />
        ) : (
          <>
            {/* Task list selector */}
            <div className="mb-6 max-w-md">
              <Field label="Task list">
                <Select
                  value={selectedListId ?? ""}
                  onChange={(e) => {
                    setSelectedListId(
                      e.target.value as Id<"taskLists">
                    );
                    setSelectedAddress(null);
                  }}
                >
                  {taskLists.map((list: Doc<"taskLists">) => (
                    <option key={list._id} value={list._id}>
                      {list.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {details === undefined ? (
              <LoadingState label="Loading addresses…" />
            ) : details === null ? (
              <EmptyState
                title="Task list unavailable"
                description="This task list could not be loaded."
              />
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Addresses panel */}
                <div className="lg:col-span-5">
                  <Card>
                    <CardHeader
                      title="Addresses"
                      subtitle={`${addresses.length} with tracked tasks`}
                    />
                    {addresses.length === 0 ? (
                      <div className="px-5 py-10 text-center text-sm text-gray-500">
                        No addresses have task status recorded for this list
                        yet.
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {addresses.map((address) => {
                          const addrStatuses = details.statuses.filter(
                            (s: Doc<"taskListTaskStatus">) => s.address === address
                          );
                          const total = details.tasks.length;
                          const done = details.tasks.filter(
                            (t: Doc<"taskListTasks">) =>
                              statusFor(t, address, addrStatuses) ===
                                "complete" ||
                              statusFor(t, address, addrStatuses) === "void"
                          ).length;
                          const active = selectedAddress === address;
                          return (
                            <li key={address}>
                              <button
                                type="button"
                                onClick={() => setSelectedAddress(address)}
                                className={cx(
                                  "flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors",
                                  active
                                    ? "bg-gray-50"
                                    : "hover:bg-gray-50"
                                )}
                              >
                                <span className="flex min-w-0 items-center gap-2">
                                  <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                                  <span className="truncate text-sm text-gray-900">
                                    {address}
                                  </span>
                                </span>
                                <span className="flex shrink-0 items-center gap-2">
                                  <Badge
                                    tone={
                                      done === total && total > 0
                                        ? "green"
                                        : "gray"
                                    }
                                  >
                                    {done}/{total}
                                  </Badge>
                                  <ChevronRight
                                    className={cx(
                                      "h-4 w-4 text-gray-300",
                                      active && "text-gray-600"
                                    )}
                                  />
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </Card>
                </div>

                {/* Tasks panel */}
                <div className="lg:col-span-7">
                  {!selectedAddressObj ? (
                    <Card>
                      <div className="px-5 py-16 text-center text-sm text-gray-500">
                        Select an address to view and update its tasks.
                      </div>
                    </Card>
                  ) : (
                    <AddressTasksPanel
                      taskListId={selectedListId!}
                      address={selectedAddressObj.address}
                      tasks={details.tasks}
                      statuses={details.statuses}
                      currentUserId={user?._id as Id<"users"> | undefined}
                    />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </PageContainer>

      {createOpen && (
        <CreateTaskListModal
          projectId={projectId}
          taskForces={taskForces ?? undefined}
          currentUserId={user?._id as Id<"users"> | undefined}
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => {
            setSelectedListId(id);
            setSelectedAddress(null);
            setCreateOpen(false);
          }}
        />
      )}
    </>
  );
}

/* ----------------------------------------------------- Address tasks panel */

function AddressTasksPanel({
  taskListId,
  address,
  tasks,
  statuses,
  currentUserId,
}: {
  taskListId: Id<"taskLists">;
  address: string;
  tasks: Array<Doc<"taskListTasks">>;
  statuses: Array<Doc<"taskListTaskStatus">>;
  currentUserId: Id<"users"> | undefined;
}) {
  const [expandedTaskId, setExpandedTaskId] =
    useState<Id<"taskListTasks"> | null>(null);

  return (
    <Card>
      <CardHeader
        title={address}
        subtitle="Tap a task to update its status or view history"
      />
      {tasks.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-gray-500">
          This task list has no tasks defined.
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {tasks.map((task) => {
            const status = statusFor(task, address, statuses);
            const statusDoc = statuses.find(
              (s) => s.taskId === task._id && s.address === address
            );
            const expanded = expandedTaskId === task._id;
            return (
              <li key={task._id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className="mt-1 h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: task.color || "#9ca3af" }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {task.name}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <StatusBadge status={status} />
                        {statusDoc?.completedAt ? (
                          <span className="text-xs text-gray-500">
                            {formatUTCDate(statusDoc.completedAt)}
                          </span>
                        ) : null}
                      </div>
                      {statusDoc?.comment ? (
                        <p className="mt-1 text-sm text-gray-600">
                          {statusDoc.comment}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedTaskId(expanded ? null : task._id)
                    }
                    className="inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100"
                    aria-expanded={expanded}
                  >
                    {expanded ? "Close" : "Update"}
                    {expanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {expanded ? (
                  <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
                    <TaskUpdateForm
                      taskListId={taskListId}
                      address={address}
                      taskId={task._id}
                      currentStatus={status}
                      currentUserId={currentUserId}
                    />
                    {statusDoc ? (
                      <TaskStatusLog statusId={statusDoc._id} />
                    ) : (
                      <p className="mt-4 text-xs text-gray-500">
                        No history yet. Submit an update to start the log.
                      </p>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* --------------------------------------------------------- Task update form */

function TaskUpdateForm({
  taskListId,
  address,
  taskId,
  currentStatus,
  currentUserId,
}: {
  taskListId: Id<"taskLists">;
  address: string;
  taskId: Id<"taskListTasks">;
  currentStatus: CompletionStatus;
  currentUserId: Id<"users"> | undefined;
}) {
  const updateTaskStatusWithLog = useMutation(
    api.taskListTaskStatus.updateTaskStatusWithLog
  );

  const [status, setStatus] = useState<CompletionStatus>(currentStatus);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the selected status in sync if the underlying status changes.
  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateTaskStatusWithLog({
        taskListId,
        address,
        taskId,
        completionStatus: status,
        comment: comment.trim() ? comment.trim() : undefined,
        ...(currentUserId ? { completedBy: currentUserId } : {}),
      });
      setComment("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update task status."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => {
          const active = status === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setStatus(opt)}
              className={cx(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-transparent text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
              )}
              style={active ? { backgroundColor: colors.primary } : undefined}
            >
              {humanize(opt)}
            </button>
          );
        })}
      </div>

      <Field label="Comment (optional)">
        <Textarea
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a note about this update…"
        />
      </Field>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      <div className="flex justify-end">
        <Button size="sm" loading={saving} onClick={handleSubmit}>
          Save update
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Task status log */

function TaskStatusLog({
  statusId,
}: {
  statusId: Id<"taskListTaskStatus">;
}) {
  const logs = useQuery(api.taskListTaskStatus.getTaskStatusLogs, {
    taskListTaskStatusId: statusId,
  });

  return (
    <div className="mt-4 border-t border-gray-200 pt-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <History className="h-3.5 w-3.5" />
        History
      </div>
      {logs === undefined ? (
        <p className="text-xs text-gray-400">Loading history…</p>
      ) : logs.length === 0 ? (
        <p className="text-xs text-gray-400">No history yet.</p>
      ) : (
        <ul className="space-y-2">
          {logs.map((log: Doc<"taskListTaskLog">) => (
            <li key={log._id} className="text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={log.status} />
                <span className="text-xs text-gray-500">
                  {formatUTCDate(log.completedAt)}
                </span>
              </div>
              {log.comment ? (
                <p className="mt-0.5 text-sm text-gray-700">{log.comment}</p>
              ) : null}
              <LogFiles logId={log._id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LogFiles({
  logId,
}: {
  logId: Id<"taskListTaskStatus_log">;
}) {
  const files = useQuery(
    api.taskListTaskStatus.getFilesForTaskStatusLog,
    { taskListTaskStatusLogId: logId }
  );

  if (!files || files.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {files.map((file: Doc<"files">) =>
        file.fileType?.toLowerCase().includes("pdf") ? (
          <a
            key={file._id}
            href={file.googleUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium underline"
            style={{ color: colors.primary }}
          >
            {file.name}
          </a>
        ) : (
          <a
            key={file._id}
            href={file.googleUrl}
            target="_blank"
            rel="noreferrer"
          >
            {/* External URL — render with plain img */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={file.googleUrl}
              alt={file.name}
              className="h-16 w-16 rounded object-cover"
            />
          </a>
        )
      )}
    </div>
  );
}

/* ---------------------------------------------------- Create task list modal */

function CreateTaskListModal({
  projectId,
  taskForces,
  currentUserId,
  onClose,
  onCreated,
}: {
  projectId: Id<"projects">;
  taskForces: Array<{ _id: string; name: string }> | undefined;
  currentUserId: Id<"users"> | undefined;
  onClose: () => void;
  onCreated: (id: Id<"taskLists">) => void;
}) {
  const createTaskList = useMutation(api.taskLists.createTaskList);
  const addTaskToTaskList = useMutation(api.taskListTasks.addTaskToTaskList);

  const [name, setName] = useState("");
  const [teamId, setTeamId] = useState<string>("");
  const [taskNames, setTaskNames] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default to first team once they load.
  useEffect(() => {
    if (taskForces && taskForces.length > 0 && !teamId) {
      setTeamId(taskForces[0]._id);
    }
  }, [taskForces, teamId]);

  const updateTaskName = (index: number, value: string) => {
    setTaskNames((prev) => prev.map((t, i) => (i === index ? value : t)));
  };

  const addTaskRow = () => setTaskNames((prev) => [...prev, ""]);
  const removeTaskRow = (index: number) =>
    setTaskNames((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Enter a name for the task list.");
      return;
    }
    if (!teamId) {
      setError("Select a team for this task list.");
      return;
    }
    if (!currentUserId) {
      setError("Could not determine current user. Try reloading.");
      return;
    }
    const cleanTasks = taskNames.map((t) => t.trim()).filter(Boolean);

    setSaving(true);
    try {
      const taskListId = await createTaskList({
        projectId,
        teamId: teamId as Id<"taskForces">,
        name: name.trim(),
        createdBy: currentUserId,
        createdAt: Date.now(),
      });

      // Add the initial tasks, if any.
      const palette = [
        "#f97316",
        "#3b82f6",
        "#10b981",
        "#8b5cf6",
        "#ef4444",
        "#eab308",
      ];
      for (let i = 0; i < cleanTasks.length; i++) {
        await addTaskToTaskList({
          taskListId,
          name: cleanTasks[i],
          color: palette[i % palette.length],
        });
      }

      onCreated(taskListId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create task list."
      );
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="New Task List"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            Create
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Roofing Tasks"
          />
        </Field>

        <Field
          label="Team"
          required
          hint={
            taskForces && taskForces.length === 0
              ? "No teams are available to you on this project."
              : undefined
          }
        >
          <Select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            disabled={!taskForces || taskForces.length === 0}
          >
            {taskForces === undefined ? (
              <option value="">Loading teams…</option>
            ) : taskForces.length === 0 ? (
              <option value="">No teams available</option>
            ) : (
              taskForces.map((tf) => (
                <option key={tf._id} value={tf._id}>
                  {tf.name}
                </option>
              ))
            )}
          </Select>
        </Field>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Tasks
            </label>
            <button
              type="button"
              onClick={addTaskRow}
              className="inline-flex items-center gap-1 text-sm font-medium"
              style={{ color: colors.primary }}
            >
              <Plus className="h-4 w-4" />
              Add task
            </button>
          </div>
          <div className="space-y-2">
            {taskNames.map((value, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={value}
                  onChange={(e) => updateTaskName(index, e.target.value)}
                  placeholder={`Task ${index + 1}`}
                />
                {taskNames.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeTaskRow(index)}
                    className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Remove task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : (
                  <span className="w-8" aria-hidden>
                    <X className="h-4 w-4 opacity-0" />
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Tasks become checklist items applied per address. You can leave
            blank rows empty.
          </p>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </Modal>
  );
}

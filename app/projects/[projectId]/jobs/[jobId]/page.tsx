"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useOrg } from "@/lib/useOrg";
import { formatUTCDate } from "@/lib/dateFormat";
import { humanize } from "@/lib/format";
import {
  Button,
  Card,
  CardHeader,
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
  MapPin,
  User as UserIcon,
  MessageSquare,
  Send,
  ImageIcon,
  CheckSquare,
} from "lucide-react";

// Shape returned by api.jobs.getById (hydrated).
type JobTask = Doc<"job_tasks"> & { assigneeName: string | null };
type JobPhoto = Doc<"job_photos"> & { url: string; name: string };
type JobLog = Doc<"job_logs"> & {
  userName: string;
  userImage: string | null;
  fileUrl: string | null;
};
type TeamMember = { _id: Id<"users">; name: string };
type JobDetail = Doc<"jobs"> & {
  client: Doc<"clients"> | null;
  tasks: JobTask[];
  photos: JobPhoto[];
  logs: JobLog[];
  schedule: Doc<"schedules"> | null;
  teamMembers: TeamMember[];
};

const STATUS_OPTIONS = ["active", "completed", "cancelled"] as const;
type JobStatus = (typeof STATUS_OPTIONS)[number];

export default function JobDetailPage() {
  const params = useParams();
  const projectId = params.projectId as Id<"projects">;
  const jobId = params.jobId as Id<"jobs">;

  const { user, isLoading } = useOrg();

  const job = useQuery(api.jobs.getById, jobId ? { jobId } : "skip") as
    | JobDetail
    | null
    | undefined;

  const updateStatus = useMutation(api.jobs.updateStatus);
  const toggleTask = useMutation(api.jobs.toggleTask);
  const assignTask = useMutation(api.jobs.assignTask);
  const addComment = useMutation(api.jobs.addComment);
  const createAndSend = useAction(api.jobUpdates.createAndSend);

  const [comment, setComment] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Send-update modal state
  const [sendOpen, setSendOpen] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(
    new Set()
  );
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const comments = useMemo(
    () => (job ? job.logs.filter((l: JobLog) => l.type === "comment") : []),
    [job]
  );

  const userId = user?._id as Id<"users"> | undefined;

  async function handleStatusChange(status: JobStatus) {
    if (!userId || !job || status === job.status) return;
    try {
      await updateStatus({ jobId, status, userId });
    } catch {
      // No-op: reactive query stays on previous value.
    }
  }

  async function handleToggleTask(taskId: Id<"job_tasks">) {
    if (!userId) return;
    try {
      await toggleTask({ taskId, userId });
    } catch {
      /* ignore */
    }
  }

  async function handleAssign(taskId: Id<"job_tasks">, value: string) {
    try {
      await assignTask({
        taskId,
        userId: value ? (value as Id<"users">) : undefined,
      });
    } catch {
      /* ignore */
    }
  }

  async function handleAddComment() {
    if (!userId || !comment.trim()) return;
    setCommentSubmitting(true);
    try {
      await addComment({ jobId, message: comment.trim(), userId });
      setComment("");
    } catch {
      /* ignore */
    } finally {
      setCommentSubmitting(false);
    }
  }

  function togglePhoto(id: string) {
    setSelectedPhotoIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openSendModal() {
    if (!job) return;
    // Default to including all photos.
    setSelectedPhotoIds(
      new Set(job.photos.map((p: JobPhoto) => String(p.fileId)))
    );
    setUpdateMessage("");
    setSendError(null);
    setSendResult(null);
    setSendEmail(true);
    setSendSms(false);
    setSendOpen(true);
  }

  async function handleSendUpdate() {
    if (!userId) return;
    if (!sendEmail && !sendSms) {
      setSendError("Choose at least one delivery method.");
      return;
    }
    setSending(true);
    setSendError(null);
    setSendResult(null);
    try {
      const photoFileIds = Array.from(selectedPhotoIds).map(
        (id: string) => id as Id<"files">
      );
      const res = await createAndSend({
        jobId,
        userId,
        message: updateMessage.trim() ? updateMessage.trim() : undefined,
        photoFileIds,
        sendEmail,
        sendSms,
      });
      const parts: string[] = [];
      if (res.emailSent) parts.push("email sent");
      if (res.smsSent) parts.push("SMS sent");
      setSendResult(
        parts.length
          ? `Update delivered (${parts.join(", ")}).`
          : "Update created. Delivery may be unconfigured for this client."
      );
    } catch (err) {
      setSendError(
        err instanceof Error ? err.message : "Failed to send update."
      );
    } finally {
      setSending(false);
    }
  }

  if (isLoading || job === undefined) {
    return (
      <>
        <ProjectNav projectId={projectId} />
        <PageContainer>
          <LoadingState label="Loading job…" />
        </PageContainer>
      </>
    );
  }

  if (job === null) {
    return (
      <>
        <ProjectNav projectId={projectId} />
        <PageContainer>
          <PageHeader
            title="Job not found"
            backHref={`/projects/${projectId}/jobs`}
          />
          <EmptyState
            title="This job doesn't exist"
            description="It may have been deleted or you don't have access."
          />
        </PageContainer>
      </>
    );
  }

  const canSendToClient = Boolean(job.client);
  const hasTeam = job.teamMembers.length > 0;

  return (
    <>
      <ProjectNav projectId={projectId} />
      <PageContainer>
        <PageHeader
          title={job.title}
          backHref={`/projects/${projectId}/jobs`}
          subtitle={
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {job.address}
            </span>
          }
          actions={
            <Button
              leftIcon={<Send className="h-4 w-4" />}
              onClick={openSendModal}
              disabled={!canSendToClient}
            >
              Send Update to Client
            </Button>
          }
        />

        {/* Header / status control */}
        <Card className="mb-6 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span className="inline-flex items-center gap-1.5">
                Status: <StatusBadge status={humanize(job.status)} />
              </span>
              {job.client ? (
                <span className="inline-flex items-center gap-1.5">
                  <UserIcon className="h-4 w-4" />
                  {job.client.name}
                </span>
              ) : null}
              {job.startDate ? (
                <span>Start: {formatUTCDate(job.startDate)}</span>
              ) : null}
              {job.endDate ? (
                <span>End: {formatUTCDate(job.endDate)}</span>
              ) : null}
            </div>
            <Field label="Change status" htmlFor="job-status">
              <Select
                id="job-status"
                value={job.status}
                onChange={(e) =>
                  handleStatusChange(e.target.value as JobStatus)
                }
                className="w-44"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {humanize(s)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {job.notes ? (
            <p className="mt-3 whitespace-pre-wrap text-sm text-gray-600">
              {job.notes}
            </p>
          ) : null}
        </Card>

        {/* Tasks */}
        <Card className="mb-6">
          <CardHeader
            title="Tasks"
            subtitle={`${job.tasks.filter((t: JobTask) => t.completed).length}/${job.tasks.length} complete`}
          />
          {job.tasks.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-500">
              No tasks on this job.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {job.tasks.map((task: JobTask) => (
                <li
                  key={task._id}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggleTask(task._id)}
                    className="h-4 w-4 shrink-0 rounded border-gray-300"
                  />
                  <span
                    className={
                      task.completed
                        ? "min-w-0 flex-1 truncate text-sm text-gray-400 line-through"
                        : "min-w-0 flex-1 truncate text-sm text-gray-900"
                    }
                  >
                    {task.name}
                  </span>
                  {hasTeam ? (
                    <Select
                      value={task.assignedTo ?? ""}
                      onChange={(e) => handleAssign(task._id, e.target.value)}
                      className="w-44"
                    >
                      <option value="">Unassigned</option>
                      {job.teamMembers.map((m: TeamMember) => (
                        <option key={m._id} value={m._id}>
                          {m.name}
                        </option>
                      ))}
                    </Select>
                  ) : task.assigneeName ? (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <UserIcon className="h-3.5 w-3.5" />
                      {task.assigneeName}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Photos */}
        <Card className="mb-6">
          <CardHeader
            title="Photos"
            subtitle={`${job.photos.length} photo${job.photos.length === 1 ? "" : "s"}`}
          />
          {job.photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-10 text-center text-sm text-gray-500">
              <ImageIcon className="mb-2 h-7 w-7 text-gray-300" />
              No photos attached yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 px-5 py-4 sm:grid-cols-3 md:grid-cols-4">
              {job.photos.map((photo: JobPhoto) => (
                <a
                  key={photo._id}
                  href={photo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block overflow-hidden rounded-lg border border-gray-200"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="h-32 w-full object-cover transition-transform group-hover:scale-105"
                  />
                </a>
              ))}
            </div>
          )}
        </Card>

        {/* Comments */}
        <Card className="mb-6">
          <CardHeader title="Comments" />
          <div className="px-5 py-4">
            <div className="flex gap-2">
              <Textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment…"
              />
              <Button
                onClick={handleAddComment}
                loading={commentSubmitting}
                disabled={!comment.trim()}
                leftIcon={<MessageSquare className="h-4 w-4" />}
                className="self-start"
              >
                Post
              </Button>
            </div>

            {comments.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">No comments yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {comments.map((c: JobLog) => (
                  <li
                    key={c._id}
                    className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {c.userName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatUTCDate(c.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-700">
                      {c.message}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Send Update modal */}
        <Modal
          open={sendOpen}
          onClose={() => setSendOpen(false)}
          title="Send Update to Client"
          size="lg"
          footer={
            <>
              <Button variant="secondary" onClick={() => setSendOpen(false)}>
                Close
              </Button>
              <Button
                onClick={handleSendUpdate}
                loading={sending}
                leftIcon={<Send className="h-4 w-4" />}
              >
                Send Update
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {job.client ? (
              <p className="text-sm text-gray-600">
                To <span className="font-medium">{job.client.name}</span>
                {job.client.email ? ` · ${job.client.email}` : ""}
                {job.client.phone ? ` · ${job.client.phone}` : ""}
              </p>
            ) : null}

            {sendError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {sendError}
              </div>
            ) : null}
            {sendResult ? (
              <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                {sendResult}
              </div>
            ) : null}

            <Field label="Message">
              <Textarea
                rows={3}
                value={updateMessage}
                onChange={(e) => setUpdateMessage(e.target.value)}
                placeholder="A short note for the client (optional)"
              />
            </Field>

            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">
                Include photos ({selectedPhotoIds.size} selected)
              </p>
              {job.photos.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No photos available to include.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {job.photos.map((photo: JobPhoto) => {
                    const id = String(photo.fileId);
                    const selected = selectedPhotoIds.has(id);
                    return (
                      <button
                        key={photo._id}
                        type="button"
                        onClick={() => togglePhoto(id)}
                        className={
                          selected
                            ? "relative overflow-hidden rounded-lg ring-2 ring-gray-900"
                            : "relative overflow-hidden rounded-lg ring-1 ring-gray-200"
                        }
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={photo.name}
                          className="h-20 w-full object-cover"
                        />
                        {selected ? (
                          <span className="absolute right-1 top-1 rounded-full bg-gray-900 p-0.5 text-white">
                            <CheckSquare className="h-3.5 w-3.5" />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  disabled={!job.client?.email}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Email{job.client?.email ? "" : " (no email on file)"}
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={sendSms}
                  onChange={(e) => setSendSms(e.target.checked)}
                  disabled={!job.client?.phone}
                  className="h-4 w-4 rounded border-gray-300"
                />
                SMS{job.client?.phone ? "" : " (no phone on file)"}
              </label>
            </div>
          </div>
        </Modal>
      </PageContainer>
    </>
  );
}

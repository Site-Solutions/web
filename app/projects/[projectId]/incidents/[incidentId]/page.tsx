"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import ProjectNav from "@/components/ProjectNav";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  LoadingState,
  PageContainer,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
} from "@/components/ui";
import { useOrg } from "@/lib/useOrg";
import { formatUTCDate } from "@/lib/dateFormat";
import {
  Image as ImageIcon,
  MessageSquare,
  Users,
  History,
} from "lucide-react";

const STATUSES = [
  "Open",
  "Under Investigation",
  "Resolved",
  "Closed",
] as const;
type IncidentStatus = (typeof STATUSES)[number];

type SeverityBadgeTone = "green" | "yellow" | "orange" | "red";

function severityTone(severity?: string | null): SeverityBadgeTone {
  switch (severity) {
    case "Critical":
      return "red";
    case "High":
      return "orange";
    case "Medium":
      return "yellow";
    default:
      return "green";
  }
}

function formatDateTime(ts?: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* --------------------------------------------------------------- field row */

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="px-5 py-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
        {value || "—"}
      </dd>
    </div>
  );
}

/* ------------------------------------------------------------------- page */

export default function IncidentDetailPage() {
  const params = useParams();
  const projectId = params.projectId as Id<"projects">;
  const incidentId = params.incidentId as Id<"incidents">;

  const { user, isLoading, isSupervisor } = useOrg();

  const incident = useQuery(
    api.incidents.getById,
    incidentId ? { id: incidentId } : "skip"
  );
  const persons = useQuery(
    api.incidents.getPersons,
    incidentId ? { incidentId } : "skip"
  );
  const comments = useQuery(
    api.incidents.getComments,
    incidentId ? { incidentId } : "skip"
  );
  const updates = useQuery(
    api.incidents.getUpdates,
    incidentId ? { incidentId } : "skip"
  );
  const files = useQuery(
    api.incidents.getFiles,
    incidentId ? { incidentId } : "skip"
  );

  const updateStatus = useMutation(api.incidents.updateStatus);
  const addPerson = useMutation(api.incidents.addPerson);
  const addComment = useMutation(api.incidents.addComment);

  // status
  const [statusBusy, setStatusBusy] = useState(false);

  // person form
  const [personName, setPersonName] = useState("");
  const [personRole, setPersonRole] = useState("");
  const [personContact, setPersonContact] = useState("");
  const [personStatement, setPersonStatement] = useState("");
  const [personBusy, setPersonBusy] = useState(false);
  const [personError, setPersonError] = useState<string | null>(null);

  // comment form
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  async function handleStatusChange(next: IncidentStatus) {
    if (!incident || next === incident.status) return;
    setStatusBusy(true);
    try {
      await updateStatus({
        incidentId,
        status: next,
        userId: user?._id,
      });
    } catch (err) {
      // surface minimally; status select reverts on next query tick
      console.error(err);
    } finally {
      setStatusBusy(false);
    }
  }

  async function handleAddPerson(e: React.FormEvent) {
    e.preventDefault();
    if (!personName.trim() || !personRole.trim()) {
      setPersonError("Name and role are required.");
      return;
    }
    setPersonBusy(true);
    setPersonError(null);
    try {
      await addPerson({
        incidentId,
        name: personName.trim(),
        role: personRole.trim(),
        contactInfo: personContact.trim() || undefined,
        statement: personStatement.trim() || undefined,
      });
      setPersonName("");
      setPersonRole("");
      setPersonContact("");
      setPersonStatement("");
    } catch (err) {
      setPersonError(
        err instanceof Error ? err.message : "Failed to add person."
      );
    } finally {
      setPersonBusy(false);
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!commentText.trim()) {
      setCommentError("Comment cannot be empty.");
      return;
    }
    setCommentBusy(true);
    setCommentError(null);
    try {
      await addComment({
        incidentId,
        userId: user._id,
        comment: commentText.trim(),
      });
      setCommentText("");
    } catch (err) {
      setCommentError(
        err instanceof Error ? err.message : "Failed to add comment."
      );
    } finally {
      setCommentBusy(false);
    }
  }

  if (isLoading || incident === undefined) {
    return (
      <>
        <ProjectNav projectId={projectId} />
        <PageContainer>
          <LoadingState />
        </PageContainer>
      </>
    );
  }

  if (incident === null) {
    return (
      <>
        <ProjectNav projectId={projectId} />
        <PageContainer>
          <PageHeader
            title="Incident not found"
            backHref={`/projects/${projectId}/incidents`}
          />
          <p className="text-gray-600">
            This incident does not exist or you do not have access to it.
          </p>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <ProjectNav projectId={projectId} />
      <PageContainer>
        <PageHeader
          title={incident.title}
          subtitle={incident.incidentType}
          backHref={`/projects/${projectId}/incidents`}
          actions={
            <div className="flex items-center gap-2">
              <Badge tone={severityTone(incident.severity)}>
                {incident.severity}
              </Badge>
              <StatusBadge status={incident.status} />
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* main column */}
          <div className="space-y-6 lg:col-span-2">
            {/* details */}
            <Card>
              <CardHeader title="Details" />
              <dl className="divide-y divide-gray-100">
                <DetailRow label="Description" value={incident.description} />
                <DetailRow label="Location" value={incident.location} />
                <DetailRow
                  label="Date of incident"
                  value={formatUTCDate(incident.incidentDate)}
                />
                <DetailRow
                  label="Reported by"
                  value={`${incident.reporterName} · ${formatDateTime(
                    incident.reportedAt
                  )}`}
                />
                <DetailRow
                  label="Assigned to"
                  value={incident.assignedToName}
                />
                <DetailRow
                  label="Immediate action"
                  value={incident.immediateAction}
                />
                <DetailRow label="Root cause" value={incident.rootCause} />
                <DetailRow
                  label="Corrective actions"
                  value={incident.correctiveActions}
                />
                {incident.resolvedAt ? (
                  <DetailRow
                    label="Resolved"
                    value={`${
                      incident.resolvedByName ?? "—"
                    } · ${formatDateTime(incident.resolvedAt)}`}
                  />
                ) : null}
              </dl>
            </Card>

            {/* photos / files */}
            <Card>
              <CardHeader
                title="Photos & files"
                subtitle={
                  files ? `${files.length} attached` : undefined
                }
              />
              <div className="p-5">
                {files === undefined ? (
                  <LoadingState label="Loading files…" />
                ) : files.length === 0 ? (
                  <EmptyState
                    icon={<ImageIcon className="h-8 w-8" />}
                    title="No attachments"
                    description="No photos or files have been attached to this incident."
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {files.map((f: {
                      _id: string;
                      fileType: string;
                      file?: { googleUrl?: string | null; name?: string | null } | null;
                    }) => {
                      const url = f.file?.googleUrl;
                      const name = f.file?.name ?? "file";
                      if (f.fileType === "photo" && url) {
                        return (
                          <a
                            key={f._id}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="group block overflow-hidden rounded-lg border border-gray-200"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={name}
                              className="h-32 w-full object-cover transition-transform group-hover:scale-105"
                            />
                          </a>
                        );
                      }
                      return (
                        <a
                          key={f._id}
                          href={url ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-center hover:bg-gray-100"
                        >
                          <ImageIcon className="h-6 w-6 text-gray-400" />
                          <span className="line-clamp-2 text-xs text-gray-600">
                            {name}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>

            {/* people involved */}
            <Card>
              <CardHeader
                title="People involved"
                subtitle={persons ? `${persons.length} people` : undefined}
              />
              <div className="p-5">
                {persons === undefined ? (
                  <LoadingState label="Loading people…" />
                ) : persons.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No people have been recorded for this incident yet.
                  </p>
                ) : (
                  <ul className="mb-5 space-y-3">
                    {persons.map((p: {
                      _id: string;
                      name: string;
                      role: string;
                      contactInfo?: string | null;
                      statement?: string | null;
                    }) => (
                      <li
                        key={p._id}
                        className="rounded-lg border border-gray-200 p-3"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {p.name}
                          </span>
                          <Badge tone="gray">{p.role}</Badge>
                        </div>
                        {p.contactInfo ? (
                          <p className="mt-1 text-xs text-gray-500">
                            {p.contactInfo}
                          </p>
                        ) : null}
                        {p.statement ? (
                          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                            {p.statement}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}

                <form
                  onSubmit={handleAddPerson}
                  className="space-y-3 border-t border-gray-100 pt-4"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Name" htmlFor="person-name" required>
                      <Input
                        id="person-name"
                        value={personName}
                        onChange={(
                          e: React.ChangeEvent<HTMLInputElement>
                        ) => setPersonName(e.target.value)}
                        placeholder="Full name"
                      />
                    </Field>
                    <Field label="Role" htmlFor="person-role" required>
                      <Input
                        id="person-role"
                        value={personRole}
                        onChange={(
                          e: React.ChangeEvent<HTMLInputElement>
                        ) => setPersonRole(e.target.value)}
                        placeholder="Victim, Witness, etc."
                      />
                    </Field>
                  </div>
                  <Field label="Contact info" htmlFor="person-contact">
                    <Input
                      id="person-contact"
                      value={personContact}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPersonContact(e.target.value)
                      }
                      placeholder="Phone or email (optional)"
                    />
                  </Field>
                  <Field label="Statement" htmlFor="person-statement">
                    <Textarea
                      id="person-statement"
                      rows={3}
                      value={personStatement}
                      onChange={(
                        e: React.ChangeEvent<HTMLTextAreaElement>
                      ) => setPersonStatement(e.target.value)}
                      placeholder="Account of what they saw or experienced (optional)"
                    />
                  </Field>
                  {personError ? (
                    <p className="text-sm text-red-600">{personError}</p>
                  ) : null}
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" loading={personBusy}>
                      Add person
                    </Button>
                  </div>
                </form>
              </div>
            </Card>

            {/* comments */}
            <Card>
              <CardHeader
                title="Comments"
                subtitle={comments ? `${comments.length} comments` : undefined}
              />
              <div className="p-5">
                {comments === undefined ? (
                  <LoadingState label="Loading comments…" />
                ) : comments.length === 0 ? (
                  <p className="text-sm text-gray-500">No comments yet.</p>
                ) : (
                  <ul className="mb-5 space-y-4">
                    {comments.map((c: {
                      _id: string;
                      userName: string;
                      createdAt: number;
                      comment: string;
                    }) => (
                      <li key={c._id} className="flex gap-3">
                        <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {c.userName}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDateTime(c.createdAt)}
                            </span>
                          </div>
                          <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-700">
                            {c.comment}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <form
                  onSubmit={handleAddComment}
                  className="space-y-3 border-t border-gray-100 pt-4"
                >
                  <Textarea
                    rows={3}
                    value={commentText}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setCommentText(e.target.value)
                    }
                    placeholder="Add a comment…"
                  />
                  {commentError ? (
                    <p className="text-sm text-red-600">{commentError}</p>
                  ) : null}
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" loading={commentBusy}>
                      Post comment
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>

          {/* side column */}
          <div className="space-y-6">
            {/* status control */}
            <Card>
              <CardHeader title="Status" />
              <div className="space-y-3 p-5">
                <Field
                  label="Update status"
                  htmlFor="status-select"
                  hint={
                    isSupervisor
                      ? undefined
                      : "Only supervisors/admins typically change status."
                  }
                >
                  <Select
                    id="status-select"
                    value={incident.status}
                    disabled={statusBusy}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      handleStatusChange(e.target.value as IncidentStatus)
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </Card>

            {/* audit trail */}
            <Card>
              <CardHeader title="Audit trail" />
              <div className="p-5">
                {updates === undefined ? (
                  <LoadingState label="Loading history…" />
                ) : updates.length === 0 ? (
                  <p className="text-sm text-gray-500">No history yet.</p>
                ) : (
                  <ul className="space-y-4">
                    {updates.map((u: {
                      _id: string;
                      description: string;
                      userName: string;
                      createdAt: number;
                    }) => (
                      <li key={u._id} className="flex gap-3">
                        <History className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-800">
                            {u.description}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400">
                            {u.userName} · {formatDateTime(u.createdAt)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          </div>
        </div>
      </PageContainer>
    </>
  );
}

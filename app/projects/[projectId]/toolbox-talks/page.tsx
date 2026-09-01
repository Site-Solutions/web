"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useOrg } from "@/lib/useOrg";
import { formatUTCDate } from "@/lib/dateFormat";
import ProjectNav from "@/components/ProjectNav";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  LoadingState,
  Modal,
  PageContainer,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Plus,
  Users,
} from "lucide-react";

type Session = Doc<"toolboxTalkSessions">;
type TaskForce = { _id: Id<"taskForces">; name: string };

export default function ProjectToolboxTalksPage() {
  const params = useParams();
  const projectId = params.projectId as Id<"projects">;

  const { organizationId, user, isSupervisor, isLoading, hasOrg } = useOrg();

  const project = useQuery(
    api.projects.getProject,
    projectId ? { projectId } : "skip"
  );
  const sessions = useQuery(
    api.toolboxTalkSessions.listByProject,
    projectId ? { projectId } : "skip"
  );

  const [deliverOpen, setDeliverOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<Id<"toolboxTalkSessions"> | null>(
    null
  );

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState />
      </PageContainer>
    );
  }

  if (!hasOrg) {
    return (
      <PageContainer>
        <EmptyState
          title="No organization"
          description="You are not a member of an organization yet."
        />
      </PageContainer>
    );
  }

  return (
    <div>
      <ProjectNav projectId={projectId} />
      <PageContainer>
        <PageHeader
          title="Toolbox Talks"
          subtitle={
            project ? `Safety talks delivered on ${project.name}.` : undefined
          }
          backHref="/projects"
          actions={
            isSupervisor ? (
              <Button
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setDeliverOpen(true)}
                data-testid="deliver-talk-button"
              >
                Deliver Talk
              </Button>
            ) : undefined
          }
        />

        {sessions === undefined ? (
          <LoadingState label="Loading sessions…" />
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-10 w-10" />}
            title="No talks delivered yet"
            description="Deliver a safety talk to a team to capture attendance and answers."
            action={
              isSupervisor ? (
                <Button
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => setDeliverOpen(true)}
                  data-testid="empty-deliver-talk-button"
                >
                  Deliver Talk
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {sessions.map((session: Doc<"toolboxTalkSessions">) => (
              <SessionRow
                key={session._id}
                session={session}
                organizationId={organizationId}
                expanded={expandedId === session._id}
                onToggle={() =>
                  setExpandedId((cur) =>
                    cur === session._id ? null : session._id
                  )
                }
              />
            ))}
          </div>
        )}

        {deliverOpen && user ? (
          <DeliverTalkModal
            projectId={projectId}
            organizationId={organizationId}
            supervisorId={user._id}
            onClose={() => setDeliverOpen(false)}
          />
        ) : null}
      </PageContainer>
    </div>
  );
}

/* ----------------------------------------------------------- Session row */

function SessionRow({
  session,
  organizationId,
  expanded,
  onToggle,
}: {
  session: Session;
  organizationId: string | undefined;
  expanded: boolean;
  onToggle: () => void;
}) {
  const talk = useQuery(api.toolboxTalks.getById, { id: session.toolboxTalkId });
  const team = useQuery(api.taskForce_user.getWorkersForTaskForce, {
    taskForceId: session.taskForceId,
  });
  const assignments = useQuery(
    api.toolboxTalkAssignments.listBySession,
    expanded ? { sessionId: session._id } : "skip"
  );

  const teamSize: number | undefined = team?.workers?.length;
  const completed = assignments?.length ?? 0;

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        data-testid={`session-row-${session._id}`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-gray-900">
              {talk === undefined
                ? "Loading…"
                : (talk?.title ?? "Unknown talk")}
            </h3>
            {talk?.category ? <Badge tone="blue">{talk.category}</Badge> : null}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {team?.name ?? "Team"}
            </span>
            <span>{formatUTCDate(session.sessionDate)}</span>
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {completed}
              {teamSize !== undefined ? ` / ${teamSize}` : ""} signed
            </span>
          </p>
        </div>
        <div className="shrink-0 text-gray-400">
          {expanded ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-gray-100 px-5 py-4">
          {talk && talk.questions.length > 0 ? (
            <div className="mb-5">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Questions &amp; responses
              </h4>
              <dl className="space-y-3">
                {talk.questions.map((q: string, i: number) => (
                  <div key={i}>
                    <dt className="text-sm font-medium text-gray-800">{q}</dt>
                    <dd className="text-sm text-gray-600">
                      {session.responses[i]?.trim()
                        ? session.responses[i]
                        : "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Signatures
          </h4>
          {assignments === undefined ? (
            <p className="text-sm text-gray-500">Loading signatures…</p>
          ) : assignments.length === 0 ? (
            <p className="text-sm text-gray-500">
              No crew members have signed off on this talk yet.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
              {assignments.map((a: Doc<"toolboxTalkAssignments">) => (
                <AssignmentRow
                  key={a._id}
                  assignment={a}
                  organizationId={organizationId}
                />
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </Card>
  );
}

function AssignmentRow({
  assignment,
  organizationId,
}: {
  assignment: Doc<"toolboxTalkAssignments">;
  organizationId: string | undefined;
}) {
  const worker = useQuery(api.users.getUserById, {
    userId: assignment.userId,
    organizationId,
  });
  return (
    <li className="flex items-center justify-between px-3 py-2 text-sm">
      <span className="text-gray-800">
        {worker === undefined
          ? "Loading…"
          : (worker?.name ?? "Crew member")}
      </span>
      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
        Signed {formatUTCDate(assignment.completedAt)}
      </span>
    </li>
  );
}

/* ----------------------------------------------------------- Deliver modal */

function DeliverTalkModal({
  projectId,
  organizationId,
  supervisorId,
  onClose,
}: {
  projectId: Id<"projects">;
  organizationId: string | undefined;
  supervisorId: Id<"users">;
  onClose: () => void;
}) {
  const createSession = useMutation(api.toolboxTalkSessions.create);

  const talks = useQuery(
    api.toolboxTalks.list,
    organizationId ? { organizationId } : "skip"
  );
  const taskForces = useQuery(api.taskForce_project.getTaskForcesByProject, {
    projectId,
  });

  const [talkId, setTalkId] = useState<Id<"toolboxTalks"> | "">("");
  const [taskForceId, setTaskForceId] = useState<Id<"taskForces"> | "">("");
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedTalk = useQuery(
    api.toolboxTalks.getById,
    talkId ? { id: talkId } : "skip"
  );

  const questions: string[] = useMemo(
    () => selectedTalk?.questions ?? [],
    [selectedTalk]
  );

  const handleSubmit = async () => {
    setError(null);
    if (!talkId) {
      setError("Pick a toolbox talk.");
      return;
    }
    if (!taskForceId) {
      setError("Pick a team.");
      return;
    }

    // Build a responses array aligned to the talk's questions.
    const responseArray = questions.map((_, i) => (responses[i] ?? "").trim());

    setSaving(true);
    try {
      await createSession({
        toolboxTalkId: talkId,
        taskForceId,
        projectId,
        supervisorId,
        responses: responseArray,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to deliver toolbox talk."
      );
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Deliver Toolbox Talk"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={saving}
            data-testid="confirm-deliver-button"
          >
            Deliver
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

        <Field label="Toolbox talk" htmlFor="deliver-talk" required>
          {talks === undefined ? (
            <p className="text-sm text-gray-500">Loading talks…</p>
          ) : talks.length === 0 ? (
            <p className="text-sm text-gray-500">
              No talks available. Create one in the org Toolbox Talks page first.
            </p>
          ) : (
            <Select
              id="deliver-talk"
              value={talkId}
              onChange={(e) =>
                setTalkId(e.target.value as Id<"toolboxTalks"> | "")
              }
              data-testid="deliver-talk-select"
            >
              <option value="">Select a talk…</option>
              {talks.map((talk: Doc<"toolboxTalks">) => (
                <option key={talk._id} value={talk._id}>
                  {talk.title} ({talk.category})
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Team" htmlFor="deliver-team" required>
          {taskForces === undefined ? (
            <p className="text-sm text-gray-500">Loading teams…</p>
          ) : taskForces.length === 0 ? (
            <p className="text-sm text-gray-500">
              No teams assigned to this project.
            </p>
          ) : (
            <Select
              id="deliver-team"
              value={taskForceId}
              onChange={(e) =>
                setTaskForceId(e.target.value as Id<"taskForces"> | "")
              }
              data-testid="deliver-team-select"
            >
              <option value="">Select a team…</option>
              {(taskForces as TaskForce[]).map((tf) => (
                <option key={tf._id} value={tf._id}>
                  {tf.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          label="Date"
          hint="The session is recorded as delivered today."
        >
          <Input
            type="text"
            value={formatUTCDate(Date.now())}
            disabled
            readOnly
            data-testid="deliver-date"
          />
        </Field>

        {talkId && selectedTalk && questions.length > 0 ? (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Responses
            </h4>
            <div className="space-y-3">
              {questions.map((q, i) => (
                <Field key={i} label={q} htmlFor={`response-${i}`}>
                  <Textarea
                    id={`response-${i}`}
                    rows={2}
                    value={responses[i] ?? ""}
                    onChange={(e) =>
                      setResponses((prev) => ({ ...prev, [i]: e.target.value }))
                    }
                    placeholder="Record the crew's answer…"
                    data-testid={`response-input-${i}`}
                  />
                </Field>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

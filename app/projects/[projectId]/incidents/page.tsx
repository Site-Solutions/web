"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
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
  StatusBadge,
  Textarea,
} from "@/components/ui";
import { useOrg } from "@/lib/useOrg";
import { formatUTCDate } from "@/lib/dateFormat";
import { AlertTriangle, Plus } from "lucide-react";

/* ----------------------------------------------------------- enums/options */

const INCIDENT_TYPES = [
  "Injury incident",
  "Formal incident 2",
  "Formal incident 3",
  "Informal incident/issue",
] as const;
type IncidentType = (typeof INCIDENT_TYPES)[number];

const SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;
type Severity = (typeof SEVERITIES)[number];

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

/** Convert a yyyy-mm-dd input value into a UTC-midnight timestamp. */
function dateInputToUTC(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
}

function todayInputValue(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* ----------------------------------------------------------------- stats */

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="px-4 py-3">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------- page */

export default function ProjectIncidentsPage() {
  const params = useParams();
  const projectId = params.projectId as Id<"projects">;

  const { user, organizationId, isLoading } = useOrg();

  const stats = useQuery(
    api.incidents.getStats,
    projectId ? { projectId } : "skip"
  );
  const incidents = useQuery(
    api.incidents.listByProject,
    projectId ? { projectId } : "skip"
  );

  const createIncident = useMutation(api.incidents.create);

  const [statusFilter, setStatusFilter] = useState<IncidentStatus | "all">(
    "all"
  );
  const [modalOpen, setModalOpen] = useState(false);

  // create-form state
  const [title, setTitle] = useState("");
  const [incidentType, setIncidentType] = useState<IncidentType>(
    "Informal incident/issue"
  );
  const [severity, setSeverity] = useState<Severity>("Low");
  const [location, setLocation] = useState("");
  const [incidentDate, setIncidentDate] = useState<string>(todayInputValue());
  const [description, setDescription] = useState("");
  const [immediateAction, setImmediateAction] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!incidents) return [];
    if (statusFilter === "all") return incidents;
    return incidents.filter((i: Doc<"incidents">) => i.status === statusFilter);
  }, [incidents, statusFilter]);

  function resetForm() {
    setTitle("");
    setIncidentType("Informal incident/issue");
    setSeverity("Low");
    setLocation("");
    setIncidentDate(todayInputValue());
    setDescription("");
    setImmediateAction("");
    setFormError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !organizationId) return;
    if (!title.trim() || !description.trim() || !location.trim()) {
      setFormError("Title, location and description are required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await createIncident({
        projectId,
        title: title.trim(),
        description: description.trim(),
        incidentType,
        severity,
        location: location.trim(),
        incidentDate: dateInputToUTC(incidentDate),
        reportedBy: user._id,
        organizationId,
        immediateAction: immediateAction.trim() || undefined,
      });
      setModalOpen(false);
      resetForm();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to report incident."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <>
        <ProjectNav projectId={projectId} />
        <PageContainer>
          <LoadingState />
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <ProjectNav projectId={projectId} />
      <PageContainer>
        <PageHeader
          title="Incidents"
          subtitle="Safety incident reporting and tracking"
          actions={
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setModalOpen(true)}
            >
              Report Incident
            </Button>
          }
        />

        {/* stats */}
        {stats === undefined ? (
          <LoadingState label="Loading stats…" />
        ) : (
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Open" value={stats.open} />
            <StatCard
              label="Investigating"
              value={stats.underInvestigation}
            />
            <StatCard label="Resolved" value={stats.resolved} />
            <StatCard label="Closed" value={stats.closed} />
          </div>
        )}

        {/* status filter */}
        <div className="mb-4 flex flex-wrap gap-2">
          {(["all", ...STATUSES] as const).map((value) => {
            const active = statusFilter === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {value === "all" ? "All" : value}
              </button>
            );
          })}
        </div>

        {/* list */}
        {incidents === undefined ? (
          <LoadingState label="Loading incidents…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle className="h-8 w-8" />}
            title="No incidents"
            description={
              statusFilter === "all"
                ? "No incidents have been reported for this project yet."
                : `No incidents with status "${statusFilter}".`
            }
            action={
              <Button
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setModalOpen(true)}
              >
                Report Incident
              </Button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                    Incident
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                    Severity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">
                    Location
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((incident: Doc<"incidents">) => (
                  <tr key={incident._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/projects/${projectId}/incidents/${incident._id}`}
                        className="block"
                      >
                        <span className="text-sm font-medium text-gray-900">
                          {incident.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-gray-500">
                          {incident.incidentType}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={severityTone(incident.severity)}>
                        {incident.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={incident.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatUTCDate(incident.incidentDate)}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-600">
                      {incident.location || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/projects/${projectId}/incidents/${incident._id}`}
                        className="text-sm font-medium text-gray-700 hover:text-gray-900"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* report modal */}
        <Modal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            resetForm();
          }}
          title="Report Incident"
          size="lg"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Title" htmlFor="inc-title" required>
              <Input
                id="inc-title"
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTitle(e.target.value)
                }
                placeholder="Brief summary of the incident"
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Type" htmlFor="inc-type" required>
                <Select
                  id="inc-type"
                  value={incidentType}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setIncidentType(e.target.value as IncidentType)
                  }
                >
                  {INCIDENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Severity" htmlFor="inc-severity" required>
                <Select
                  id="inc-severity"
                  value={severity}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setSeverity(e.target.value as Severity)
                  }
                >
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Location" htmlFor="inc-location" required>
                <Input
                  id="inc-location"
                  value={location}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setLocation(e.target.value)
                  }
                  placeholder="Address or area"
                />
              </Field>

              <Field label="Date of incident" htmlFor="inc-date" required>
                <Input
                  id="inc-date"
                  type="date"
                  value={incidentDate}
                  max={todayInputValue()}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setIncidentDate(e.target.value)
                  }
                />
              </Field>
            </div>

            <Field label="Description" htmlFor="inc-description" required>
              <Textarea
                id="inc-description"
                rows={4}
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setDescription(e.target.value)
                }
                placeholder="What happened?"
              />
            </Field>

            <Field
              label="Immediate action taken"
              htmlFor="inc-action"
              hint="Optional — actions taken at the scene."
            >
              <Textarea
                id="inc-action"
                rows={3}
                value={immediateAction}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setImmediateAction(e.target.value)
                }
                placeholder="Actions taken immediately after the incident"
              />
            </Field>

            {formError ? (
              <p className="text-sm text-red-600">{formError}</p>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setModalOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Report Incident
              </Button>
            </div>
          </form>
        </Modal>
      </PageContainer>
    </>
  );
}

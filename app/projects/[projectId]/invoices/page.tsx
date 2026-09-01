"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useOrg } from "@/lib/useOrg";
import { formatCents, humanize } from "@/lib/format";
import { formatUTCDate } from "@/lib/dateFormat";
import ProjectNav from "@/components/ProjectNav";
import {
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
} from "@/components/ui";
import { FileText, Plus, Trash2 } from "lucide-react";

type InvoiceRow = Doc<"invoices"> & { clientName: string | null };

type LineDraft = {
  description: string;
  quantity: string;
  unitPrice: string; // dollars, as typed
  jobId?: Id<"jobs">;
};

const blankLine = (): LineDraft => ({
  description: "",
  quantity: "1",
  unitPrice: "",
});

/** Parse a dollar string into integer cents. Returns 0 for blanks/NaN. */
function dollarsToCents(value: string): number {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export default function ProjectInvoicesPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as Id<"projects">;

  const { user, organizationId, isLoading, hasOrg } = useOrg();

  const invoices = useQuery(
    api.invoices.listByProject,
    projectId ? { projectId } : "skip"
  ) as InvoiceRow[] | undefined;

  const [createOpen, setCreateOpen] = useState(false);

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

  if (!hasOrg) {
    return (
      <>
        <ProjectNav projectId={projectId} />
        <PageContainer>
          <EmptyState
            title="No organization"
            description="You need to belong to an organization to manage invoices."
          />
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <ProjectNav projectId={projectId} />
      <PageContainer>
        <PageHeader
          title="Invoices"
          subtitle="Bill clients for completed work and track payments."
          actions={
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
              New Invoice
            </Button>
          }
        />

        {invoices === undefined ? (
          <LoadingState label="Loading invoices…" />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="No invoices yet"
            description="Create your first invoice to bill a client for this project."
            action={
              <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
                New Invoice
              </Button>
            }
          />
        ) : (
          <Card className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <Th>Invoice</Th>
                  <Th>Client</Th>
                  <Th>Amount</Th>
                  <Th>Status</Th>
                  <Th>Due</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.map((inv) => (
                  <tr
                    key={inv._id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() =>
                      router.push(`/projects/${projectId}/invoices/${inv._id}`)
                    }
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      <Link
                        href={`/projects/${projectId}/invoices/${inv._id}`}
                        className="font-mono hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {inv.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {inv.clientName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatCents(inv.total)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={humanize(inv.status)} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {inv.dueAt ? formatUTCDate(inv.dueAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {createOpen && organizationId && user ? (
          <CreateInvoiceModal
            organizationId={organizationId}
            createdBy={user._id as Id<"users">}
            projectId={projectId}
            onClose={() => setCreateOpen(false)}
            onCreated={(invoiceId) =>
              router.push(`/projects/${projectId}/invoices/${invoiceId}`)
            }
          />
        ) : null}
      </PageContainer>
    </>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
      {children}
    </th>
  );
}

/* --------------------------------------------------------- Create modal */

function CreateInvoiceModal({
  organizationId,
  createdBy,
  projectId,
  onClose,
  onCreated,
}: {
  organizationId: string;
  createdBy: Id<"users">;
  projectId: Id<"projects">;
  onClose: () => void;
  onCreated: (invoiceId: Id<"invoices">) => void;
}) {
  const createDraft = useMutation(api.invoices.createDraft);

  const clients = useQuery(api.clients.getByOrganization, { organizationId }) as
    | Doc<"clients">[]
    | undefined;

  const [clientId, setClientId] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>(""); // yyyy-mm-dd
  const [notes, setNotes] = useState<string>("");
  const [lines, setLines] = useState<LineDraft[]>([blankLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Surface uninvoiced completed jobs for the selected client so the user
  // can prefill line items from them.
  const uninvoicedJobs = useQuery(
    api.invoices.listUninvoicedJobsForClient,
    clientId
      ? { organizationId, clientId: clientId as Id<"clients"> }
      : "skip"
  ) as Doc<"jobs">[] | undefined;

  const totalCents = useMemo(
    () =>
      lines.reduce(
        (sum, l) =>
          sum + Math.round((parseFloat(l.quantity) || 0) * dollarsToCents(l.unitPrice)),
        0
      ),
    [lines]
  );

  const updateLine = (i: number, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const addLine = () => setLines((prev) => [...prev, blankLine()]);
  const removeLine = (i: number) =>
    setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  const addJobLine = (job: Doc<"jobs">) => {
    setLines((prev) => {
      const next = prev.filter(
        (l) => l.description.trim() !== "" || l.unitPrice.trim() !== ""
      );
      next.push({
        description: `${job.title}${job.address ? ` — ${job.address}` : ""}`,
        quantity: "1",
        unitPrice: "",
        jobId: job._id,
      });
      return next.length ? next : [blankLine()];
    });
  };

  const canSubmit =
    clientId !== "" &&
    lines.some((l) => l.description.trim() !== "") &&
    !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const dueAt = dueDate ? Date.parse(`${dueDate}T00:00:00Z`) : undefined;
      const payloadLines = lines
        .filter((l) => l.description.trim() !== "")
        .map((l) => ({
          description: l.description.trim(),
          quantity: parseFloat(l.quantity) || 0,
          unitPrice: dollarsToCents(l.unitPrice),
          jobId: l.jobId,
        }));
      const jobIds = payloadLines
        .map((l) => l.jobId)
        .filter((id): id is Id<"jobs"> => Boolean(id));

      const { invoiceId } = await createDraft({
        organizationId,
        clientId: clientId as Id<"clients">,
        projectId,
        jobIds: jobIds.length ? jobIds : undefined,
        lines: payloadLines,
        dueAt,
        notes: notes.trim() || undefined,
        createdBy,
      });
      onCreated(invoiceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice");
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="New invoice"
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving} disabled={!canSubmit}>
            Create draft
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <Field label="Client" required>
          <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Select a client…</option>
            {(clients ?? []).map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        {clientId && uninvoicedJobs && uninvoicedJobs.length > 0 ? (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Uninvoiced completed jobs
            </p>
            <div className="flex flex-wrap gap-2">
              {uninvoicedJobs.map((job) => (
                <button
                  key={job._id}
                  type="button"
                  onClick={() => addJobLine(job)}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                >
                  <Plus className="h-3 w-3" />
                  {job.title}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Line items</p>
            <Button variant="ghost" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={addLine}>
              Add line
            </Button>
          </div>
          <div className="space-y-2">
            {lines.map((line, i) => {
              const lineTotal = Math.round(
                (parseFloat(line.quantity) || 0) * dollarsToCents(line.unitPrice)
              );
              return (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Description"
                      value={line.description}
                      onChange={(e) => updateLine(i, { description: e.target.value })}
                    />
                  </div>
                  <Input
                    className="w-20"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Qty"
                    value={line.quantity}
                    onChange={(e) => updateLine(i, { quantity: e.target.value })}
                  />
                  <Input
                    className="w-28"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Unit $"
                    value={line.unitPrice}
                    onChange={(e) => updateLine(i, { unitPrice: e.target.value })}
                  />
                  <div className="w-24 pt-2 text-right text-sm text-gray-700">
                    {formatCents(lineTotal)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    className="mt-2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:opacity-40"
                    disabled={lines.length === 1}
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex justify-end border-t border-gray-100 pt-3 text-sm">
            <span className="mr-4 text-gray-500">Total</span>
            <span className="font-semibold text-gray-900">{formatCents(totalCents)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Due date">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        </div>

        <Field label="Notes" hint="Shown to the client on the invoice.">
          <Input
            placeholder="Optional note…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}

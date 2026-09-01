"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useOrg } from "@/lib/useOrg";
import { formatCents, humanize } from "@/lib/format";
import { formatUTCDate } from "@/lib/dateFormat";
import ProjectNav from "@/components/ProjectNav";
import {
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
} from "@/components/ui";
import {
  Check,
  Copy,
  CreditCard,
  Plus,
  RotateCcw,
  Send,
  Trash2,
} from "lucide-react";

type LineDraft = {
  description: string;
  quantity: string;
  unitPrice: string; // dollars as typed
  jobId?: Id<"jobs">;
};

type InvoiceLine = {
  _id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  jobId?: Id<"jobs">;
};

type InvoicePayment = {
  _id: string;
  paidAt: number;
  method: string;
  amount: number;
  refundedAmount?: number;
  stripePaymentIntentId?: string;
};

function centsToDollars(cents: number): string {
  return (cents / 100).toString();
}
function dollarsToCents(value: string): number {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const projectId = params.projectId as Id<"projects">;
  const invoiceId = params.invoiceId as Id<"invoices">;
  const backHref = `/projects/${projectId}/invoices`;

  const { user, isLoading, isAdmin } = useOrg();

  const invoice = useQuery(api.invoices.getById, invoiceId ? { invoiceId } : "skip");

  if (isLoading || invoice === undefined) {
    return (
      <>
        <ProjectNav projectId={projectId} />
        <PageContainer>
          <LoadingState />
        </PageContainer>
      </>
    );
  }

  if (invoice === null) {
    return (
      <>
        <ProjectNav projectId={projectId} />
        <PageContainer>
          <PageHeader title="Invoice" backHref={backHref} />
          <EmptyState title="Invoice not found" description="It may have been deleted." />
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <ProjectNav projectId={projectId} />
      <PageContainer>
        <InvoiceDetail
          invoice={invoice}
          backHref={backHref}
          currentUserId={user?._id as Id<"users"> | undefined}
          isAdmin={isAdmin}
        />
      </PageContainer>
    </>
  );
}

type HydratedInvoice = Doc<"invoices"> & {
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  lines: Doc<"invoice_line_items">[];
  payments: Doc<"invoice_payments">[];
  stripeChargesEnabled: boolean;
};

function InvoiceDetail({
  invoice,
  backHref,
  currentUserId,
  isAdmin,
}: {
  invoice: HydratedInvoice;
  backHref: string;
  currentUserId?: Id<"users">;
  isAdmin: boolean;
}) {
  const markSent = useMutation(api.invoices.markSent);
  const replaceLines = useMutation(api.invoices.replaceLines);

  const [actionError, setActionError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const isDraft = invoice.status === "draft";
  const outstanding = Math.max(0, invoice.total - invoice.amountPaid);
  const hasStripePayment = invoice.payments.some(
    (p: InvoicePayment) => p.method === "stripe" && p.stripePaymentIntentId && p.amount - (p.refundedAmount ?? 0) > 0
  );

  // Editable line state (only used when draft).
  const [lines, setLines] = useState<LineDraft[]>(() =>
    invoice.lines.map((l: InvoiceLine) => ({
      description: l.description,
      quantity: l.quantity.toString(),
      unitPrice: centsToDollars(l.unitPrice),
      jobId: l.jobId,
    }))
  );
  const [savingLines, setSavingLines] = useState(false);

  // Keep local edit state in sync when the invoice (and thus its lines) changes.
  useEffect(() => {
    setLines(
      invoice.lines.map((l: InvoiceLine) => ({
        description: l.description,
        quantity: l.quantity.toString(),
        unitPrice: centsToDollars(l.unitPrice),
        jobId: l.jobId,
      }))
    );
  }, [invoice.lines]);

  const publicUrl = useMemo(() => {
    if (!invoice.publicToken) return null;
    // The public invoice page is served from the Convex SITE URL
    // (`*.convex.site`). The app only exposes the deployment cloud URL
    // (`*.convex.cloud`) via NEXT_PUBLIC_CONVEX_URL, so derive the site URL
    // from it. An explicit NEXT_PUBLIC_CONVEX_SITE_URL override wins if set.
    const explicit = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
    const base =
      explicit ??
      (process.env.NEXT_PUBLIC_CONVEX_URL ?? "").replace(
        ".convex.cloud",
        ".convex.site"
      );
    if (!base) return null;
    return `${base}/invoice?t=${invoice.publicToken}`;
  }, [invoice.publicToken]);

  const handleMarkSent = async () => {
    setMarking(true);
    setActionError(null);
    try {
      await markSent({ invoiceId: invoice._id });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to mark sent");
    } finally {
      setMarking(false);
    }
  };

  const handleSaveLines = async () => {
    setSavingLines(true);
    setActionError(null);
    try {
      await replaceLines({
        invoiceId: invoice._id,
        lines: lines
          .filter((l) => l.description.trim() !== "")
          .map((l) => ({
            description: l.description.trim(),
            quantity: parseFloat(l.quantity) || 0,
            unitPrice: dollarsToCents(l.unitPrice),
            jobId: l.jobId,
          })),
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to save lines");
    } finally {
      setSavingLines(false);
    }
  };

  const handleCopyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  const draftTotal = useMemo(
    () =>
      lines.reduce(
        (s, l) => s + Math.round((parseFloat(l.quantity) || 0) * dollarsToCents(l.unitPrice)),
        0
      ),
    [lines]
  );

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="font-mono">{invoice.number}</span>
            <StatusBadge status={humanize(invoice.status)} />
          </span>
        }
        subtitle={invoice.clientName ?? undefined}
        backHref={backHref}
        actions={
          <>
            {isDraft ? (
              <Button leftIcon={<Send className="h-4 w-4" />} onClick={handleMarkSent} loading={marking}>
                Mark Sent
              </Button>
            ) : null}
            {!isDraft && invoice.status !== "cancelled" && outstanding > 0 ? (
              <Button
                variant="secondary"
                leftIcon={<CreditCard className="h-4 w-4" />}
                onClick={() => setPayOpen(true)}
              >
                Record Payment
              </Button>
            ) : null}
            {isAdmin && hasStripePayment ? (
              <Button
                variant="secondary"
                leftIcon={<RotateCcw className="h-4 w-4" />}
                onClick={() => setRefundOpen(true)}
              >
                Refund
              </Button>
            ) : null}
          </>
        }
      />

      {actionError ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      {publicUrl ? (
        <Card className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Public pay link
              </p>
              <p className="truncate text-sm text-gray-700">{publicUrl}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              onClick={handleCopyLink}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Line items */}
          <Card>
            <CardHeader title="Line items" subtitle={isDraft ? "Editable while in draft." : undefined} />
            {isDraft ? (
              <DraftLineEditor
                lines={lines}
                setLines={setLines}
                draftTotal={draftTotal}
                onSave={handleSaveLines}
                saving={savingLines}
              />
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-2 text-left text-xs font-semibold uppercase text-gray-500">
                      Description
                    </th>
                    <th className="px-5 py-2 text-right text-xs font-semibold uppercase text-gray-500">
                      Qty
                    </th>
                    <th className="px-5 py-2 text-right text-xs font-semibold uppercase text-gray-500">
                      Unit
                    </th>
                    <th className="px-5 py-2 text-right text-xs font-semibold uppercase text-gray-500">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoice.lines.map((l: InvoiceLine) => (
                    <tr key={l._id}>
                      <td className="px-5 py-3 text-sm text-gray-900">{l.description}</td>
                      <td className="px-5 py-3 text-right text-sm text-gray-700">{l.quantity}</td>
                      <td className="px-5 py-3 text-right text-sm text-gray-700">
                        {formatCents(l.unitPrice)}
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-medium text-gray-900">
                        {formatCents(l.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {/* Payments */}
          <Card>
            <CardHeader title="Payments & refunds" />
            {invoice.payments.length === 0 ? (
              <div className="px-5 py-6 text-sm text-gray-500">No payments recorded yet.</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-2 text-left text-xs font-semibold uppercase text-gray-500">
                      Date
                    </th>
                    <th className="px-5 py-2 text-left text-xs font-semibold uppercase text-gray-500">
                      Method
                    </th>
                    <th className="px-5 py-2 text-right text-xs font-semibold uppercase text-gray-500">
                      Amount
                    </th>
                    <th className="px-5 py-2 text-right text-xs font-semibold uppercase text-gray-500">
                      Refunded
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoice.payments.map((p: InvoicePayment) => (
                    <tr key={p._id}>
                      <td className="px-5 py-3 text-sm text-gray-700">{formatUTCDate(p.paidAt)}</td>
                      <td className="px-5 py-3 text-sm text-gray-700">{humanize(p.method)}</td>
                      <td className="px-5 py-3 text-right text-sm font-medium text-gray-900">
                        {formatCents(p.amount)}
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-gray-600">
                        {p.refundedAmount ? `-${formatCents(p.refundedAmount)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        {/* Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Summary" />
            <dl className="space-y-3 px-5 py-4 text-sm">
              <Row label="Subtotal" value={formatCents(invoice.subtotal)} />
              {invoice.taxRate ? (
                <Row
                  label={`Tax (${(invoice.taxRate * 100).toFixed(2)}%)`}
                  value={formatCents(invoice.taxAmount)}
                />
              ) : null}
              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <dt className="font-semibold text-gray-900">Total</dt>
                <dd className="font-semibold text-gray-900">{formatCents(invoice.total)}</dd>
              </div>
              <Row label="Paid" value={formatCents(invoice.amountPaid)} />
              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <dt className="font-semibold text-gray-900">Amount due</dt>
                <dd className="font-semibold text-gray-900">{formatCents(outstanding)}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Details" />
            <dl className="space-y-3 px-5 py-4 text-sm">
              <Row label="Client" value={invoice.clientName ?? "—"} />
              <Row label="Email" value={invoice.clientEmail ?? "—"} />
              <Row label="Issued" value={invoice.issuedAt ? formatUTCDate(invoice.issuedAt) : "—"} />
              <Row label="Due" value={invoice.dueAt ? formatUTCDate(invoice.dueAt) : "—"} />
              {invoice.notes ? <Row label="Notes" value={invoice.notes} /> : null}
            </dl>
          </Card>
        </div>
      </div>

      {payOpen && currentUserId ? (
        <RecordPaymentModal
          invoiceId={invoice._id}
          outstanding={outstanding}
          recordedBy={currentUserId}
          onClose={() => setPayOpen(false)}
        />
      ) : null}

      {refundOpen ? (
        <RefundModal invoiceId={invoice._id} onClose={() => setRefundOpen(false)} />
      ) : null}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right text-gray-900">{value}</dd>
    </div>
  );
}

/* --------------------------------------------------- Draft line editor */

function DraftLineEditor({
  lines,
  setLines,
  draftTotal,
  onSave,
  saving,
}: {
  lines: LineDraft[];
  setLines: React.Dispatch<React.SetStateAction<LineDraft[]>>;
  draftTotal: number;
  onSave: () => void;
  saving: boolean;
}) {
  const updateLine = (i: number, patch: Partial<LineDraft>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () =>
    setLines((prev) => [...prev, { description: "", quantity: "1", unitPrice: "" }]);
  const removeLine = (i: number) =>
    setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  return (
    <div className="px-5 py-4">
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
      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
        <Button variant="ghost" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={addLine}>
          Add line
        </Button>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">Total</span>
          <span className="text-sm font-semibold text-gray-900">{formatCents(draftTotal)}</span>
          <Button size="sm" onClick={onSave} loading={saving}>
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------- Record payment modal */

function RecordPaymentModal({
  invoiceId,
  outstanding,
  recordedBy,
  onClose,
}: {
  invoiceId: Id<"invoices">;
  outstanding: number;
  recordedBy: Id<"users">;
  onClose: () => void;
}) {
  const recordPayment = useMutation(api.invoices.recordPayment);
  const [amount, setAmount] = useState<string>(centsToDollars(outstanding));
  const [method, setMethod] = useState<"cash" | "check" | "stripe" | "other">("cash");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const cents = dollarsToCents(amount);
    if (cents <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await recordPayment({
        invoiceId,
        amount: cents,
        method,
        notes: notes.trim() || undefined,
        recordedBy,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment");
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Record payment"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            Record
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
        <Field label="Amount" hint={`Outstanding: ${formatCents(outstanding)}`} required>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Method" required>
          <Select
            value={method}
            onChange={(e) =>
              setMethod(e.target.value as "cash" | "check" | "stripe" | "other")
            }
          >
            <option value="cash">Cash</option>
            <option value="check">Check</option>
            <option value="stripe">Stripe</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field label="Notes">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional…" />
        </Field>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------- Refund modal */

type RefundablePayment = {
  _id: Id<"invoice_payments">;
  amount: number;
  refundedAmount: number;
  remaining: number;
  paidAt: number;
  stripePaymentIntentId: string;
};

function RefundModal({
  invoiceId,
  onClose,
}: {
  invoiceId: Id<"invoices">;
  onClose: () => void;
}) {
  const refund = useAction(api.stripe.refundInvoicePayment);
  const payments = useQuery(api.invoices.listRefundableStripePayments, { invoiceId }) as
    | RefundablePayment[]
    | undefined;

  const [paymentId, setPaymentId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => payments?.find((p) => p._id === paymentId) ?? payments?.[0],
    [payments, paymentId]
  );

  // Default the amount to the selected payment's remaining balance.
  useEffect(() => {
    if (selected) setAmount(centsToDollars(selected.remaining));
  }, [selected]);

  const handleSubmit = async () => {
    if (!selected) return;
    const cents = dollarsToCents(amount);
    if (cents <= 0) {
      setError("Refund amount must be greater than zero.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await refund({
        invoiceId,
        paymentId: selected._id,
        amount: cents,
        reason: reason.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refund failed");
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Issue refund"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleSubmit} loading={saving} disabled={!selected}>
            Refund
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
        {payments === undefined ? (
          <LoadingState label="Loading payments…" />
        ) : payments.length === 0 ? (
          <p className="text-sm text-gray-600">No refundable Stripe payments on this invoice.</p>
        ) : (
          <>
            {payments.length > 1 ? (
              <Field label="Payment" required>
                <Select
                  value={selected?._id ?? ""}
                  onChange={(e) => setPaymentId(e.target.value)}
                >
                  {payments.map((p) => (
                    <option key={p._id} value={p._id}>
                      {formatUTCDate(p.paidAt)} · {formatCents(p.remaining)} available
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
            <Field
              label="Refund amount"
              hint={selected ? `Available: ${formatCents(selected.remaining)}` : undefined}
              required
            >
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label="Reason">
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional…"
              />
            </Field>
          </>
        )}
      </div>
    </Modal>
  );
}

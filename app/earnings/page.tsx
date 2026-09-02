"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useOrg } from "@/lib/useOrg";
import { formatCents } from "@/lib/format";
import { humanize } from "@/lib/format";
import { formatUTCDate } from "@/lib/dateFormat";
import { colors } from "@/lib/colors";
import {
  Card,
  CardHeader,
  PageContainer,
  PageHeader,
  LoadingState,
  EmptyState,
  Badge,
} from "@/components/ui";
import {
  TrendingUp,
  Clock,
  Trophy,
  Receipt,
  Lock,
  DollarSign,
} from "lucide-react";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function StatCard({
  label,
  value,
  subtitle,
  icon,
  accent,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {subtitle ? (
        <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
      ) : null}
    </Card>
  );
}

export default function EarningsPage() {
  const { organizationId, isSupervisor, isLoading } = useOrg();

  const stats = useQuery(
    api.earnings.getStats,
    organizationId ? { organizationId } : "skip"
  );
  const monthly = useQuery(
    api.earnings.getMonthlyRevenue,
    organizationId ? { organizationId, monthCount: 12 } : "skip"
  );
  const recent = useQuery(
    api.earnings.getRecentPayments,
    organizationId ? { organizationId, limit: 10 } : "skip"
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
        <PageHeader title="Earnings" backHref="/" />
        <EmptyState
          icon={<Lock className="h-10 w-10" />}
          title="Admins and supervisors only"
          description="Earnings overview is restricted to leadership roles in your organization."
        />
      </PageContainer>
    );
  }

  const loading =
    stats === undefined || monthly === undefined || recent === undefined;

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title="Earnings" backHref="/" />
        <LoadingState />
      </PageContainer>
    );
  }

  const delta =
    stats.paidLastMonth > 0
      ? {
          value:
            ((stats.paidThisMonth - stats.paidLastMonth) /
              stats.paidLastMonth) *
            100,
          positive: stats.paidThisMonth >= stats.paidLastMonth,
        }
      : undefined;

  const hasAnyData = stats.allTime > 0 || stats.outstanding > 0;
  const maxMonthly = Math.max(
    1,
    ...monthly.map((m: { year: number; month: number; total: number }) => m.total)
  );

  return (
    <PageContainer>
      <PageHeader
        title="Earnings"
        subtitle="Revenue, payments, and monthly trends"
        backHref="/"
      />

      {!hasAnyData ? (
        <EmptyState
          icon={<DollarSign className="h-10 w-10" />}
          title="No earnings yet"
          description="Once your first invoice is paid, this is where you'll see your revenue build up over time."
        />
      ) : (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="This month"
              value={formatCents(stats.paidThisMonth)}
              subtitle={
                delta
                  ? `${delta.positive ? "+" : ""}${delta.value.toFixed(
                      0
                    )}% vs last month`
                  : "First month tracked"
              }
              icon={<TrendingUp className="h-5 w-5" />}
              accent="#16a34a"
            />
            <StatCard
              label="Outstanding"
              value={formatCents(stats.outstanding)}
              subtitle={`${stats.outstandingCount} invoice${
                stats.outstandingCount === 1 ? "" : "s"
              }`}
              icon={<Clock className="h-5 w-5" />}
              accent="#F59E0B"
            />
            <StatCard
              label="All time (net of fees)"
              value={formatCents(stats.allTime - stats.allTimeFees)}
              subtitle={
                stats.firstPaymentAt
                  ? `Since ${new Date(stats.firstPaymentAt).toLocaleDateString(
                      "en-US",
                      { month: "short", year: "numeric" }
                    )}`
                  : undefined
              }
              icon={<Trophy className="h-5 w-5" />}
              accent={colors.primary}
            />
          </div>

          {stats.allTimeFees > 0 ? (
            <Card className="px-5 py-3">
              <p className="text-center text-xs text-gray-500">
                {formatCents(stats.allTime)} collected ·{" "}
                {formatCents(stats.allTimeFees)} in Stripe processing fees ·{" "}
                <span className="font-semibold text-gray-900">
                  {formatCents(stats.allTime - stats.allTimeFees)}
                </span>{" "}
                net to your bank
              </p>
            </Card>
          ) : null}

          {/* Monthly trend */}
          <Card>
            <CardHeader
              title="Last 12 months"
              subtitle="Net revenue collected by month"
            />
            <div className="px-5 py-5">
              <div className="flex items-end gap-2" style={{ height: 180 }}>
                {monthly.map((m: { year: number; month: number; total: number }) => {
                  const heightPct = (m.total / maxMonthly) * 100;
                  return (
                    <div
                      key={`${m.year}-${m.month}`}
                      className="flex flex-1 flex-col items-center justify-end gap-1"
                      title={`${MONTH_LABELS[m.month]} ${m.year}: ${formatCents(
                        m.total
                      )}`}
                    >
                      <span className="text-[10px] font-medium text-gray-500">
                        {m.total > 0 ? formatCents(m.total) : ""}
                      </span>
                      <div
                        className="w-full rounded-t"
                        style={{
                          height: `${Math.max(heightPct, m.total > 0 ? 4 : 0)}%`,
                          minHeight: m.total > 0 ? 4 : 0,
                          backgroundColor: colors.primary,
                        }}
                      />
                      <span className="text-[10px] text-gray-400">
                        {MONTH_LABELS[m.month]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Recent payments */}
          <Card>
            <CardHeader title="Recent payments" />
            {recent.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-500">
                No payments recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Client</th>
                      <th className="px-5 py-3">Invoice</th>
                      <th className="px-5 py-3">Method</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((p: {
                      _id: string;
                      paidAt: number;
                      clientName: string;
                      invoiceNumber?: string | null;
                      method: string;
                      amount: number;
                    }) => (
                      <tr
                        key={p._id}
                        className="border-b border-gray-50 last:border-0"
                      >
                        <td className="px-5 py-3 text-gray-600">
                          {formatUTCDate(p.paidAt)}
                        </td>
                        <td className="px-5 py-3 font-medium text-gray-900">
                          {p.clientName}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {p.invoiceNumber ?? "—"}
                        </td>
                        <td className="px-5 py-3">
                          <Badge tone={p.method === "stripe" ? "blue" : "gray"}>
                            {humanize(p.method) || "—"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-gray-900">
                          {formatCents(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center gap-2 border-t border-gray-100 px-5 py-3 text-xs text-gray-400">
              <Receipt className="h-3.5 w-3.5" />
              Showing the {recent.length} most recent payments
            </div>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}

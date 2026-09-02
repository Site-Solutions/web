"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { colors } from "@/lib/colors";
import { ArrowLeft, MapPin, ExternalLink } from "lucide-react";

function AuthorName({
  userId,
  organizationId,
}: {
  userId: Id<"users"> | undefined;
  organizationId: string | undefined;
}) {
  const u = useQuery(
    api.users.getUserById,
    userId && organizationId
      ? { userId, organizationId }
      : "skip"
  );
  if (!userId) return <span className="text-gray-400">—</span>;
  if (u === undefined) return <span className="text-gray-400">…</span>;
  return <span>{u?.name || "Unknown"}</span>;
}

function LogAttachedFiles({ logId }: { logId: Id<"dailyReport_log"> }) {
  const files = useQuery(api.dailyReports_log.getFilesForDailyReportLog, {
    dailyReportLogId: logId,
  });
  if (files === undefined) return <p className="text-xs text-gray-400">…</p>;
  if (!files.length) return null;
  return (
    <ul className="mt-2 space-y-1">
      {files.map((f: { _id: string; googleUrl?: string | null; name?: string | null } | null) =>
        f ? (
          <li key={f._id}>
            {f.googleUrl ? (
              <a
                href={f.googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium"
                style={{ color: colors.primary }}
              >
                {f.name || "File"}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="text-xs text-gray-600">{f.name || "File"}</span>
            )}
          </li>
        ) : null
      )}
    </ul>
  );
}

export default function DailyReportDetailPage() {
  const params = useParams();
  const projectId = params.projectId as Id<"projects">;
  const reportId = params.reportId as Id<"dailyReports">;

  const [status, setStatus] = useState<"complete" | "void" | "incomplete">(
    "incomplete"
  );
  const [comment, setComment] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const user = useQuery(api.users.getCurrentUser);
  const organizationId = user?.organizationIds?.[0]?.organizationId;

  const project = useQuery(
    api.projects.getProject,
    projectId ? { projectId } : "skip"
  );

  const report = useQuery(
    api.dailyReports.getDailyReportById,
    reportId ? { id: reportId } : "skip"
  );

  const logs = useQuery(
    api.dailyReports_log.getLogsForDailyReport,
    reportId ? { dailyReportId: reportId } : "skip"
  );

  const isSuperForProject = useQuery(
    api.supervisor_project.isSupervisorForProject,
    projectId && user?._id
      ? { projectId, userId: user._id }
      : "skip"
  );

  const isProjectManagerForProject = useQuery(
    api.projectManager_project.isUserProjectManagerForProject,
    user?._id && projectId
      ? { projectId, userId: user._id }
      : "skip"
  );

  const isForemanForTeam = useQuery(
    api.taskForces.isUserForeman,
    report?.taskForceId && user?._id
      ? { taskForceId: report.taskForceId, userId: user._id }
      : "skip"
  );

  const isAdmin = useMemo(() => {
    if (!user || !organizationId) return false;
    return user.organizationIds.some(
      (o: { organizationId: string; role: string }) =>
        o.organizationId === organizationId && o.role === "admin"
    );
  }, [user, organizationId]);

  const canEdit =
    !!isForemanForTeam ||
    !!isSuperForProject ||
    !!isProjectManagerForProject ||
    isAdmin;

  const createLog = useMutation(api.dailyReports_log.createDailyReportLog);

  useEffect(() => {
    if (report?.completionStatus) {
      setStatus(report.completionStatus);
    }
  }, [report?.completionStatus]);

  const displayWorkOrderId =
    report?.workOrderId?.trim() ||
    (typeof report?.taskOrderId === "number"
      ? String(report.taskOrderId)
      : "");

  const detailsEntries = useMemo(() => {
    if (!report?.details || typeof report.details !== "object") return [];
    return Object.entries(report.details as Record<string, unknown>).filter(
      ([, v]) => v !== undefined && v !== null && String(v).length > 0
    );
  }, [report?.details]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!report || !organizationId) return;
    const wo = report.workOrderId?.trim();
    if (!wo) {
      setSubmitError("This report has no work order ID; updates must be done in the app.");
      return;
    }
    setSubmitting(true);
    try {
      await createLog({
        status,
        workOrderId: wo,
        comment: comment.trim() || undefined,
        dailyReportId: report._id,
        fileIds: undefined,
      });
      setComment("");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to save update"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (
    user === undefined ||
    project === undefined ||
    report === undefined ||
    logs === undefined
  ) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-500">
        Loading…
      </div>
    );
  }

  if (project === null || report === null) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <p className="text-gray-700">Report or project not found.</p>
        <Link href="/projects" className="mt-4 inline-block text-sm font-medium" style={{ color: colors.primary }}>
          Back to projects
        </Link>
      </div>
    );
  }

  if (report.projectId !== projectId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-gray-700">
        This report does not belong to the selected project.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href={`/projects/${projectId}/daily-reports`}
        className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Daily reports
      </Link>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div
          className="px-6 py-4 border-b border-gray-100"
          style={{ backgroundColor: `${colors.primary}08` }}
        >
          <h1 className="text-xl font-bold text-gray-900">
            Work order {displayWorkOrderId || "—"}
          </h1>
          <p className="text-sm text-gray-600 mt-1">{project.name}</p>
          <p className="text-sm mt-2">
            <span
              className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${
                report.completionStatus === "complete"
                  ? "bg-green-100 text-green-800"
                  : report.completionStatus === "void"
                    ? "bg-amber-100 text-amber-900"
                    : "bg-gray-100 text-gray-700"
              }`}
            >
              {report.completionStatus}
            </span>
            <span className="ml-3 text-gray-500">
              Task order #{report.taskOrderId}
            </span>
          </p>
        </div>

        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Route / job details
          </h2>
          {detailsEntries.length === 0 ? (
            <p className="text-sm text-gray-500">No extra details.</p>
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              {detailsEntries.map(([key, value]) => {
                const str = String(value);
                const isAddr = key.toLowerCase().includes("address");
                return (
                  <div key={key}>
                    <dt className="text-xs font-medium text-gray-500">{key}</dt>
                    <dd className="text-sm text-gray-900 mt-0.5 break-words">
                      {isAddr && str ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(str)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:underline"
                          style={{ color: colors.primary }}
                        >
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {str}
                        </a>
                      ) : (
                        str
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}
        </div>

        <div className="px-6 py-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Activity log
          </h2>
          {logs.length === 0 ? (
            <p className="text-sm text-gray-500">No updates yet.</p>
          ) : (
            <ul className="space-y-4">
              {logs.map((log: Doc<"dailyReport_log">) => (
                <li
                  key={log._id}
                  className="rounded-lg border border-gray-100 bg-gray-50/80 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-gray-900">
                      {log.status}
                    </span>
                    <span className="text-gray-400">·</span>
                    <time
                      className="text-gray-500 text-xs"
                      dateTime={new Date(log._creationTime).toISOString()}
                    >
                      {new Date(log._creationTime).toLocaleString()}
                    </time>
                    <span className="text-gray-400">·</span>
                    <span className="text-xs text-gray-600">
                      <AuthorName
                        userId={log.createdBy}
                        organizationId={organizationId}
                      />
                    </span>
                  </div>
                  {log.comment ? (
                    <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                      {log.comment}
                    </p>
                  ) : null}
                  <LogAttachedFiles logId={log._id} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {canEdit ? (
          <div className="px-6 py-5 border-t border-gray-100 bg-gray-50/50">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Add update
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value as "complete" | "void" | "incomplete"
                    )
                  }
                  className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm text-gray-900"
                >
                  <option value="incomplete">Incomplete</option>
                  <option value="complete">Complete</option>
                  <option value="void">Void</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Comment
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm text-gray-900"
                  placeholder="Notes for the team…"
                />
              </div>
              {submitError ? (
                <p className="text-sm text-red-600">{submitError}</p>
              ) : null}
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50"
                style={{ backgroundColor: colors.primary }}
              >
                {submitting ? "Saving…" : "Save update"}
              </button>
              <p className="text-xs text-gray-500">
                Photo uploads are available in the mobile app for now.
              </p>
            </form>
          </div>
        ) : (
          <div className="px-6 py-4 border-t border-gray-100 text-sm text-gray-500">
            You don&apos;t have permission to add updates on this report.
          </div>
        )}
      </div>
    </div>
  );
}

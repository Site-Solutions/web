"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

/**
 * Tab bar shown on every in-project page. Mirrors the mobile app's
 * per-project feature set (daily reports, jobs, invoices, task lists, etc.).
 */
const TABS: Array<{ label: string; segment: string }> = [
  { label: "Daily Reports", segment: "daily-reports" },
  { label: "Jobs", segment: "jobs" },
  { label: "Invoices", segment: "invoices" },
  { label: "Task Lists", segment: "task-lists" },
  { label: "Incidents", segment: "incidents" },
  { label: "Toolbox Talks", segment: "toolbox-talks" },
  { label: "Schedules", segment: "schedules" },
  { label: "Photos", segment: "photos" },
  { label: "Files", segment: "files" },
];

export default function ProjectNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const href = `${base}/${tab.segment}`;
            const active = pathname.startsWith(href);
            return (
              <Link
                key={tab.segment}
                href={href}
                className={cx(
                  "whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                  active
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

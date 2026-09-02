"use client";

/**
 * App-style bottom tab bar, mirroring the mobile app's ProjectBottomBar:
 * Home / Jobs / [+ FAB] / Clients / More. Context-aware — inside a project the
 * Home and Jobs tabs target that project; elsewhere they target the portal's
 * top-level pages. "More" opens a sheet with everything else (the app's More
 * menu), and the center FAB opens quick-create shortcuts (the app's radial menu).
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Briefcase,
  Plus,
  X,
  Users,
  LayoutGrid,
  ClipboardList,
  Receipt,
  FileText,
  Wrench,
  Search,
  Upload,
  MapPin,
  Settings,
  CalendarDays,
  DollarSign,
  Eye,
  UsersRound,
} from "lucide-react";
import { colors } from "@/lib/colors";

const HIDDEN_PREFIXES = ["/sign-in", "/sign-up", "/unauthorized"];

const MORE_ITEMS = [
  { href: "/dashboard", label: "Daily Overview", Icon: CalendarDays },
  { href: "/teams", label: "Teams", Icon: UsersRound },
  { href: "/earnings", label: "Earnings", Icon: DollarSign },
  { href: "/toolbox-talks", label: "Toolbox Talks", Icon: Wrench },
  { href: "/search", label: "Search", Icon: Search },
  { href: "/view", label: "View Work Orders", Icon: Eye },
  { href: "/upload", label: "Upload", Icon: Upload },
  { href: "/address-history", label: "Address History", Icon: MapPin },
  { href: "/settings", label: "Settings", Icon: Settings },
];

export default function AppTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);
  const [showFab, setShowFab] = useState(false);

  // Close sheets on navigation.
  useEffect(() => {
    setShowMore(false);
    setShowFab(false);
  }, [pathname]);

  const projectId = useMemo(() => {
    const m = pathname.match(/^\/projects\/([^/]+)/);
    return m ? m[1] : null;
  }, [pathname]);

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const homeHref = projectId ? `/projects/${projectId}` : "/";
  const jobsHref = projectId ? `/projects/${projectId}/jobs` : "/projects";

  const tabs = [
    {
      label: projectId ? "Home" : "Home",
      href: homeHref,
      Icon: Home,
      active: projectId
        ? pathname === homeHref
        : pathname === "/" || (pathname.startsWith("/projects") && !projectId),
    },
    {
      label: "Jobs",
      href: jobsHref,
      Icon: Briefcase,
      active: projectId ? pathname.startsWith(jobsHref) : false,
    },
  ];
  const rightTabs = [
    {
      label: "Clients",
      href: "/clients",
      Icon: Users,
      active: pathname.startsWith("/clients"),
    },
  ];

  const fabActions = projectId
    ? [
        { label: "New Job", href: `/projects/${projectId}/jobs`, Icon: Briefcase, color: "#6366F1" },
        { label: "Invoice", href: `/projects/${projectId}/invoices`, Icon: Receipt, color: "#14B8A6" },
        { label: "Daily Report", href: `/projects/${projectId}/daily-reports`, Icon: FileText, color: colors.primary },
        { label: "Task List", href: `/projects/${projectId}/task-lists`, Icon: ClipboardList, color: "#F59E0B" },
      ]
    : [
        { label: "Open a Project", href: "/projects", Icon: Home, color: colors.primary },
        { label: "Clients", href: "/clients", Icon: Users, color: "#6366F1" },
        { label: "Upload", href: "/upload", Icon: Upload, color: "#14B8A6" },
      ];

  const tabClass = (active: boolean) =>
    `flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium transition-colors ${
      active ? "font-semibold" : "text-slate-400 hover:text-slate-500"
    }`;

  const moreActive = showMore;

  return (
    <>
      {/* Backdrop for sheets */}
      {(showMore || showFab) && (
        <button
          aria-label="Close menu"
          onClick={() => {
            setShowMore(false);
            setShowFab(false);
          }}
          className="fixed inset-0 z-40 bg-black/30"
        />
      )}

      {/* FAB quick actions */}
      {showFab && (
        <div className="fixed bottom-24 left-1/2 z-50 w-64 -translate-x-1/2 rounded-2xl bg-white p-2 shadow-xl">
          {fabActions.map(({ label, href, Icon, color }) => (
            <button
              key={label}
              onClick={() => {
                setShowFab(false);
                router.push(href);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: color }}
              >
                <Icon size={18} />
              </span>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* More sheet */}
      {showMore && (
        <div className="fixed bottom-20 left-1/2 z-50 w-[22rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl bg-white p-2 shadow-xl">
          <div className="grid grid-cols-3 gap-1">
            {MORE_ITEMS.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setShowMore(false)}
                className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center text-[11px] font-medium hover:bg-gray-50 ${
                  pathname.startsWith(href) ? "" : "text-gray-700"
                }`}
                style={pathname.startsWith(href) ? { color: colors.primary } : undefined}
              >
                <Icon size={20} style={pathname.startsWith(href) ? { color: colors.primary } : { color: "#64748B" }} />
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-100 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-around px-2">
          {tabs.map(({ label, href, Icon, active }) => (
            <Link
              key={label}
              href={href}
              className={tabClass(active)}
              style={active ? { color: colors.primary } : undefined}
            >
              <Icon size={24} />
              {label}
            </Link>
          ))}

          {/* Center FAB */}
          <div className="flex flex-1 items-start justify-center">
            <button
              aria-label="Quick actions"
              onClick={() => {
                setShowFab((v) => !v);
                setShowMore(false);
              }}
              className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105"
              style={{ backgroundColor: colors.primary }}
            >
              {showFab ? <X size={26} /> : <Plus size={26} />}
            </button>
          </div>

          {rightTabs.map(({ label, href, Icon, active }) => (
            <Link
              key={label}
              href={href}
              className={tabClass(active)}
              style={active ? { color: colors.primary } : undefined}
            >
              <Icon size={24} />
              {label}
            </Link>
          ))}
          <button
            onClick={() => {
              setShowMore((v) => !v);
              setShowFab(false);
            }}
            className={tabClass(moreActive)}
            style={moreActive ? { color: colors.primary } : undefined}
          >
            <LayoutGrid size={24} />
            More
          </button>
        </div>
      </nav>
    </>
  );
}

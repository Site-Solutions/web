"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, useMemo, useCallback } from "react";
import {
  ArrowLeft,
  FileText,
  Users,
  Ticket,
  Clock,
  Image as ImageIcon,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { colors } from "@/lib/colors";

import SummaryStats from "./components/SummaryStats";
import WorkOrderSidebar from "./components/WorkOrderSidebar";
import ActivityTimeline from "./components/ActivityTimeline";
import TeamsPanel from "./components/TeamsPanel";
import UtilitiesPanel from "./components/UtilitiesPanel";
import FilesGallery from "./components/FilesGallery";
import ImageLightbox from "./components/ImageLightbox";
import ReportDetailModal from "./components/ReportDetailModal";

type TabId = "activity" | "teams" | "utilities" | "files";

export default function AddressHistoryPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get("address");
  const projectId = searchParams.get("projectId") as Id<"projects"> | null;

  const [selectedWoid, setSelectedWoid] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("activity");
  const [timelineFilter, setTimelineFilter] = useState<"all" | "reports" | "tickets">("all");
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string; index: number } | null>(null);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  const historyData = useQuery(
    api.addressHistory.getAddressHistory,
    address && projectId ? { address, projectId } : "skip"
  );

  // Get project to find priority team
  const project = useQuery(
    api.projects.getProject,
    projectId ? { projectId } : "skip"
  );

  // --- Helpers ---
  const formatDate = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    // Get UTC date components to avoid timezone shifting
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth(); // 0-based
    const day = date.getUTCDate();
    
    // Month names for formatting
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Manually format to avoid any timezone issues
    return `${monthNames[month]} ${day}, ${year}`;
  }, []);

  const formatTime = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // --- Derived data ---
  const { woidTeamMap, reportsByWoid, filesByWoid, stats, timeline, groupedTimeline, imageFiles } =
    useMemo(() => {
      if (!historyData)
        return {
          woidTeamMap: new Map<string, Array<{ taskForceId: string; teamName: string; status: string; completionDate?: number }>>(),
          reportsByWoid: new Map<string, Array<any>>(),
          filesByWoid: new Map<string, Array<any>>(),
          stats: { complete: 0, inProgress: 0, void: 0, total: 0, percentage: 0 },
          timeline: [],
          groupedTimeline: {},
          imageFiles: [],
        };

      // Build WOID team map
      const _woidTeamMap = new Map<
        string,
        Array<{ taskForceId: string; teamName: string; status: string; completionDate?: number }>
      >();
      for (const assignment of historyData.woidAssignments) {
        if (!_woidTeamMap.has(assignment.workOrderId)) {
          _woidTeamMap.set(assignment.workOrderId, []);
        }
      }
      for (const taskForceGroup of historyData.taskForceAssignments) {
        const teams = taskForceGroup.teams.map((team: any) => ({
          taskForceId: team.taskForceId,
          teamName: team.taskForceName,
          status: team.status,
          completionDate: team.completionDate,
        }));
        _woidTeamMap.set(taskForceGroup.workOrderId, teams);
      }

      // Reports by WOID
      const _reportsByWoid = new Map<string, Array<any>>();
      for (const dr of historyData.dailyReports) {
        _reportsByWoid.set(dr.workOrderId, dr.reports);
      }

      // Files by WOID
      const _filesByWoid = new Map<string, typeof historyData.files>();
      for (const file of historyData.files) {
        const woid = file.workOrderId;
        if (!woid) continue;
        if (!_filesByWoid.has(woid)) _filesByWoid.set(woid, []);
        _filesByWoid.get(woid)!.push(file);
      }

      // Stats - based on priority team if set, otherwise all teams
      const priorityTeamId = project?.completingTeamId;
      let complete = 0,
        voidCount = 0,
        inProgress = 0;
      
      for (const [, teams] of _woidTeamMap.entries()) {
        if (priorityTeamId) {
          // Only check priority team's status
          const priorityTeam = teams.find((t) => t.taskForceId === priorityTeamId);
          if (priorityTeam) {
            if (priorityTeam.status === "void") voidCount++;
            else if (priorityTeam.status === "complete") complete++;
            else inProgress++;
          } else {
            // Priority team hasn't started this WOID yet
            inProgress++;
          }
        } else {
          // Fallback: all teams must complete
          const hasVoid = teams.some((t) => t.status === "void");
          const allComplete = teams.length > 0 && teams.every((t) => t.status === "complete");
          if (hasVoid) voidCount++;
          else if (allComplete) complete++;
          else inProgress++;
        }
      }
      const total = _woidTeamMap.size;
      const percentage = total > 0 ? Math.round((complete / total) * 100) : 0;

      // Timeline
      const _timeline = [
        ...historyData.dailyReports.flatMap(
          (dr: { workOrderId: string; reports: Array<any> }) =>
            dr.reports.map((report: any) => ({
              type: "report" as const,
              date: report.date, // Use the work date, not creation time
              workOrderId: dr.workOrderId,
              report,
            }))
        ),
        ...historyData.tickets.flatMap(
          (t: {
            ticketId: string;
            startDate?: number;
            updates: Array<{ _creationTime: number; utilityCompany: string; status: string }>;
          }) =>
            t.updates.map((u) => ({
              type: "ticket_update" as const,
              date: u._creationTime,
              ticketId: t.ticketId,
              startDate: t.startDate,
              update: u,
            }))
        ),
      ]
        .filter((item) => {
          if (timelineFilter === "all") return true;
          if (timelineFilter === "reports") return item.type === "report";
          if (timelineFilter === "tickets") return item.type === "ticket_update";
          return true;
        })
        .sort((a, b) => b.date - a.date);

      const _groupedTimeline = _timeline.reduce(
        (acc, item) => {
          const dateKey = new Date(item.date).toDateString();
          if (!acc[dateKey]) acc[dateKey] = [];
          acc[dateKey].push(item);
          return acc;
        },
        {} as Record<string, typeof _timeline>
      );

      // Image files for lightbox navigation
      const isImageFile = (fileName: string, fileType?: string) => {
        if (fileType && fileType.includes("image")) return true;
        const exts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"];
        return exts.some((ext) => fileName.toLowerCase().endsWith(ext));
      };
      const _imageFiles = historyData.files.filter((f: any) => isImageFile(f.name, f.fileType));

      return {
        woidTeamMap: _woidTeamMap,
        reportsByWoid: _reportsByWoid,
        filesByWoid: _filesByWoid,
        stats: { complete, inProgress, void: voidCount, total, percentage },
        timeline: _timeline,
        groupedTimeline: _groupedTimeline,
        imageFiles: _imageFiles,
      };
    }, [historyData, timelineFilter, project]);

  const getWoidStatus = useCallback(
    (woid: string) => {
      const teams = woidTeamMap.get(woid) || [];
      const priorityTeamId = project?.completingTeamId;
      
      if (priorityTeamId) {
        // Use only priority team's status
        const priorityTeam = teams.find((t) => t.taskForceId === priorityTeamId);
        if (priorityTeam) {
          if (priorityTeam.status === "void") return "void";
          if (priorityTeam.status === "complete") return "complete";
          return "in_progress";
        }
        // Priority team hasn't started this WOID yet
        return "not_started";
      } else {
        // Fallback: all teams must complete
        const hasVoid = teams.some((t) => t.status === "void");
        const allComplete = teams.length > 0 && teams.every((t) => t.status === "complete");
        if (hasVoid) return "void";
        if (allComplete) return "complete";
        if (teams.length > 0) return "in_progress";
        return "not_started";
      }
    },
    [woidTeamMap, project]
  );

  // --- Lightbox navigation ---
  const handleImageNavigate = useCallback(
    (direction: "prev" | "next") => {
      if (!selectedImage) return;
      const newIndex = direction === "prev" ? selectedImage.index - 1 : selectedImage.index + 1;
      if (newIndex < 0 || newIndex >= imageFiles.length) return;
      const file = imageFiles[newIndex];
      setSelectedImage({ url: file.googleUrl || "", name: file.name, index: newIndex });
    },
    [selectedImage, imageFiles]
  );

  // --- Guard states ---
  if (!address || !projectId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4" aria-hidden="true">
            !
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Missing Parameters</h1>
          <p className="text-gray-600">Address and Project ID are required.</p>
        </div>
      </div>
    );
  }

  if (!historyData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 mx-auto mb-4"
            style={{ borderTopColor: colors.primary }}
          />
          <p className="text-gray-500 text-sm">Loading address history...</p>
        </div>
      </div>
    );
  }

  // --- Tab config ---
  const tabs: Array<{ id: TabId; label: string; icon: typeof Clock; badge?: number }> = [
    { id: "activity", label: "Activity", icon: Clock },
    { id: "teams", label: "Teams", icon: Users },
    { id: "utilities", label: "Utilities", icon: Ticket },
    {
      id: "files",
      label: "Files",
      icon: FileText,
      badge: historyData.summary.totalFiles > 0 ? historyData.summary.totalFiles : undefined,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <Link
                href="/view"
                className="mt-1 p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                aria-label="Back to view"
              >
                <ArrowLeft className="h-5 w-5 text-gray-500" />
              </Link>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                  {address}
                </h1>
                <p className="text-gray-500 text-sm mt-0.5">
                  {stats.total} work order{stats.total !== 1 ? "s" : ""} &middot;{" "}
                  {historyData.summary.totalTeams} team
                  {historyData.summary.totalTeams !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right hidden sm:block">
                <div className="text-xs text-gray-500">Overall</div>
                <div className="text-lg font-bold text-gray-900 leading-tight">
                  {stats.percentage}%
                </div>
              </div>
              <div className="w-20 sm:w-24">
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${stats.percentage}%`,
                      backgroundColor: colors.primary,
                    }}
                  />
                </div>
                <div className="text-[10px] text-gray-400 text-right mt-0.5 sm:hidden">
                  {stats.percentage}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Summary Stats */}
        <div className="mb-5">
          <SummaryStats
            completeWoids={stats.complete}
            inProgressWoids={stats.inProgress}
            voidWoids={stats.void}
            totalTickets={historyData.summary.totalTickets}
          />
        </div>

        {/* Mobile WOID Pills */}
        <div className="mb-4 lg:hidden">
          <WorkOrderSidebar
            woidTeamMap={woidTeamMap}
            reportsByWoid={reportsByWoid}
            selectedWoid={selectedWoid}
            onSelectWoid={setSelectedWoid}
            getWoidStatus={getWoidStatus}
          />
        </div>

        {/* Main grid */}
        <div className="flex gap-6">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <WorkOrderSidebar
              woidTeamMap={woidTeamMap}
              reportsByWoid={reportsByWoid}
              selectedWoid={selectedWoid}
              onSelectWoid={setSelectedWoid}
              getWoidStatus={getWoidStatus}
            />
          </div>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <div className="flex overflow-x-auto scrollbar-none snap-x">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className="snap-start flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0"
                      style={{
                        borderBottomColor: activeTab === tab.id ? colors.primary : "transparent",
                        color: activeTab === tab.id ? colors.primary : "#6b7280",
                      }}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                      {tab.badge !== undefined && (
                        <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-[11px] font-medium">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              <div className="p-5">
                {activeTab === "activity" && (
                  <ActivityTimeline
                    groupedTimeline={groupedTimeline}
                    timelineFilter={timelineFilter}
                    onFilterChange={setTimelineFilter}
                    onSelectReport={setSelectedReport}
                    formatDate={formatDate}
                    formatTime={formatTime}
                    selectedWoid={selectedWoid}
                  />
                )}

                {activeTab === "teams" && (
                  <TeamsPanel
                    woidTeamMap={woidTeamMap}
                    selectedWoid={selectedWoid}
                    formatDate={formatDate}
                    priorityTeamId={project?.completingTeamId}
                  />
                )}

                {activeTab === "utilities" && (
                  <UtilitiesPanel
                    tickets={historyData.tickets}
                    formatDate={formatDate}
                  />
                )}

                {activeTab === "files" && (
                  <FilesGallery
                    files={historyData.files}
                    onSelectImage={(img) =>
                      setSelectedImage({ url: img.url, name: img.name, index: img.index })
                    }
                    formatDate={formatDate}
                    selectedWoid={selectedWoid}
                  />
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Image Lightbox */}
      {selectedImage && (
        <ImageLightbox
          image={selectedImage}
          totalImages={imageFiles.length}
          onClose={() => setSelectedImage(null)}
          onNavigate={handleImageNavigate}
        />
      )}

      {/* Report Detail Modal */}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onViewImage={(img) => {
            setSelectedReport(null);
            const idx = imageFiles.findIndex((f: any) => f.googleUrl === img.url);
            setSelectedImage({ url: img.url, name: img.name, index: idx >= 0 ? idx : 0 });
          }}
          formatDate={formatDate}
          formatTime={formatTime}
        />
      )}
    </div>
  );
}

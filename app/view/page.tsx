"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { colors } from "@/lib/colors";

export default function ViewPage() {
  const { user: clerkUser } = useUser();
  const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Get current logged in user
  const user = useQuery(api.users.getCurrentUser);
  const organizationId = user?.organizationIds?.[0]?.organizationId;

  // Get projects for the organization
  const projects = useQuery(
    api.projects.getProjectsForCurrentUser,
    organizationId ? { organizationId } : "skip"
  );

  // Get selected project details
  const selectedProject = useQuery(
    api.projects.getProject,
    selectedProjectId ? { projectId: selectedProjectId } : "skip"
  );

  // Get all addresses for the selected project
  const allAddresses = useQuery(
    api.ticketUpdates.getAllProjectAddresses,
    selectedProjectId ? { projectId: selectedProjectId } : "skip"
  );

  // Enriched search results - only query when user searches 2+ chars
  const searchResults = useQuery(
    api.search.searchAddressesOrWOIDs,
    selectedProjectId && debouncedSearchTerm.length >= 2
      ? {
          projectId: selectedProjectId,
          searchTerm: debouncedSearchTerm,
        }
      : "skip"
  );

  // Debounce search term for enriched search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Sort, filter, and group addresses alphabetically
  const { filteredAddresses, groupedAddresses, totalCount, filteredCount } = useMemo(() => {
    if (!allAddresses) return { filteredAddresses: [], groupedAddresses: new Map<string, string[]>(), totalCount: 0, filteredCount: 0 };

    const sorted = [...allAddresses].sort((a, b) => a.localeCompare(b));
    const totalCount = sorted.length;

    const filtered = searchTerm
      ? sorted.filter((addr) => addr.toLowerCase().includes(searchTerm.toLowerCase()))
      : sorted;

    const grouped = new Map<string, string[]>();
    for (const addr of filtered) {
      const letter = addr.charAt(0).toUpperCase();
      const key = /[A-Z]/.test(letter) ? letter : "#";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(addr);
    }

    return { filteredAddresses: filtered, groupedAddresses: grouped, totalCount, filteredCount: filtered.length };
  }, [allAddresses, searchTerm]);

  // Build a lookup from enriched search results for addresses that match
  const enrichedMap = useMemo(() => {
    const map = new Map<string, {
      woidCount: number;
      teamCount: number;
      reportCount: number;
      ticketCount: number;
      latestStatus?: string;
      latestReportDate?: number;
      woids: string[];
    }>();
    if (searchResults) {
      for (const r of searchResults) {
        map.set(r.address, r);
      }
    }
    return map;
  }, [searchResults]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status?: string) => {
    const statusConfig: Record<string, { bg: string; text: string }> = {
      complete: { bg: "bg-green-50", text: "text-green-700" },
      incomplete: { bg: "bg-yellow-50", text: "text-yellow-700" },
      void: { bg: "bg-red-50", text: "text-red-700" },
    };
    const config = statusConfig[status || ""] || { bg: "bg-gray-50", text: "text-gray-600" };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown"}
      </span>
    );
  };

  const isLoading = selectedProjectId && allAddresses === undefined;
  const hasProject = !!selectedProjectId;
  const hasAddresses = allAddresses && allAddresses.length > 0;
  const isSearching = searchTerm.length > 0;
  const hasEnrichedResults = debouncedSearchTerm.length >= 2 && searchResults && searchResults.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Project Addresses</h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse and search addresses across your projects
          </p>
        </div>

        {/* Project Selector Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <label
            htmlFor="project"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Select Project
          </label>
          <select
            id="project"
            value={selectedProjectId || ""}
            onChange={(e) => {
              setSelectedProjectId(e.target.value ? (e.target.value as Id<"projects">) : null);
              setSearchTerm("");
            }}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white transition-colors focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ ["--tw-ring-color" as string]: colors.primary } as React.CSSProperties}
            disabled={!organizationId || projects === undefined}
          >
            <option value="">
              {!organizationId
                ? "Loading user..."
                : projects === undefined
                  ? "Loading projects..."
                  : projects.length === 0
                    ? "No projects available"
                    : "Select a project..."}
            </option>
            {projects?.map((project: { _id: Id<"projects">; name: string }) => (
              <option key={project._id} value={project._id}>
                {project.name}
              </option>
            ))}
          </select>
          {selectedProject?.completingTeamId && (
            <p className="mt-2 text-xs text-gray-500" style={{ color: colors.primary }}>
              Completion tracking is enabled for this project
            </p>
          )}
        </div>

        {/* No Project Selected */}
        {!hasProject && (
          <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full mb-4"
              style={{ backgroundColor: `${colors.primary}15` }}
            >
              <svg className="h-6 w-6" style={{ color: colors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900">No project selected</h3>
            <p className="mt-1 text-sm text-gray-500">
              Choose a project above to browse its addresses
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {/* Skeleton stat card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-gray-200" />
                <div>
                  <div className="h-3 w-20 bg-gray-200 rounded mb-2" />
                  <div className="h-6 w-12 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
            {/* Skeleton search bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-10 w-full bg-gray-200 rounded-lg" />
            </div>
            {/* Skeleton list items */}
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                <div className="h-4 w-2/3 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Content: Stats + Search + Address List */}
        {hasProject && !isLoading && (
          <>
            {/* Summary Stat */}
            {hasAddresses && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${colors.primary}15` }}
                  >
                    <svg className="h-5 w-5" style={{ color: colors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Addresses</p>
                    <p className="text-2xl font-bold text-gray-900">{totalCount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Search Bar */}
            {hasAddresses && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search addresses or WOIDs..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ ["--tw-ring-color" as string]: colors.primary } as React.CSSProperties}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {/* Filter count */}
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {isSearching
                      ? `Showing ${filteredCount.toLocaleString()} of ${totalCount.toLocaleString()} addresses`
                      : `${totalCount.toLocaleString()} addresses`}
                  </span>
                  {debouncedSearchTerm.length >= 2 && searchResults === undefined && (
                    <span className="flex items-center gap-1">
                      <span
                        className="inline-block h-2 w-2 rounded-full animate-pulse"
                        style={{ backgroundColor: colors.primary }}
                      />
                      Loading details...
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Enriched Search Results Section */}
            {hasEnrichedResults && (
              <div className="mb-6">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3 px-1">
                  Detailed Results ({searchResults.length})
                </h2>
                <div className="space-y-2">
                  {searchResults.map((result: any, index: number) => (
                    <Link
                      key={`enriched-${result.address}-${index}`}
                      href={`/address-history?address=${encodeURIComponent(result.address)}&projectId=${result.projectId}`}
                      className="group block bg-white rounded-xl border border-gray-200 p-4 transition-all hover:border-gray-300 hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 group-hover:underline truncate">
                            {result.address}
                          </h3>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                              {result.woidCount} WOID{result.woidCount !== 1 ? "s" : ""}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                              {result.teamCount} Team{result.teamCount !== 1 ? "s" : ""}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              {result.reportCount} Report{result.reportCount !== 1 ? "s" : ""}
                            </span>
                            {result.ticketCount > 0 && (
                              <span className="flex items-center gap-1">
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                                {result.ticketCount} Ticket{result.ticketCount !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                          {result.woidCount <= 3 && result.woids?.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {result.woids.map((woid: string) => (
                                <span key={woid} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-gray-100 text-gray-600">
                                  {woid}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          {result.teamStatuses && result.teamStatuses.length > 0 ? (
                            <div className="flex flex-col gap-1 items-end">
                              {result.teamStatuses.map((team: any) => (
                                <div key={team.teamId} className="flex items-center gap-1.5">
                                  {team.isPriority && (
                                    <span className="text-xs text-yellow-500">⭐</span>
                                  )}
                                  <span className="text-xs text-gray-500 truncate max-w-[80px]">
                                    {team.teamName}
                                  </span>
                                  {getStatusBadge(team.status)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            result.latestStatus && getStatusBadge(result.latestStatus)
                          )}
                          {result.latestReportDate && (
                            <span className="text-xs text-gray-400">
                              {formatDate(result.latestReportDate)}
                            </span>
                          )}
                          <svg
                            className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Alphabetical Address Directory */}
            {hasAddresses && filteredCount > 0 && (
              <div>
                {/* Section header only if enriched results are also showing */}
                {hasEnrichedResults && (
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3 px-1">
                    All Addresses
                  </h2>
                )}
                <div className="space-y-6">
                  {Array.from(groupedAddresses.entries()).map(([letter, addresses]) => (
                    <div key={letter}>
                      {/* Letter header - only show when not searching */}
                      {!isSearching && (
                        <div className="sticky top-0 z-10 mb-2">
                          <span
                            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-xs font-bold text-white"
                            style={{ backgroundColor: colors.primary }}
                          >
                            {letter}
                          </span>
                        </div>
                      )}
                      <div className="space-y-1.5">
                        {addresses.map((address) => {
                          const enriched = enrichedMap.get(address);
                          return (
                            <Link
                              key={address}
                              href={`/address-history?address=${encodeURIComponent(address)}&projectId=${selectedProjectId}`}
                              className="group flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3 transition-all hover:border-gray-300 hover:shadow-sm"
                            >
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-900 group-hover:underline">
                                  {address}
                                </span>
                                {/* Show inline enriched data if available from search */}
                                {enriched && (
                                  <div className="mt-0.5 flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                      <span>{enriched.woidCount} WOID{enriched.woidCount !== 1 ? "s" : ""}</span>
                                      <span className="text-gray-300">|</span>
                                      <span>{enriched.teamCount} team{enriched.teamCount !== 1 ? "s" : ""}</span>
                                    </div>
                                    {enriched.teamStatuses && enriched.teamStatuses.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5">
                                        {enriched.teamStatuses.map((team: any) => (
                                          <div key={team.teamId} className="flex items-center gap-1">
                                            {team.isPriority && (
                                              <span className="text-[10px] text-yellow-500">⭐</span>
                                            )}
                                            <span className="text-[10px] text-gray-500">
                                              {team.teamName}:
                                            </span>
                                            {getStatusBadge(team.status)}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <svg
                                className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0 ml-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No addresses found for project */}
            {hasProject && allAddresses && allAddresses.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-4">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-900">No addresses found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  This project doesn{"'"}t have any addresses yet
                </p>
              </div>
            )}

            {/* No filter matches */}
            {hasAddresses && filteredCount === 0 && isSearching && (
              <div className="bg-white rounded-xl border border-gray-200 py-12 text-center">
                <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="mt-3 text-sm font-semibold text-gray-900">No matches</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No addresses match &ldquo;{searchTerm}&rdquo;
                </p>
                <button
                  onClick={() => setSearchTerm("")}
                  className="mt-3 text-sm font-medium transition-colors hover:opacity-80"
                  style={{ color: colors.primary }}
                >
                  Clear search
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

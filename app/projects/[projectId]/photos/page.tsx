"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useOrg } from "@/lib/useOrg";
import { buildClerkTokenIdentifier } from "@/lib/clerkToken";
import { formatUTCDate } from "@/lib/dateFormat";
import {
  Card,
  Badge,
  Button,
  Modal,
  Select,
  Field,
  LoadingState,
  EmptyState,
  PageHeader,
  PageContainer,
} from "@/components/ui";
import ProjectNav from "@/components/ProjectNav";
import { ImageIcon, MapPin, Download, Trash2 } from "lucide-react";

type Photo = {
  _id: string;
  fileId: Id<"files">;
  url: string;
  name: string;
};

type AddressGroup = { address: string; photos: Photo[] };
type DateGroup = { date: number; addresses: AddressGroup[] };
type TeamGroup = {
  taskForceId: string | null;
  teamName: string;
  photoCount: number;
  dates: DateGroup[];
};

function DownloadLink({
  href,
  label,
  title,
}: {
  href: string;
  label?: string;
  title: string;
}) {
  return (
    <a
      href={href}
      title={title}
      className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}

export default function ProjectPhotosPage() {
  const params = useParams();
  const projectId = params.projectId as Id<"projects">;

  const { organizationId, isLoading, hasOrg, isSupervisor } = useOrg();
  const { userId: clerkUserId } = useAuth();
  const tokenIdentifier = buildClerkTokenIdentifier(clerkUserId ?? undefined);

  const deleteFile = useMutation(api.files.deleteFile);

  const teams = useQuery(
    api.projectPhotos.getByTeamForProject,
    projectId ? { projectId } : "skip"
  ) as TeamGroup[] | undefined;

  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredTeams = useMemo(() => {
    if (!teams) return [];
    if (teamFilter === "all") return teams;
    return teams.filter(
      (t: TeamGroup) => (t.taskForceId ?? "unassigned") === teamFilter
    );
  }, [teams, teamFilter]);

  const totalPhotos = useMemo(
    () => (teams ?? []).reduce((sum: number, t: TeamGroup) => sum + t.photoCount, 0),
    [teams]
  );

  function dlUrl(extra: Record<string, string>): string {
    const sp = new URLSearchParams({ projectId: projectId as string, ...extra });
    return `/api/photos/download?${sp.toString()}`;
  }

  function closeLightbox() {
    setLightbox(null);
    setConfirmDelete(false);
    setError(null);
  }

  async function handleDelete() {
    if (!lightbox) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteFile({
        fileId: lightbox.fileId,
        organizationId: organizationId as string,
        tokenIdentifier: tokenIdentifier as string,
      });
      closeLightbox();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete photo.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <ProjectNav projectId={projectId} />
      <PageContainer>
        <PageHeader
          title="Photos"
          subtitle={
            totalPhotos > 0
              ? `${totalPhotos} photo${totalPhotos === 1 ? "" : "s"} across all teams.`
              : "Field photos grouped by team, date, and address."
          }
          actions={
            <div className="flex items-end gap-2">
              {totalPhotos > 0 ? (
                <DownloadLink
                  href={dlUrl({})}
                  label="Download all"
                  title="Download all photos as a zip"
                />
              ) : null}
              {teams && teams.length > 1 ? (
                <div className="w-48">
                  <Field label="Team" htmlFor="photo-team">
                    <Select
                      id="photo-team"
                      value={teamFilter}
                      onChange={(e) => setTeamFilter(e.target.value)}
                    >
                      <option value="all">All teams</option>
                      {teams.map((t: TeamGroup) => (
                        <option
                          key={t.taskForceId ?? "unassigned"}
                          value={t.taskForceId ?? "unassigned"}
                        >
                          {t.teamName} ({t.photoCount})
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              ) : null}
            </div>
          }
        />

        {isLoading || !hasOrg || teams === undefined ? (
          <LoadingState label="Loading photos…" />
        ) : filteredTeams.length === 0 ? (
          <EmptyState
            icon={<ImageIcon className="h-8 w-8" />}
            title="No photos yet"
            description="Photos uploaded in the field will appear here, grouped by team and date."
          />
        ) : (
          <div className="space-y-10">
            {filteredTeams.map((team: TeamGroup) => (
              <section key={team.taskForceId ?? "unassigned"}>
                <div className="mb-4 flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {team.teamName}
                  </h2>
                  <Badge tone="gray">{team.photoCount}</Badge>
                  <div className="ml-auto">
                    <DownloadLink
                      href={dlUrl({ taskForceId: team.taskForceId ?? "unassigned" })}
                      label="Download team"
                      title={`Download all ${team.teamName} photos`}
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  {team.dates.map((dateGroup: DateGroup) => (
                    <Card key={dateGroup.date} className="px-5 py-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-gray-700">
                          {formatUTCDate(dateGroup.date)}
                        </h3>
                        <DownloadLink
                          href={dlUrl({
                            taskForceId: team.taskForceId ?? "unassigned",
                            date: String(dateGroup.date),
                          })}
                          label="Download day"
                          title="Download all photos for this day"
                        />
                      </div>
                      <div className="space-y-5">
                        {dateGroup.addresses.map((addr: AddressGroup) => (
                          <div key={addr.address}>
                            <div className="mb-2 flex items-center gap-1.5 text-sm text-gray-500">
                              <MapPin className="h-4 w-4 shrink-0" />
                              <span className="truncate">{addr.address}</span>
                              <span className="text-gray-400">
                                · {addr.photos.length}
                              </span>
                              <div className="ml-auto">
                                <DownloadLink
                                  href={dlUrl({
                                    taskForceId: team.taskForceId ?? "unassigned",
                                    date: String(dateGroup.date),
                                    address: addr.address,
                                  })}
                                  label="Download"
                                  title={`Download photos for ${addr.address}`}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                              {addr.photos.map((photo: Photo) => (
                                <button
                                  key={photo._id}
                                  type="button"
                                  onClick={() => {
                                    setLightbox(photo);
                                    setConfirmDelete(false);
                                    setError(null);
                                  }}
                                  className="group relative aspect-square overflow-hidden rounded-md border border-gray-200 bg-gray-100"
                                  title={photo.name}
                                >
                                  {/* External GCS/Google URL — plain img per spec */}
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={photo.url}
                                    alt={photo.name}
                                    loading="lazy"
                                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <Modal
          open={lightbox !== null}
          onClose={() => !deleting && closeLightbox()}
          title={lightbox?.name}
          size="xl"
          footer={
            lightbox ? (
              <div className="flex w-full items-center justify-between gap-2">
                <div>
                  {isSupervisor ? (
                    confirmDelete ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Delete this photo?</span>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={handleDelete}
                          loading={deleting}
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDelete(false)}
                          disabled={deleting}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Trash2 className="h-4 w-4" />}
                        onClick={() => setConfirmDelete(true)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    )
                  ) : null}
                </div>
                <a
                  href={lightbox.url}
                  download={lightbox.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
              </div>
            ) : null
          }
        >
          {lightbox ? (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox.url}
                alt={lightbox.name}
                className="max-h-[70vh] w-auto rounded-md"
              />
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </div>
          ) : null}
        </Modal>
      </PageContainer>
    </>
  );
}

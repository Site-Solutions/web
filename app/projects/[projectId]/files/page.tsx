"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useOrg } from "@/lib/useOrg";
import { buildClerkTokenIdentifier } from "@/lib/clerkToken";
import {
  Card,
  Button,
  Modal,
  LoadingState,
  EmptyState,
  PageHeader,
  PageContainer,
  cx,
} from "@/components/ui";
import ProjectNav from "@/components/ProjectNav";
import {
  Folder,
  FileText,
  ChevronRight,
  Home,
  ExternalLink,
  Download,
  Trash2,
} from "lucide-react";

type FolderDoc = Doc<"folders">;
type FileDoc = Doc<"files">;

type Crumb = { _id: Id<"folders">; name: string };

function isImageFile(file: FileDoc): boolean {
  if (file.fileType?.startsWith("image")) return true;
  if (file.name?.match(/\.(jpg|jpeg|png|gif|webp|heic)$/i)) return true;
  if (file.googleUrl?.match(/\.(jpg|jpeg|png|gif|webp|heic)/i)) return true;
  return false;
}

export default function ProjectFilesPage() {
  const params = useParams();
  const projectId = params.projectId as Id<"projects">;

  const { organizationId, isLoading, hasOrg, isSupervisor } = useOrg();
  const { userId: clerkUserId } = useAuth();
  const tokenIdentifier = buildClerkTokenIdentifier(clerkUserId ?? undefined);

  // undefined folderId = project root.
  const [folderId, setFolderId] = useState<Id<"folders"> | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<FileDoc | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteFile = useMutation(api.files.deleteFile);

  const argsReady = Boolean(projectId && organizationId && tokenIdentifier);

  const listing = useQuery(
    api.folders.listAtPath,
    argsReady
      ? {
          projectId,
          organizationId: organizationId as string,
          tokenIdentifier: tokenIdentifier as string,
          folderId,
        }
      : "skip"
  ) as { folders: FolderDoc[]; files: FileDoc[] } | undefined;

  const breadcrumb = useQuery(
    api.folders.breadcrumb,
    argsReady && folderId
      ? {
          folderId,
          organizationId: organizationId as string,
          tokenIdentifier: tokenIdentifier as string,
        }
      : "skip"
  ) as Crumb[] | undefined;

  const crumbs: Crumb[] = folderId ? breadcrumb ?? [] : [];

  const folders = listing?.folders ?? [];
  const allFiles = listing?.files ?? [];
  // Images live in the Photos tab — only show documents here.
  const files = useMemo(
    () => allFiles.filter((f: FileDoc) => !isImageFile(f)),
    [allFiles]
  );
  const hiddenImageCount = allFiles.length - files.length;
  const empty = folders.length === 0 && files.length === 0;

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteFile({
        fileId: pendingDelete._id,
        organizationId: organizationId as string,
        tokenIdentifier: tokenIdentifier as string,
      });
      setPendingDelete(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete file.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <ProjectNav projectId={projectId} />
      <PageContainer>
        <PageHeader
          title="Files"
          subtitle="Browse project folders and documents."
        />

        {/* Breadcrumbs */}
        <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm">
          <button
            type="button"
            onClick={() => setFolderId(undefined)}
            className={cx(
              "inline-flex items-center gap-1 rounded px-1.5 py-1 hover:bg-gray-100",
              folderId ? "text-gray-500" : "font-medium text-gray-900"
            )}
          >
            <Home className="h-4 w-4" />
            Files
          </button>
          {crumbs.map((crumb: Crumb, idx: number) => {
            const isLast = idx === crumbs.length - 1;
            return (
              <span key={crumb._id} className="flex items-center gap-1">
                <ChevronRight className="h-4 w-4 text-gray-300" />
                <button
                  type="button"
                  onClick={() => setFolderId(crumb._id)}
                  className={cx(
                    "rounded px-1.5 py-1 hover:bg-gray-100",
                    isLast ? "font-medium text-gray-900" : "text-gray-500"
                  )}
                >
                  {crumb.name}
                </button>
              </span>
            );
          })}
        </nav>

        {hiddenImageCount > 0 ? (
          <p className="mb-3 text-xs text-gray-500">
            {hiddenImageCount} image{hiddenImageCount === 1 ? "" : "s"} hidden —
            view them in the{" "}
            <a
              href={`/projects/${projectId}/photos`}
              className="underline hover:text-gray-700"
            >
              Photos
            </a>{" "}
            tab.
          </p>
        ) : null}

        {isLoading || !hasOrg || listing === undefined ? (
          <LoadingState label="Loading files…" />
        ) : empty ? (
          <EmptyState
            icon={<Folder className="h-8 w-8" />}
            title="This folder is empty"
            description="No subfolders or documents here."
          />
        ) : (
          <Card>
            <ul className="divide-y divide-gray-100">
              {folders.map((folder: FolderDoc) => (
                <li key={folder._id}>
                  <button
                    type="button"
                    onClick={() => setFolderId(folder._id)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-gray-50"
                  >
                    <Folder
                      className="h-5 w-5 shrink-0"
                      style={{ color: "#f59e0b" }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                      {folder.name}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                  </button>
                </li>
              ))}
              {files.map((file: FileDoc) => {
                const disabled = !file.googleUrl;
                return (
                  <li
                    key={file._id}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-gray-50"
                  >
                    <FileText className="h-5 w-5 shrink-0 text-gray-400" />
                    <a
                      href={file.googleUrl ?? "#"}
                      target={disabled ? undefined : "_blank"}
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (disabled) e.preventDefault();
                      }}
                      className={cx(
                        "min-w-0 flex-1",
                        disabled ? "cursor-default opacity-60" : ""
                      )}
                    >
                      <p className="truncate text-sm font-medium text-gray-900">
                        {file.name}
                      </p>
                      {file.description ? (
                        <p className="truncate text-xs text-gray-500">
                          {file.description}
                        </p>
                      ) : null}
                    </a>
                    {!disabled ? (
                      <a
                        href={file.googleUrl}
                        download={file.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Download"
                        className="shrink-0 rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    ) : null}
                    {isSupervisor ? (
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => setPendingDelete(file)}
                        className="shrink-0 rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : (
                      <ExternalLink className="h-4 w-4 shrink-0 text-gray-300" />
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        <Modal
          open={pendingDelete !== null}
          onClose={() => !deleting && setPendingDelete(null)}
          title="Delete file?"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete} loading={deleting}>
                Delete
              </Button>
            </>
          }
        >
          <p className="text-sm text-gray-600">
            Permanently delete{" "}
            <span className="font-medium text-gray-900">{pendingDelete?.name}</span>?
            This cannot be undone.
          </p>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </Modal>
      </PageContainer>
    </>
  );
}

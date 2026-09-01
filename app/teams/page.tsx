"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useOrg } from "@/lib/useOrg";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  LoadingState,
  Modal,
  PageContainer,
  PageHeader,
} from "@/components/ui";
import {
  Building2,
  ChevronRight,
  HardHat,
  Pencil,
  Plus,
  Trash2,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

// Shape returned by api.taskForces.getTeamsWithCounts
type TeamWithCounts = Doc<"taskForces"> & {
  memberCount: number;
  projectCount: number;
};

// Minimal user shape from api.users.getUsersByOrg
type OrgUser = {
  _id: Id<"users">;
  name?: string;
  image?: string;
};

export default function TeamsPage() {
  const { organizationId, isAdmin, isLoading, hasOrg } = useOrg();

  const teams = useQuery(
    api.taskForces.getTeamsWithCounts,
    organizationId ? { organizationId } : "skip"
  ) as TeamWithCounts[] | undefined;

  const orgUsers = useQuery(
    api.users.getUsersByOrg,
    organizationId ? { organizationId } : "skip"
  ) as OrgUser[] | undefined;

  const createTaskForce = useMutation(api.taskForces.createTaskForce);
  const updateTaskForce = useMutation(api.taskForces.updateTaskForce);
  const deleteTaskForce = useMutation(api.taskForces.deleteTaskForce);

  // Create / edit modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeamWithCounts | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation state
  const [deleting, setDeleting] = useState<TeamWithCounts | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Map userId -> display name for showing the foreman.
  const userNameById = useMemo(() => {
    const map = new Map<string, string>();
    if (orgUsers) {
      for (const u of orgUsers) {
        map.set(u._id as string, u.name?.trim() || "Unnamed user");
      }
    }
    return map;
  }, [orgUsers]);

  function openCreate() {
    setEditing(null);
    setName("");
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(team: TeamWithCounts) {
    setEditing(team);
    setName(team.name ?? "");
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSave() {
    if (!organizationId) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError("Name is required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await updateTaskForce({
          taskForceId: editing._id,
          name: trimmed,
          organizationId,
        });
      } else {
        await createTaskForce({ organizationId, name: trimmed });
      }
      setFormOpen(false);
      setEditing(null);
      setName("");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to save team."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting || !organizationId) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteTaskForce({
        taskForceId: deleting._id,
        organizationId,
      });
      setDeleting(null);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete team."
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState />
      </PageContainer>
    );
  }

  if (!hasOrg) {
    return (
      <PageContainer>
        <EmptyState
          icon={<Building2 className="h-8 w-8" />}
          title="No organization"
          description="You are not a member of an organization yet. Ask an admin to add you to get started."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Teams"
        subtitle="Manage your task forces, their crews, and the projects they work on."
        actions={
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={openCreate}
            data-testid="new-team-button"
          >
            New Team
          </Button>
        }
      />

      {teams === undefined ? (
        <LoadingState label="Loading teams…" />
      ) : teams.length === 0 ? (
        <EmptyState
          icon={<UsersRound className="h-8 w-8" />}
          title="No teams yet"
          description="Create your first team to start assigning crews and projects."
          action={
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={openCreate}
              data-testid="new-team-button-empty"
            >
              New Team
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team: TeamWithCounts) => {
            const foremanName = team.assignedWorker
              ? userNameById.get(team.assignedWorker as string)
              : null;
            return (
              <Card key={team._id} className="flex flex-col">
                <div className="flex items-start justify-between gap-3 px-5 py-4">
                  <Link
                    href={`/teams/${team._id}`}
                    className="min-w-0 flex-1 group"
                    data-testid={`team-row-${team._id}`}
                  >
                    <h3 className="truncate text-base font-semibold text-gray-900 group-hover:underline">
                      {team.name}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge tone={team.memberCount > 0 ? "blue" : "gray"}>
                        {team.memberCount}{" "}
                        {team.memberCount === 1 ? "member" : "members"}
                      </Badge>
                      <Badge tone={team.projectCount > 0 ? "purple" : "gray"}>
                        {team.projectCount}{" "}
                        {team.projectCount === 1 ? "project" : "projects"}
                      </Badge>
                    </div>
                  </Link>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(team)}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      aria-label={`Edit ${team.name}`}
                      data-testid={`edit-team-${team._id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setDeleting(team);
                        }}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Delete ${team.name}`}
                        data-testid={`delete-team-${team._id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="flex-1 space-y-2 border-t border-gray-100 px-5 py-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <HardHat className="h-4 w-4 shrink-0 text-gray-400" />
                    {foremanName ? (
                      <span className="truncate">
                        Foreman:{" "}
                        <span className="font-medium text-gray-900">
                          {foremanName}
                        </span>
                      </span>
                    ) : (
                      <span className="text-gray-400">No foreman assigned</span>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-100 px-5 py-3">
                  <Link
                    href={`/teams/${team._id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Manage team
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal
        open={formOpen}
        onClose={() => {
          if (!saving) setFormOpen(false);
        }}
        title={editing ? "Edit team" : "New team"}
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} data-testid="save-team-button">
              {editing ? "Save changes" : "Create team"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          ) : null}
          <Field label="Name" htmlFor="team-name" required>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Framing Crew"
              autoFocus
              data-testid="team-name-input"
            />
          </Field>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={deleting !== null}
        onClose={() => {
          if (!deleteBusy) setDeleting(null);
        }}
        title="Delete team"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleting(null)}
              disabled={deleteBusy}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={deleteBusy}
              data-testid="confirm-delete-team-button"
            >
              Delete
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {deleteError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {deleteError}
            </div>
          ) : null}
          <p className="text-sm text-gray-600">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-gray-900">
              {deleting?.name}
            </span>
            ? This removes its crew and project assignments. This cannot be
            undone.
          </p>
        </div>
      </Modal>
    </PageContainer>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useOrg } from "@/lib/useOrg";
import {
  Badge,
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
  Spinner,
} from "@/components/ui";
import {
  Building2,
  Check,
  FolderKanban,
  HardHat,
  Plus,
  Star,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";

// Minimal user shape used throughout (from getUsersByOrg / getWorkersForTaskForce)
type OrgUser = {
  _id: Id<"users">;
  name?: string;
  image?: string;
};

// Shape returned by api.taskForce_user.getWorkersForTaskForce
type WorkersResponse = {
  name: string | null;
  workers: OrgUser[];
  foreman: OrgUser | null;
};

type ProjectLite = { _id: Id<"projects">; name: string };

function displayName(user: { name?: string } | null | undefined): string {
  return user?.name?.trim() || "Unnamed user";
}

export default function TeamDetailPage() {
  const params = useParams();
  const teamId = params.teamId as Id<"taskForces">;
  const { organizationId, isAdmin, isSupervisor, isLoading, hasOrg } = useOrg();

  const team = useQuery(
    api.taskForces.get,
    organizationId ? { taskForceId: teamId, organizationId } : "skip"
  ) as Doc<"taskForces"> | null | undefined;

  const roster = useQuery(
    api.taskForce_user.getWorkersForTaskForce,
    organizationId ? { taskForceId: teamId } : "skip"
  ) as WorkersResponse | undefined;

  const orgUsers = useQuery(
    api.users.getUsersByOrg,
    organizationId ? { organizationId } : "skip"
  ) as OrgUser[] | undefined;

  const assignedProjectIds = useQuery(
    api.taskForce_project.getProjectsIdsByTaskForce,
    organizationId ? { taskForceId: teamId } : "skip"
  ) as Id<"projects">[] | undefined;

  const orgProjects = useQuery(
    api.projects.getProjectsForCurrentUser,
    organizationId ? { organizationId } : "skip"
  ) as Doc<"projects">[] | undefined;

  const updateTaskForce = useMutation(api.taskForces.updateTaskForce);
  const addWorker = useMutation(api.taskForce_user.addWorkerToTaskForce);
  const removeWorker = useMutation(api.taskForce_user.removeWorkerFromTaskForce);
  const assignForeman = useMutation(api.taskForces.assignWorkerToTaskForce);
  const removeForeman = useMutation(api.taskForces.removeWorkerFromTaskForce);
  const addProject = useMutation(api.taskForce_project.createTaskForceProject);
  const removeProject = useMutation(
    api.taskForce_project.removeTaskForceFromProject
  );

  // Inline name edit
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Per-row busy states (keyed by id) and section-level errors
  const [memberBusy, setMemberBusy] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const [foremanBusy, setForemanBusy] = useState<string | null>(null);
  const [foremanError, setForemanError] = useState<string | null>(null);

  const [projectBusy, setProjectBusy] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [addProjectOpen, setAddProjectOpen] = useState(false);

  const canManageRoster = isAdmin || isSupervisor;

  const members: OrgUser[] = roster?.workers ?? [];
  const foreman = roster?.foreman ?? null;

  const memberIds = useMemo(
    () => new Set(members.map((m) => m._id as string)),
    [members]
  );

  // Org users not yet on the team — candidates for adding.
  const candidateUsers = useMemo(() => {
    if (!orgUsers) return [];
    return orgUsers.filter((u) => !memberIds.has(u._id as string));
  }, [orgUsers, memberIds]);

  const assignedProjectIdSet = useMemo(
    () => new Set((assignedProjectIds ?? []).map((id) => id as string)),
    [assignedProjectIds]
  );

  const projectList: ProjectLite[] = useMemo(() => {
    if (!orgProjects) return [];
    return orgProjects.map((p) => ({ _id: p._id, name: p.name }));
  }, [orgProjects]);

  const assignedProjects = useMemo(
    () => projectList.filter((p) => assignedProjectIdSet.has(p._id as string)),
    [projectList, assignedProjectIdSet]
  );

  // ---- Name ----
  function openNameEdit() {
    setNameDraft(team?.name ?? "");
    setNameError(null);
    setEditingName(true);
  }

  async function saveName() {
    if (!organizationId) return;
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameError("Name is required.");
      return;
    }
    setNameSaving(true);
    setNameError(null);
    try {
      await updateTaskForce({
        taskForceId: teamId,
        name: trimmed,
        organizationId,
      });
      setEditingName(false);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Failed to rename.");
    } finally {
      setNameSaving(false);
    }
  }

  // ---- Members ----
  async function handleAddMember(userId: Id<"users">) {
    setMemberBusy(userId);
    setMemberError(null);
    try {
      await addWorker({ taskForceId: teamId, userId });
    } catch (err) {
      setMemberError(
        err instanceof Error ? err.message : "Failed to add member."
      );
    } finally {
      setMemberBusy(null);
    }
  }

  async function handleRemoveMember(userId: Id<"users">) {
    setMemberBusy(userId);
    setMemberError(null);
    try {
      await removeWorker({ taskForceId: teamId, userId });
    } catch (err) {
      setMemberError(
        err instanceof Error ? err.message : "Failed to remove member."
      );
    } finally {
      setMemberBusy(null);
    }
  }

  // ---- Foreman ----
  async function handleSetForeman(userId: Id<"users">) {
    if (!organizationId) return;
    setForemanBusy(userId);
    setForemanError(null);
    try {
      await assignForeman({
        taskForceId: teamId,
        assignedWorker: userId,
        organizationId,
      });
    } catch (err) {
      setForemanError(
        err instanceof Error ? err.message : "Failed to set foreman."
      );
    } finally {
      setForemanBusy(null);
    }
  }

  async function handleClearForeman() {
    if (!organizationId) return;
    setForemanBusy("__clear__");
    setForemanError(null);
    try {
      await removeForeman({ taskForceId: teamId, organizationId });
    } catch (err) {
      setForemanError(
        err instanceof Error ? err.message : "Failed to clear foreman."
      );
    } finally {
      setForemanBusy(null);
    }
  }

  // ---- Projects ----
  async function handleAddProject(projectId: Id<"projects">) {
    setProjectBusy(projectId);
    setProjectError(null);
    try {
      await addProject({ taskForceId: teamId, projectId });
    } catch (err) {
      setProjectError(
        err instanceof Error ? err.message : "Failed to assign project."
      );
    } finally {
      setProjectBusy(null);
    }
  }

  async function handleRemoveProject(projectId: Id<"projects">) {
    setProjectBusy(projectId);
    setProjectError(null);
    try {
      await removeProject({ taskForceId: teamId, projectId });
    } catch (err) {
      setProjectError(
        err instanceof Error ? err.message : "Failed to remove project."
      );
    } finally {
      setProjectBusy(null);
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

  if (team === null) {
    return (
      <PageContainer>
        <PageHeader title="Team" backHref="/teams" />
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="Team not found"
          description="This team does not exist or is not part of your organization."
          action={
            <Button onClick={() => history.back()}>Go back</Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={team?.name ?? "Team"}
        subtitle="Manage this team's crew, foreman, and project assignments."
        backHref="/teams"
        actions={
          canManageRoster && !editingName ? (
            <Button
              variant="secondary"
              onClick={openNameEdit}
              data-testid="edit-team-name-button"
            >
              Rename
            </Button>
          ) : undefined
        }
      />

      {/* Inline rename */}
      {editingName ? (
        <Card className="mb-6">
          <div className="space-y-3 px-5 py-4">
            {nameError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {nameError}
              </div>
            ) : null}
            <Field label="Team name" htmlFor="team-name-edit" required>
              <Input
                id="team-name-edit"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                autoFocus
                data-testid="team-name-edit-input"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setEditingName(false)}
                disabled={nameSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={saveName}
                loading={nameSaving}
                data-testid="save-team-name-button"
              >
                Save
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Members */}
        <Card>
          <CardHeader
            title="Members"
            subtitle={`${members.length} ${members.length === 1 ? "member" : "members"}`}
            action={
              canManageRoster ? (
                <Button
                  size="sm"
                  leftIcon={<UserPlus className="h-4 w-4" />}
                  onClick={() => {
                    setMemberError(null);
                    setAddMemberOpen(true);
                  }}
                  data-testid="add-member-button"
                >
                  Add member
                </Button>
              ) : undefined
            }
          />
          <div className="px-5 py-4">
            {memberError ? (
              <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {memberError}
              </div>
            ) : null}
            {roster === undefined ? (
              <LoadingState label="Loading members…" />
            ) : members.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">
                No members on this team yet.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {members.map((member) => {
                  const isForeman = foreman?._id === member._id;
                  const busy = memberBusy === (member._id as string);
                  return (
                    <li
                      key={member._id}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm text-gray-800">
                          {displayName(member)}
                        </span>
                        {isForeman ? (
                          <Badge tone="orange">Foreman</Badge>
                        ) : null}
                      </div>
                      {canManageRoster ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member._id)}
                          disabled={busy}
                          leftIcon={
                            busy ? (
                              <Spinner size={14} className="text-current" />
                            ) : (
                              <UserMinus className="h-4 w-4" />
                            )
                          }
                          data-testid={`remove-member-${member._id}`}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>

        {/* Foreman */}
        <Card>
          <CardHeader
            title="Foreman"
            subtitle="The crew lead for this team."
          />
          <div className="px-5 py-4">
            {foremanError ? (
              <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {foremanError}
              </div>
            ) : null}
            <div className="mb-4 flex items-center gap-2">
              <HardHat className="h-5 w-5 shrink-0 text-gray-400" />
              {foreman ? (
                <span className="text-sm font-medium text-gray-900">
                  {displayName(foreman)}
                </span>
              ) : (
                <span className="text-sm text-gray-400">
                  No foreman assigned
                </span>
              )}
              {foreman && canManageRoster ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={handleClearForeman}
                  disabled={foremanBusy === "__clear__"}
                  leftIcon={
                    foremanBusy === "__clear__" ? (
                      <Spinner size={14} className="text-current" />
                    ) : (
                      <X className="h-4 w-4" />
                    )
                  }
                  data-testid="clear-foreman-button"
                >
                  Clear
                </Button>
              ) : null}
            </div>

            {canManageRoster ? (
              members.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Add members before assigning a foreman.
                </p>
              ) : (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                    Assign from members
                  </p>
                  <ul className="divide-y divide-gray-100">
                    {members.map((member) => {
                      const isForeman = foreman?._id === member._id;
                      const busy = foremanBusy === (member._id as string);
                      return (
                        <li
                          key={member._id}
                          className="flex items-center justify-between gap-3 py-2"
                        >
                          <span className="min-w-0 truncate text-sm text-gray-800">
                            {displayName(member)}
                          </span>
                          <Button
                            variant={isForeman ? "secondary" : "primary"}
                            size="sm"
                            onClick={() => handleSetForeman(member._id)}
                            disabled={isForeman || busy}
                            leftIcon={
                              busy ? (
                                <Spinner size={14} className="text-current" />
                              ) : isForeman ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Star className="h-4 w-4" />
                              )
                            }
                            data-testid={`set-foreman-${member._id}`}
                          >
                            {isForeman ? "Current" : "Make foreman"}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )
            ) : null}
          </div>
        </Card>

        {/* Projects */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Projects"
            subtitle={`${assignedProjects.length} assigned`}
            action={
              canManageRoster ? (
                <Button
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => {
                    setProjectError(null);
                    setAddProjectOpen(true);
                  }}
                  data-testid="add-project-button"
                >
                  Assign project
                </Button>
              ) : undefined
            }
          />
          <div className="px-5 py-4">
            {projectError ? (
              <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {projectError}
              </div>
            ) : null}
            {assignedProjectIds === undefined ? (
              <LoadingState label="Loading projects…" />
            ) : assignedProjects.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">
                This team is not assigned to any projects yet.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {assignedProjects.map((project) => {
                  const busy = projectBusy === (project._id as string);
                  return (
                    <li
                      key={project._id}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <FolderKanban className="h-4 w-4 shrink-0 text-gray-400" />
                        <span className="truncate text-sm text-gray-800">
                          {project.name}
                        </span>
                      </div>
                      {canManageRoster ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveProject(project._id)}
                          disabled={busy}
                          leftIcon={
                            busy ? (
                              <Spinner size={14} className="text-current" />
                            ) : (
                              <X className="h-4 w-4" />
                            )
                          }
                          data-testid={`remove-project-${project._id}`}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* Add member modal */}
      <Modal
        open={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        title="Add members"
        footer={
          <Button variant="secondary" onClick={() => setAddMemberOpen(false)}>
            Done
          </Button>
        }
      >
        <div className="space-y-3">
          {memberError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {memberError}
            </div>
          ) : null}
          {orgUsers === undefined ? (
            <LoadingState label="Loading users…" />
          ) : candidateUsers.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              Everyone in your organization is already on this team.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {candidateUsers.map((user) => {
                const busy = memberBusy === (user._id as string);
                return (
                  <li
                    key={user._id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <span className="min-w-0 truncate text-sm text-gray-800">
                      {displayName(user)}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleAddMember(user._id)}
                      disabled={busy}
                      leftIcon={
                        busy ? (
                          <Spinner size={14} className="text-current" />
                        ) : (
                          <UserPlus className="h-4 w-4" />
                        )
                      }
                      data-testid={`add-member-option-${user._id}`}
                    >
                      Add
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Modal>

      {/* Assign project modal */}
      <Modal
        open={addProjectOpen}
        onClose={() => setAddProjectOpen(false)}
        title="Assign projects"
        footer={
          <Button variant="secondary" onClick={() => setAddProjectOpen(false)}>
            Done
          </Button>
        }
      >
        <div className="space-y-3">
          {projectError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {projectError}
            </div>
          ) : null}
          {orgProjects === undefined ? (
            <LoadingState label="Loading projects…" />
          ) : projectList.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              No projects available to assign.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {projectList.map((project) => {
                const assigned = assignedProjectIdSet.has(
                  project._id as string
                );
                const busy = projectBusy === (project._id as string);
                return (
                  <li
                    key={project._id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <span className="min-w-0 truncate text-sm text-gray-800">
                      {project.name}
                    </span>
                    <Button
                      variant={assigned ? "secondary" : "primary"}
                      size="sm"
                      onClick={() =>
                        assigned
                          ? handleRemoveProject(project._id)
                          : handleAddProject(project._id)
                      }
                      disabled={busy}
                      leftIcon={
                        busy ? (
                          <Spinner size={14} className="text-current" />
                        ) : assigned ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )
                      }
                      data-testid={`toggle-project-${project._id}`}
                    >
                      {assigned ? "Remove" : "Assign"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Modal>
    </PageContainer>
  );
}

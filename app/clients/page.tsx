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
  Spinner,
  Textarea,
} from "@/components/ui";
import {
  Building2,
  Link2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";

// Shape returned by api.clients.getWithProjects (client doc + linked projects)
type ClientWithProjects = Doc<"clients"> & {
  projects: Array<{ _id: Id<"projects">; name: string } | null>;
  projectCount: number;
};

type ProjectLite = { _id: Id<"projects">; name: string };

interface ClientFormState {
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}

const EMPTY_FORM: ClientFormState = {
  name: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
};

export default function ClientsPage() {
  const { organizationId, isAdmin, isLoading, hasOrg } = useOrg();

  const clients = useQuery(
    api.clients.getWithProjects,
    organizationId ? { organizationId } : "skip"
  ) as ClientWithProjects[] | undefined;

  const projects = useQuery(
    api.projects.getProjectsForCurrentUser,
    organizationId ? { organizationId } : "skip"
  ) as Doc<"projects">[] | undefined;

  const createClient = useMutation(api.clients.create);
  const updateClient = useMutation(api.clients.update);
  const removeClient = useMutation(api.clients.remove);
  const linkToProject = useMutation(api.clients.linkToProject);
  const unlinkFromProject = useMutation(api.clients.unlinkFromProject);

  // Create / edit modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClientWithProjects | null>(null);
  const [form, setForm] = useState<ClientFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation state
  const [deleting, setDeleting] = useState<ClientWithProjects | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Link-to-project modal state. We track the id only and re-read the live
  // client from the query so link/unlink changes reflect immediately.
  const [linkingClientId, setLinkingClientId] =
    useState<Id<"clients"> | null>(null);
  const [linkBusy, setLinkBusy] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const linkingClient = useMemo(() => {
    if (!linkingClientId || !clients) return null;
    return (
      clients.find(
        (c: ClientWithProjects) => c._id === linkingClientId
      ) ?? null
    );
  }, [linkingClientId, clients]);

  const projectList: ProjectLite[] = useMemo(() => {
    if (!projects) return [];
    return projects.map((p: Doc<"projects">) => ({
      _id: p._id,
      name: p.name,
    }));
  }, [projects]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(client: ClientWithProjects) {
    setEditing(client);
    setForm({
      name: client.name ?? "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      address: client.address ?? "",
      notes: client.notes ?? "",
    });
    setFormError(null);
    setFormOpen(true);
  }

  function updateField(key: keyof ClientFormState, value: string) {
    setForm((prev: ClientFormState) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!organizationId) return;
    const name = form.name.trim();
    if (!name) {
      setFormError("Name is required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      if (editing) {
        await updateClient({ clientId: editing._id, ...payload });
      } else {
        await createClient({ organizationId, ...payload });
      }
      setFormOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to save client."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await removeClient({ clientId: deleting._id });
      setDeleting(null);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete client."
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  // Project ids currently linked to the client being managed.
  const linkedProjectIds = useMemo(() => {
    if (!linkingClient) return new Set<string>();
    return new Set(
      linkingClient.projects
        .filter(
          (
            p: { _id: Id<"projects">; name: string } | null
          ): p is { _id: Id<"projects">; name: string } => p !== null
        )
        .map((p: { _id: Id<"projects">; name: string }) => p._id as string)
    );
  }, [linkingClient]);

  async function toggleLink(project: ProjectLite, currentlyLinked: boolean) {
    if (!linkingClient || !organizationId) return;
    setLinkBusy(project._id);
    setLinkError(null);
    try {
      if (currentlyLinked) {
        await unlinkFromProject({
          clientId: linkingClient._id,
          projectId: project._id,
        });
      } else {
        await linkToProject({
          clientId: linkingClient._id,
          projectId: project._id,
          organizationId,
        });
      }
    } catch (err) {
      setLinkError(
        err instanceof Error ? err.message : "Failed to update link."
      );
    } finally {
      setLinkBusy(null);
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
        title="Clients"
        subtitle="Manage your client relationships and link them to projects."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            New Client
          </Button>
        }
      />

      {clients === undefined ? (
        <LoadingState label="Loading clients…" />
      ) : clients.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No clients yet"
          description="Add your first client to start tracking contacts and linking them to projects."
          action={
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={openCreate}
            >
              New Client
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {clients.map((client: ClientWithProjects) => (
            <Card key={client._id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-gray-900">
                    {client.name}
                  </h3>
                  <div className="mt-1">
                    <Badge tone={client.projectCount > 0 ? "blue" : "gray"}>
                      {client.projectCount}{" "}
                      {client.projectCount === 1 ? "project" : "projects"}
                    </Badge>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(client)}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    aria-label={`Edit ${client.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleting(client);
                      }}
                      className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Delete ${client.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="flex-1 space-y-2 border-t border-gray-100 px-5 py-4 text-sm text-gray-600">
                {client.email ? (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                    <a
                      href={`mailto:${client.email}`}
                      className="truncate hover:text-gray-900"
                    >
                      {client.email}
                    </a>
                  </div>
                ) : null}
                {client.phone ? (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                    <a
                      href={`tel:${client.phone}`}
                      className="truncate hover:text-gray-900"
                    >
                      {client.phone}
                    </a>
                  </div>
                ) : null}
                {client.address ? (
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                    <span className="break-words">{client.address}</span>
                  </div>
                ) : null}
                {!client.email && !client.phone && !client.address ? (
                  <p className="text-gray-400">No contact details.</p>
                ) : null}
                {client.notes ? (
                  <p className="border-t border-gray-100 pt-2 text-gray-500">
                    {client.notes}
                  </p>
                ) : null}

                {client.projectCount > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {client.projects
                      .filter(
                        (
                          p: { _id: Id<"projects">; name: string } | null
                        ): p is { _id: Id<"projects">; name: string } =>
                          p !== null
                      )
                      .map((p: { _id: Id<"projects">; name: string }) => (
                        <Badge key={p._id} tone="gray">
                          {p.name}
                        </Badge>
                      ))}
                  </div>
                ) : null}
              </div>

              <div className="border-t border-gray-100 px-5 py-3">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Link2 className="h-4 w-4" />}
                  onClick={() => {
                    setLinkError(null);
                    setLinkingClientId(client._id);
                  }}
                >
                  Manage projects
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal
        open={formOpen}
        onClose={() => {
          if (!saving) setFormOpen(false);
        }}
        title={editing ? "Edit client" : "New client"}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editing ? "Save changes" : "Create client"}
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
          <Field label="Name" htmlFor="client-name" required>
            <Input
              id="client-name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Acme Construction"
              autoFocus
            />
          </Field>
          <Field label="Email" htmlFor="client-email">
            <Input
              id="client-email"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="contact@acme.com"
            />
          </Field>
          <Field label="Phone" htmlFor="client-phone">
            <Input
              id="client-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="(555) 123-4567"
            />
          </Field>
          <Field label="Address" htmlFor="client-address">
            <Input
              id="client-address"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder="123 Main St, Springfield"
            />
          </Field>
          <Field label="Notes" htmlFor="client-notes">
            <Textarea
              id="client-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Anything worth remembering about this client…"
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
        title="Delete client"
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
            ? This also removes all of its project links. This cannot be undone.
          </p>
        </div>
      </Modal>

      {/* Link-to-project modal */}
      <Modal
        open={linkingClientId !== null}
        onClose={() => setLinkingClientId(null)}
        title={
          linkingClient ? `Projects · ${linkingClient.name}` : "Projects"
        }
        footer={
          <Button variant="secondary" onClick={() => setLinkingClientId(null)}>
            Done
          </Button>
        }
      >
        <div className="space-y-3">
          {linkError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {linkError}
            </div>
          ) : null}
          {projects === undefined ? (
            <LoadingState label="Loading projects…" />
          ) : projectList.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              No projects available to link.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {projectList.map((project: ProjectLite) => {
                const linked = linkedProjectIds.has(project._id as string);
                const busy = linkBusy === project._id;
                return (
                  <li
                    key={project._id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <span className="min-w-0 truncate text-sm text-gray-800">
                      {project.name}
                    </span>
                    <Button
                      variant={linked ? "secondary" : "primary"}
                      size="sm"
                      onClick={() => toggleLink(project, linked)}
                      disabled={busy}
                      leftIcon={
                        busy ? (
                          <Spinner size={14} className="text-current" />
                        ) : linked ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <Link2 className="h-4 w-4" />
                        )
                      }
                    >
                      {linked ? "Unlink" : "Link"}
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

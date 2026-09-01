"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useOrg } from "@/lib/useOrg";
import { humanize } from "@/lib/format";
import {
  Card,
  CardHeader,
  PageContainer,
  PageHeader,
  LoadingState,
  EmptyState,
  Button,
  Field,
  Input,
  Select,
  Modal,
  Badge,
  StatusBadge,
  cx,
} from "@/components/ui";
import {
  Building2,
  Users as UsersIcon,
  Palette,
  Plus,
  Trash2,
  UserPlus,
  Lock,
} from "lucide-react";

const PRESET_COLORS = [
  "#22C55E",
  "#EF4444",
  "#3B82F6",
  "#F97316",
  "#8B5CF6",
  "#14B8A6",
  "#EC4899",
  "#FFC107",
  "#9CA3AF",
  "#92400E",
];
const DEFAULT_STATUS_VALUES = ["complete", "incomplete", "void"];

type Tab = "organization" | "users";
type OrgRole = "user" | "supervisor" | "admin";

/* ------------------------------------------------------------------ Org tab */

function OrganizationTab({
  organizationId,
  canEdit,
}: {
  organizationId: string;
  canEdit: boolean;
}) {
  const branding = useQuery(api.organizationSettings.getBranding, {
    organizationId,
  });
  const statuses = useQuery(api.organizationSettings.getStatusOptions, {
    organizationId,
  });
  const updateBranding = useMutation(api.organizationSettings.updateBranding);
  const addStatus = useMutation(api.organizationSettings.addCustomStatus);
  const removeStatus = useMutation(api.organizationSettings.removeCustomStatus);

  const [companyName, setCompanyName] = useState("");
  const [companyTagline, setCompanyTagline] = useState("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingError, setBrandingError] = useState<string | null>(null);
  const [brandingSaved, setBrandingSaved] = useState(false);

  useEffect(() => {
    if (branding) {
      setCompanyName(branding.companyName ?? "");
      setCompanyTagline(branding.companyTagline ?? "");
      setCompanyLogoUrl(branding.companyLogoUrl ?? "");
    }
  }, [branding]);

  const [addingStatus, setAddingStatus] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[2]);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  const handleSaveBranding = async () => {
    setSavingBranding(true);
    setBrandingError(null);
    setBrandingSaved(false);
    try {
      await updateBranding({
        organizationId,
        companyName: companyName.trim(),
        companyTagline: companyTagline.trim(),
        companyLogoUrl: companyLogoUrl.trim(),
      });
      setBrandingSaved(true);
    } catch (e) {
      setBrandingError(
        e instanceof Error ? e.message : "Failed to save branding"
      );
    } finally {
      setSavingBranding(false);
    }
  };

  const handleAddStatus = async () => {
    if (!newLabel.trim()) {
      setStatusError("Please enter a status name");
      return;
    }
    setSavingStatus(true);
    setStatusError(null);
    try {
      await addStatus({
        organizationId,
        label: newLabel.trim(),
        color: newColor,
      });
      setNewLabel("");
      setNewColor(PRESET_COLORS[2]);
      setAddingStatus(false);
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : "Failed to add status");
    } finally {
      setSavingStatus(false);
    }
  };

  const handleRemoveStatus = async (value: string) => {
    try {
      await removeStatus({ organizationId, value });
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : "Failed to remove status");
    }
  };

  return (
    <div className="space-y-6">
      {/* Branding */}
      <Card>
        <CardHeader
          title="Company branding"
          subtitle="Shown on client-facing invoices and the customer portal"
        />
        <div className="space-y-4 px-5 py-5">
          <Field label="Company name" htmlFor="companyName">
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Construction"
              disabled={!canEdit}
            />
          </Field>
          <Field label="Tagline" htmlFor="companyTagline">
            <Input
              id="companyTagline"
              value={companyTagline}
              onChange={(e) => setCompanyTagline(e.target.value)}
              placeholder="Building it right, the first time"
              disabled={!canEdit}
            />
          </Field>
          <Field
            label="Logo URL"
            htmlFor="companyLogoUrl"
            hint="A public URL to your company logo image"
          >
            <Input
              id="companyLogoUrl"
              value={companyLogoUrl}
              onChange={(e) => setCompanyLogoUrl(e.target.value)}
              placeholder="https://…"
              disabled={!canEdit}
            />
          </Field>
          {companyLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={companyLogoUrl}
              alt="Company logo preview"
              className="h-16 w-auto rounded border border-gray-200 object-contain"
            />
          ) : null}
          {brandingError ? (
            <p className="text-sm text-red-600">{brandingError}</p>
          ) : null}
          {brandingSaved ? (
            <p className="text-sm text-green-600">Branding saved.</p>
          ) : null}
          {canEdit ? (
            <div>
              <Button onClick={handleSaveBranding} loading={savingBranding}>
                Save branding
              </Button>
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              Only admins can edit branding.
            </p>
          )}
        </div>
      </Card>

      {/* Custom statuses */}
      <Card>
        <CardHeader
          title="Status options"
          subtitle="Statuses available for daily reports and task lists"
          action={
            canEdit && !addingStatus ? (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setAddingStatus(true)}
              >
                Add status
              </Button>
            ) : null
          }
        />
        <div className="px-5 py-4">
          {statuses === undefined ? (
            <LoadingState />
          ) : (
            <div className="divide-y divide-gray-100">
              {statuses.map((s: { value: string; label: string; color: string }) => {
                const isDefault = DEFAULT_STATUS_VALUES.includes(s.value);
                return (
                  <div
                    key={s.value}
                    className="flex items-center gap-3 py-3"
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="flex-1 font-medium text-gray-800">
                      {s.label}
                    </span>
                    {isDefault ? (
                      <Badge tone="gray">Default</Badge>
                    ) : canEdit ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveStatus(s.value)}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Remove ${s.label}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {addingStatus ? (
            <div className="mt-4 rounded-md border border-gray-200 p-4">
              <Field label="New status name">
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="In Progress"
                  autoFocus
                />
              </Field>
              <div className="mt-3">
                <p className="mb-2 text-sm font-medium text-gray-700">Color</p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={cx(
                        "h-8 w-8 rounded-full",
                        newColor === c
                          ? "ring-2 ring-gray-900 ring-offset-2"
                          : ""
                      )}
                      style={{ backgroundColor: c }}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                </div>
              </div>
              {statusError ? (
                <p className="mt-2 text-sm text-red-600">{statusError}</p>
              ) : null}
              <div className="mt-4 flex gap-2">
                <Button onClick={handleAddStatus} loading={savingStatus}>
                  Add status
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setAddingStatus(false);
                    setNewLabel("");
                    setStatusError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------- Users tab */

function UsersTab({ organizationId }: { organizationId: string }) {
  const users = useQuery(api.users.getUsersByOrg, { organizationId }) as
    | Doc<"users">[]
    | undefined;

  const setIsAdmin = useMutation(api.users.setIsAdmin);
  const setIsSupervisor = useMutation(api.users.setIsSupervisor);
  const setIsUser = useMutation(api.users.setIsUser);
  const removeUser = useMutation(api.users.removeUserFromOrganization);
  const createUser = useAction(api.clerkAdmin.createUserAndAddToOrg);

  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] =
    useState<"org:user" | "org:supervisor" | "org:admin">("org:user");
  const [inviteFirst, setInviteFirst] = useState("");
  const [inviteLast, setInviteLast] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const roleOf = (u: Doc<"users">): OrgRole | undefined =>
    u.organizationIds.find(
      (o: { organizationId: string; role: OrgRole }) =>
        o.organizationId === organizationId
    )?.role;

  const handleRoleChange = async (
    user: Doc<"users">,
    nextRole: OrgRole
  ) => {
    setBusyUserId(user._id);
    setActionError(null);
    try {
      if (nextRole === "admin")
        await setIsAdmin({ organizationId, userId: user._id });
      else if (nextRole === "supervisor")
        await setIsSupervisor({ organizationId, userId: user._id });
      else await setIsUser({ organizationId, userId: user._id });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to change role");
    } finally {
      setBusyUserId(null);
    }
  };

  const handleRemove = async (user: Doc<"users">) => {
    if (
      !window.confirm(
        `Remove ${user.name ?? "this user"} from the organization? This also clears their team and project assignments.`
      )
    )
      return;
    setBusyUserId(user._id);
    setActionError(null);
    try {
      await removeUser({ organizationId, userId: user._id });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to remove user");
    } finally {
      setBusyUserId(null);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      setInviteError("Email is required");
      return;
    }
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(null);
    try {
      const res = await createUser({
        email: inviteEmail.trim(),
        organizationId,
        role: inviteRole,
        firstName: inviteFirst.trim() || undefined,
        lastName: inviteLast.trim() || undefined,
      });
      setInviteSuccess(
        res?.message ?? `User ${inviteEmail.trim()} created and added.`
      );
      setInviteEmail("");
      setInviteFirst("");
      setInviteLast("");
      setInviteRole("org:user");
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setInviting(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Organization members"
        subtitle="Manage roles and membership"
        action={
          <Button
            size="sm"
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={() => {
              setInviteOpen(true);
              setInviteSuccess(null);
              setInviteError(null);
            }}
          >
            Add user
          </Button>
        }
      />

      {actionError ? (
        <p className="px-5 pt-3 text-sm text-red-600">{actionError}</p>
      ) : null}

      {users === undefined ? (
        <LoadingState />
      ) : users.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-gray-500">
          No members found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Current role</th>
                <th className="px-5 py-3">Set role</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const role = roleOf(u);
                const busy = busyUserId === u._id;
                return (
                  <tr key={u._id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {u.name ?? "Unnamed user"}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={role ? humanize(role) : undefined} />
                    </td>
                    <td className="px-5 py-3">
                      <Select
                        value={role ?? "user"}
                        disabled={busy}
                        onChange={(e) =>
                          handleRoleChange(u, e.target.value as OrgRole)
                        }
                        className="w-40"
                      >
                        <option value="user">User</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="admin">Admin</option>
                      </Select>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        size="sm"
                        variant="danger"
                        loading={busy}
                        leftIcon={<Trash2 className="h-4 w-4" />}
                        onClick={() => handleRemove(u)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-gray-100 px-5 py-3 text-xs text-gray-400">
        Password resets and Clerk account deletion are handled by email and are
        available through the mobile app — the Convex user record here does not
        store email addresses.
      </div>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Add a user"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>
              Close
            </Button>
            <Button onClick={handleInvite} loading={inviting}>
              Create user
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Email" required>
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="person@company.com"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name">
              <Input
                value={inviteFirst}
                onChange={(e) => setInviteFirst(e.target.value)}
              />
            </Field>
            <Field label="Last name">
              <Input
                value={inviteLast}
                onChange={(e) => setInviteLast(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Role">
            <Select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(
                  e.target.value as
                    | "org:user"
                    | "org:supervisor"
                    | "org:admin"
                )
              }
            >
              <option value="org:user">User</option>
              <option value="org:supervisor">Supervisor</option>
              <option value="org:admin">Admin</option>
            </Select>
          </Field>
          {inviteError ? (
            <p className="text-sm text-red-600">{inviteError}</p>
          ) : null}
          {inviteSuccess ? (
            <p className="text-sm text-green-600">{inviteSuccess}</p>
          ) : null}
          <p className="text-xs text-gray-500">
            The user can sign in with Google OAuth or request a password reset.
          </p>
        </div>
      </Modal>
    </Card>
  );
}

/* ------------------------------------------------------------------- Page */

export default function SettingsPage() {
  const { organizationId, isAdmin, isLoading, hasOrg } = useOrg();
  const [tab, setTab] = useState<Tab>("organization");

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingState />
      </PageContainer>
    );
  }

  if (!hasOrg || !organizationId) {
    return (
      <PageContainer>
        <PageHeader title="Settings" backHref="/" />
        <EmptyState
          icon={<Building2 className="h-10 w-10" />}
          title="No organization"
          description="You don't appear to belong to an organization yet."
        />
      </PageContainer>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] =
    [
      { key: "organization", label: "Organization", icon: <Palette className="h-4 w-4" /> },
      {
        key: "users",
        label: "Users",
        icon: <UsersIcon className="h-4 w-4" />,
        adminOnly: true,
      },
    ];

  return (
    <PageContainer>
      <PageHeader
        title="Settings"
        subtitle="Organization, branding, and users"
        backHref="/"
      />

      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {tabs.map((t) => {
          if (t.adminOnly && !isAdmin) return null;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cx(
                "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "organization" ? (
        <OrganizationTab organizationId={organizationId} canEdit={isAdmin} />
      ) : isAdmin ? (
        <UsersTab organizationId={organizationId} />
      ) : (
        <EmptyState
          icon={<Lock className="h-10 w-10" />}
          title="Admins only"
          description="User management is restricted to organization admins."
        />
      )}
    </PageContainer>
  );
}

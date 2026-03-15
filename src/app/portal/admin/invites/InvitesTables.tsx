"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  Briefcase,
  MoreHorizontal,
  Pencil,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";

import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserRole } from "@prisma/client";
import {
  deleteAdminInviteAction,
  deleteAdminUserAction,
  deleteDesignerUserAction,
  updateDesignerProfileAction,
} from "../actions";
import { formatPortalDate } from "@/lib/dateFormat";
import { formatDesignerTypes, normalizeDesignerTypes } from "@/lib/portalOptions";
import { cn } from "@/lib/utils";

export type TeamMemberRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  designerTypes: string[];
  createdAt: string;
};

export type InviteRow = {
  id: string;
  email: string;
  role: UserRole;
  designerTypes: string[];
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  invitedByName: string;
  acceptedUserName: string | null;
};

function formatDate(value: string | null) {
  return formatPortalDate(value, {
    fallback: "—",
    day: "2-digit",
  });
}

function getRoleLabel(role: UserRole) {
  if (role === "ADMIN") return "Admin";
  if (role === "DESIGNER") return "Designer";
  return "Client";
}

function getInviteStatus(invite: InviteRow) {
  if (invite.acceptedAt) {
    return { label: "Accepted", variant: "default" as const };
  }
  const isExpired = new Date(invite.expiresAt) < new Date();
  if (isExpired) {
    return { label: "Expired", variant: "secondary" as const };
  }
  return { label: "Pending", variant: "outline" as const };
}

function DesignerTypeBadges({
  designerTypes,
  serviceTypeOptions,
}: {
  designerTypes: string[];
  serviceTypeOptions: string[];
}) {
  const normalizedDesignerTypes = normalizeDesignerTypes(designerTypes, serviceTypeOptions);

  if (normalizedDesignerTypes.length === 0) {
    return <span className="text-muted-foreground">Not assigned</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {normalizedDesignerTypes.map((designerType) => (
        <Badge key={designerType} variant="outline" className="rounded-full">
          {designerType}
        </Badge>
      ))}
    </div>
  );
}

function TeamRowActions({
  member,
  onDelete,
  onError,
  onSuccess,
  onEditDesignerTypes,
}: {
  member: TeamMemberRow;
  onDelete: (userId: string) => Promise<{ error?: string; message?: string }>;
  onError: (message: string) => void;
  onSuccess: () => void;
  onEditDesignerTypes?: (member: TeamMemberRow) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmError, setConfirmError] = React.useState<string | null>(null);
  const roleLabel = getRoleLabel(member.role);
  const keepsAdminHistory = member.role === "ADMIN";
  const keepsDesignerHistory = member.role === "DESIGNER";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            disabled={pending}
            aria-label="Open actions"
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {member.role === "DESIGNER" && onEditDesignerTypes ? (
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                onEditDesignerTypes(member);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit designer
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={(event) => {
              event.preventDefault();
              onSuccess();
              setConfirmError(null);
              setConfirmOpen(true);
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete user
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(next) => {
          setConfirmOpen(next);
          if (!next) {
            setConfirmError(null);
          }
        }}
        title={`Delete ${roleLabel.toLowerCase()} user?`}
        description={
          <>
            You are about to permanently delete{" "}
            <span className="font-semibold text-foreground">{member.name}</span> ({member.email})
            {keepsAdminHistory
              ? ". Linked admin project assignments and timeline history will be preserved."
              : keepsDesignerHistory
                ? ". Linked designer assignments will be removed and uploaded history will be preserved."
              : "."}
          </>
        }
        icon={<Trash2 className="h-7 w-7" />}
        confirmLabel="Delete user"
        confirmPendingLabel="Deleting…"
        confirmVariant="destructive"
        pending={pending}
        error={confirmError}
        onConfirm={() => {
          setConfirmError(null);
          startTransition(async () => {
            const result = await onDelete(member.id);
            if (result.error) {
              setConfirmError(result.error);
              onError(result.error);
              return;
            }
            onSuccess();
            setConfirmOpen(false);
            router.refresh();
          });
        }}
      >
        <ul className="list-disc pl-6 space-y-2 text-base text-muted-foreground">
          <li>This action cannot be undone.</li>
          {keepsAdminHistory ? (
            <li>
              Related projects will be kept and the deleted admin will simply be removed from
              project, dispute, and timeline ownership fields.
            </li>
          ) : keepsDesignerHistory ? (
            <li>
              Related projects will be kept, the designer will be unassigned, and authored
              draft or dispute records will be preserved under the current admin.
            </li>
          ) : (
            <li>User deletion can fail if linked records exist.</li>
          )}
        </ul>
      </ConfirmDialog>
    </>
  );
}

function InviteRowActions({
  invite,
  onError,
  onSuccess,
}: {
  invite: InviteRow;
  onError: (message: string) => void;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmError, setConfirmError] = React.useState<string | null>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            disabled={pending}
            aria-label="Open actions"
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={(event) => {
              event.preventDefault();
              onSuccess();
              setConfirmError(null);
              setConfirmOpen(true);
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete invite
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(next) => {
          setConfirmOpen(next);
          if (!next) {
            setConfirmError(null);
          }
        }}
        title="Delete invitation?"
        description={
          <>
            This will permanently delete the invitation for{" "}
            <span className="font-semibold text-foreground">{invite.email}</span>.
          </>
        }
        icon={<Trash2 className="h-7 w-7" />}
        confirmLabel="Delete invite"
        confirmPendingLabel="Deleting…"
        confirmVariant="destructive"
        pending={pending}
        error={confirmError}
        onConfirm={() => {
          setConfirmError(null);
          startTransition(async () => {
            const result = await deleteAdminInviteAction(invite.id);
            if (result.error) {
              setConfirmError(result.error);
              onError(result.error);
              return;
            }
            onSuccess();
            setConfirmOpen(false);
            router.refresh();
          });
        }}
      >
        <ul className="list-disc pl-6 space-y-2 text-base text-muted-foreground">
          <li>This action cannot be undone.</li>
          <li>You can re-send an invitation anytime.</li>
        </ul>
      </ConfirmDialog>
    </>
  );
}

function useTeamColumns(
  onDelete: (userId: string) => Promise<{ error?: string; message?: string }>,
  onError: (message: string) => void,
  onSuccess: () => void,
  options?: {
    showDesignerType?: boolean;
    onEditDesignerTypes?: (member: TeamMemberRow) => void;
    serviceTypeOptions?: string[];
  }
) {
  const showDesignerType = options?.showDesignerType ?? false;
  const onEditDesignerTypes = options?.onEditDesignerTypes;
  const serviceTypeOptions = options?.serviceTypeOptions;

  return React.useMemo<ColumnDef<TeamMemberRow>[]>(() => {
    const columns: ColumnDef<TeamMemberRow>[] = [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground text-base font-semibold">
              {row.original.name?.slice(0, 2).toUpperCase() || "US"}
            </div>
            <div>
              <div className="font-semibold">{row.original.name}</div>
              <Badge variant="secondary" className="mt-1">
                {getRoleLabel(row.original.role)}
              </Badge>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Email" />
        ),
        cell: ({ row }) => (
          <div className="text-muted-foreground">{row.original.email}</div>
        ),
      },
    ];

    if (showDesignerType) {
      columns.push({
        id: "designerTypes",
        accessorFn: (row) => formatDesignerTypes(row.designerTypes, serviceTypeOptions),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Type of Designer" />
        ),
        cell: ({ row }) => (
            <DesignerTypeBadges
              designerTypes={row.original.designerTypes}
              serviceTypeOptions={serviceTypeOptions ?? []}
            />
          ),
      });
    }

    columns.push(
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Added" />
        ),
        cell: ({ row }) => (
          <div className="text-muted-foreground">{formatDate(row.original.createdAt)}</div>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <TeamRowActions
              member={row.original}
              onDelete={onDelete}
              onError={onError}
              onSuccess={onSuccess}
              onEditDesignerTypes={onEditDesignerTypes}
            />
          </div>
        ),
      },
    );

    return columns;
  }, [
    onDelete,
    onError,
    onSuccess,
    onEditDesignerTypes,
    serviceTypeOptions,
    showDesignerType,
  ]);
}

function EditDesignerTypesDialog({
  member,
  open,
  onOpenChange,
  onError,
  onSuccess,
  serviceTypeOptions,
}: {
  member: TeamMemberRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onError: (message: string | null) => void;
  onSuccess: () => void;
  serviceTypeOptions: string[];
}) {
  const router = useRouter();
  const [designerName, setDesignerName] = React.useState("");
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>([]);
  const [pending, startTransition] = React.useTransition();
  const [localError, setLocalError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (member && open) {
      setDesignerName(member.name);
      setSelectedTypes(normalizeDesignerTypes(member.designerTypes, serviceTypeOptions));
      setLocalError(null);
    }
  }, [member, open, serviceTypeOptions]);

  const toggleDesignerType = (designerType: string) => {
    setSelectedTypes((current) =>
      current.includes(designerType)
        ? current.filter((value) => value !== designerType)
        : [...current, designerType]
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setLocalError(null);
          onError(null);
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader className="space-y-3">
          <DialogTitle>Edit designer</DialogTitle>
          <DialogDescription>
            {member ? (
              <>
                Update the designer profile and service mappings for{" "}
                <span className="font-semibold text-foreground">{member.name}</span>.
                Designer types are sourced from the current service type list.
              </>
            ) : (
              "Update the designer profile."
            )}
          </DialogDescription>
        </DialogHeader>

        {member ? (
          <div className="space-y-5">
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="text-sm font-medium text-muted-foreground">Designer</div>
              <div className="mt-1 text-base font-semibold text-foreground">
                {member.name}
              </div>
              <div className="text-sm text-muted-foreground">{member.email}</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="designer-name" className="text-base">
                Designer name
              </Label>
              <Input
                id="designer-name"
                value={designerName}
                onChange={(event) => setDesignerName(event.target.value)}
                placeholder="Enter designer name"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-base">Type of Designer</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {serviceTypeOptions.map((designerType) => {
                  const selected = selectedTypes.includes(designerType);
                  return (
                    <label
                      key={designerType}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 transition-colors",
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleDesignerType(designerType)}
                        className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      />
                      <div>
                        <div className="text-base font-semibold">{designerType}</div>
                        <div className="text-sm text-muted-foreground">
                          Map this designer to the {designerType} enquiry workflow.
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              <p className="text-sm text-muted-foreground">
                Selected service mappings: {formatDesignerTypes(selectedTypes, serviceTypeOptions)}
              </p>
            </div>

            {localError ? (
              <Alert variant="destructive">
                <AlertDescription>{localError}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => {
              setLocalError(null);
              onError(null);
              onOpenChange(false);
            }}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="lg"
            disabled={!member || pending}
            onClick={() => {
              if (!member) {
                return;
              }

              setLocalError(null);
              startTransition(async () => {
                const result = await updateDesignerProfileAction({
                  userId: member.id,
                  name: designerName,
                  designerTypes: selectedTypes,
                });

                if (result.error) {
                  setLocalError(result.error);
                  onError(result.error);
                  return;
                }

                onSuccess();
                setLocalError(null);
                onOpenChange(false);
                router.refresh();
              });
            }}
          >
            {pending ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function InvitesTables({
  admins,
  designers,
  invites,
  serviceTypeOptions,
}: {
  admins: TeamMemberRow[];
  designers: TeamMemberRow[];
  invites: InviteRow[];
  serviceTypeOptions: string[];
}) {
  const [adminError, setAdminError] = React.useState<string | null>(null);
  const [designerError, setDesignerError] = React.useState<string | null>(null);
  const [inviteError, setInviteError] = React.useState<string | null>(null);
  const [editingDesigner, setEditingDesigner] = React.useState<TeamMemberRow | null>(null);

  const adminColumns = useTeamColumns(
    deleteAdminUserAction,
    (message) => setAdminError(message),
    () => setAdminError(null)
  );
  const designerColumns = useTeamColumns(
    deleteDesignerUserAction,
    (message) => setDesignerError(message),
    () => setDesignerError(null),
    {
      showDesignerType: true,
      serviceTypeOptions,
      onEditDesignerTypes: (member) => {
        setDesignerError(null);
        setEditingDesigner(member);
      },
    }
  );

  const inviteColumns = React.useMemo<ColumnDef<InviteRow>[]>(() => {
    return [
      {
        accessorKey: "email",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Email" />
        ),
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="font-semibold">{row.original.email}</div>
            <div className="text-base text-muted-foreground">
              Invited by {row.original.invitedByName}
            </div>
            {row.original.acceptedUserName && (
              <div className="text-base text-muted-foreground">
                Accepted by {row.original.acceptedUserName}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "role",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Role" />
        ),
        cell: ({ row }) => {
          const isDesigner = row.original.role === "DESIGNER";
          return (
            <div className="space-y-1">
              <Badge variant="secondary">{getRoleLabel(row.original.role)}</Badge>
              {isDesigner && row.original.designerTypes.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {formatDesignerTypes(row.original.designerTypes, serviceTypeOptions)}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = getInviteStatus(row.original);
          return (
            <Badge variant={status.variant} className="rounded-full">
              {status.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Sent" />
        ),
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="text-muted-foreground">{formatDate(row.original.createdAt)}</div>
            <div className="text-base text-muted-foreground">
              Expires {formatDate(row.original.expiresAt)}
            </div>
          </div>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <InviteRowActions
              invite={row.original}
              onError={(message) => setInviteError(message)}
              onSuccess={() => setInviteError(null)}
            />
          </div>
        ),
      },
    ];
  }, [serviceTypeOptions]);

  return (
    <div className="space-y-10">
      <EditDesignerTypesDialog
        member={editingDesigner}
        open={!!editingDesigner}
        onOpenChange={(open) => {
          if (!open) {
            setEditingDesigner(null);
          }
        }}
        onError={setDesignerError}
        onSuccess={() => setDesignerError(null)}
        serviceTypeOptions={serviceTypeOptions}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="text-2xl">Active Admins</CardTitle>
              <CardDescription>
                {admins.length} administrator{admins.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {adminError && (
            <Alert variant="destructive">
              <AlertDescription>{adminError}</AlertDescription>
            </Alert>
          )}
          <DataTable
            columns={adminColumns}
            data={admins}
            filterColumnId="email"
            filterPlaceholder="Search admins by email…"
            emptyMessage="No admins found."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
              <Briefcase className="h-5 w-5 text-sky-700 dark:text-sky-300" />
            </div>
            <div>
              <CardTitle className="text-2xl">Active Designers</CardTitle>
              <CardDescription>
                {designers.length} designer{designers.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {designerError && (
            <Alert variant="destructive">
              <AlertDescription>{designerError}</AlertDescription>
            </Alert>
          )}
          <DataTable
            columns={designerColumns}
            data={designers}
            filterColumnId="email"
            filterPlaceholder="Search designers by email…"
            emptyMessage="No designers found."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <ShieldCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-2xl">Invitation Tracking</CardTitle>
              <CardDescription>
                {invites.length} invitation{invites.length !== 1 ? "s" : ""} sent
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {inviteError && (
            <Alert variant="destructive">
              <AlertDescription>{inviteError}</AlertDescription>
            </Alert>
          )}
          <DataTable
            columns={inviteColumns}
            data={invites}
            filterColumnId="email"
            filterPlaceholder="Search invitations by email…"
            emptyMessage="No invitations found."
          />
        </CardContent>
      </Card>
    </div>
  );
}

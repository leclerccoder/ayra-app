"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  Briefcase,
  MoreHorizontal,
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
} from "../actions";

export type TeamMemberRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
};

export type InviteRow = {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  invitedByName: string;
  acceptedUserName: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return date.toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

function TeamRowActions({
  member,
  onDelete,
  onError,
  onSuccess,
}: {
  member: TeamMemberRow;
  onDelete: (userId: string) => Promise<{ error?: string; message?: string }>;
  onError: (message: string) => void;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmError, setConfirmError] = React.useState<string | null>(null);
  const roleLabel = getRoleLabel(member.role);

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
            <span className="font-semibold text-foreground">{member.name}</span>{" "}
            ({member.email}).
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
          <li>User deletion can fail if linked records exist.</li>
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
  onSuccess: () => void
) {
  return React.useMemo<ColumnDef<TeamMemberRow>[]>(() => {
    return [
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
            />
          </div>
        ),
      },
    ];
  }, [onDelete, onError, onSuccess]);
}

export default function InvitesTables({
  admins,
  designers,
  invites,
}: {
  admins: TeamMemberRow[];
  designers: TeamMemberRow[];
  invites: InviteRow[];
}) {
  const [adminError, setAdminError] = React.useState<string | null>(null);
  const [designerError, setDesignerError] = React.useState<string | null>(null);
  const [inviteError, setInviteError] = React.useState<string | null>(null);

  const adminColumns = useTeamColumns(
    deleteAdminUserAction,
    (message) => setAdminError(message),
    () => setAdminError(null)
  );
  const designerColumns = useTeamColumns(
    deleteDesignerUserAction,
    (message) => setDesignerError(message),
    () => setDesignerError(null)
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
        cell: ({ row }) => (
          <Badge variant="secondary">{getRoleLabel(row.original.role)}</Badge>
        ),
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
  }, []);

  return (
    <div className="space-y-10">
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

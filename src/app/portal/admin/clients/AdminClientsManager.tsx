"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  BadgeCheck,
  Check,
  CheckCircle2,
  Circle,
  Download,
  Edit3,
  Eye,
  EyeOff,
  Loader2,
  MoreHorizontal,
  Trash2,
  UserPlus2,
  Users,
} from "lucide-react";

import {
  createClientAccountAction,
  deleteClientAccountAction,
  deleteManyClientAccountsAction,
  updateClientAccountAction,
} from "../actions";
import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  getFirstPasswordPolicyError,
  getPasswordRuleStates,
  getPasswordStrength,
} from "@/lib/passwordPolicy";

type FormState = {
  error?: string;
  message?: string;
};

const initialFormState: FormState = {};
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ClientRow = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  enquiriesCount: number;
  projectsCount: number;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function csvEscape(value: string | number | boolean) {
  const normalized = String(value);
  if (/["\n,]/.test(normalized)) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }
  return normalized;
}

function downloadClientsCsv(rows: ClientRow[], fileName: string) {
  const headers = ["Name", "Email", "Verified", "Joined", "Enquiries", "Projects"];
  const lines = rows.map((row) =>
    [
      csvEscape(row.name),
      csvEscape(row.email),
      csvEscape(row.emailVerified ? "Yes" : "No"),
      csvEscape(formatDate(row.createdAt)),
      csvEscape(row.enquiriesCount),
      csvEscape(row.projectsCount),
    ].join(",")
  );
  const csvContent = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}

function AddClientSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" disabled={disabled || pending} className="sm:min-w-[220px]">
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Creating...
        </>
      ) : (
        <>
          <UserPlus2 className="h-4 w-4" />
          Add client
        </>
      )}
    </Button>
  );
}

function AddClientForm({ onCreated }: { onCreated: (message?: string) => void }) {
  const [state, formAction] = React.useActionState(createClientAccountAction, initialFormState);

  React.useEffect(() => {
    if (state.message) {
      onCreated(state.message);
    }
  }, [state.message, onCreated]);

  return (
    <AddClientFormInner
      key={state.message ?? "create-client-form"}
      state={state}
      formAction={formAction}
    />
  );
}

function AddClientFormInner({
  state,
  formAction,
}: {
  state: FormState;
  formAction: (formData: FormData) => void;
}) {
  const [values, setValues] = React.useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [touched, setTouched] = React.useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [submitted, setSubmitted] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const errors = React.useMemo(() => {
    const next: Partial<typeof values> = {};

    if (!values.name.trim()) {
      next.name = "Client name is required.";
    } else if (values.name.trim().length < 2) {
      next.name = "Client name must be at least 2 characters.";
    }

    if (!values.email.trim()) {
      next.email = "Email is required.";
    } else if (!emailPattern.test(values.email.trim())) {
      next.email = "Enter a valid email address.";
    }

    if (!values.password) {
      next.password = "Password is required.";
    } else {
      const passwordError = getFirstPasswordPolicyError(values.password);
      if (passwordError) {
        next.password = passwordError;
      }
    }

    if (!values.confirmPassword) {
      next.confirmPassword = "Please confirm password.";
    } else if (values.confirmPassword !== values.password) {
      next.confirmPassword = "Passwords do not match.";
    }

    return next;
  }, [values]);

  const showError = (field: keyof typeof values) =>
    (touched[field] || submitted) && errors[field];
  const hasErrors = Object.keys(errors).length > 0;

  const passwordRules = React.useMemo(
    () => getPasswordRuleStates(values.password),
    [values.password]
  );
  const passwordStrength = React.useMemo(
    () => getPasswordStrength(values.password),
    [values.password]
  );
  const strengthPercent =
    (passwordStrength.score / passwordStrength.maxScore) * 100;
  const strengthColors: Record<
    ReturnType<typeof getPasswordStrength>["level"],
    { text: string; bar: string }
  > = {
    weak: { text: "text-red-600", bar: "bg-red-500" },
    medium: { text: "text-amber-600", bar: "bg-amber-500" },
    good: { text: "text-sky-600", bar: "bg-sky-500" },
    strong: { text: "text-emerald-600", bar: "bg-emerald-500" },
  };

  return (
    <form
      action={formAction}
      className="space-y-5"
      onSubmit={(event) => {
        setSubmitted(true);
        if (hasErrors) {
          event.preventDefault();
        }
      }}
    >
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.message && (
        <Alert>
          <AlertDescription className="text-lg font-semibold">
            {state.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="create-client-name" className="text-base">
            Full name
          </Label>
          <Input
            id="create-client-name"
            name="name"
            value={values.name}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, name: event.target.value }))
            }
            onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
            className={cn(
              "h-12 text-base",
              showError("name") && "border-destructive focus-visible:ring-destructive"
            )}
            aria-invalid={Boolean(showError("name"))}
            required
          />
          {showError("name") && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-client-email" className="text-base">
            Email
          </Label>
          <Input
            id="create-client-email"
            name="email"
            type="email"
            value={values.email}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, email: event.target.value }))
            }
            onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
            className={cn(
              "h-12 text-base",
              showError("email") && "border-destructive focus-visible:ring-destructive"
            )}
            aria-invalid={Boolean(showError("email"))}
            required
          />
          {showError("email") && (
            <p className="text-sm text-destructive">{errors.email}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="create-client-password" className="text-base">
            Password
          </Label>
          <div className="relative">
            <Input
              id="create-client-password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={values.password}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, password: event.target.value }))
              }
              onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
              className={cn(
                "h-12 pr-12 text-base",
                showError("password") &&
                  "border-destructive focus-visible:ring-destructive"
              )}
              aria-invalid={Boolean(showError("password"))}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {showError("password") && (
            <p className="text-sm text-destructive">{errors.password}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-client-confirm" className="text-base">
            Confirm password
          </Label>
          <div className="relative">
            <Input
              id="create-client-confirm"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={values.confirmPassword}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, confirmPassword: event.target.value }))
              }
              onBlur={() =>
                setTouched((prev) => ({ ...prev, confirmPassword: true }))
              }
              className={cn(
                "h-12 pr-12 text-base",
                showError("confirmPassword") &&
                  "border-destructive focus-visible:ring-destructive"
              )}
              aria-invalid={Boolean(showError("confirmPassword"))}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={
                showConfirmPassword ? "Hide confirm password" : "Show confirm password"
              }
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {showError("confirmPassword") && (
            <p className="text-sm text-destructive">{errors.confirmPassword}</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border/80 bg-muted/40 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Password strength
          </span>
          <span className={cn("text-sm font-semibold", strengthColors[passwordStrength.level].text)}>
            {passwordStrength.label}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full transition-all duration-300",
              strengthColors[passwordStrength.level].bar
            )}
            style={{ width: `${strengthPercent}%` }}
          />
        </div>
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {passwordRules.map((rule) => (
            <li
              key={rule.id}
              className={cn(
                "flex items-center gap-2 text-sm",
                rule.met ? "text-emerald-700" : "text-muted-foreground"
              )}
            >
              {rule.met ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Circle className="h-3.5 w-3.5" />
              )}
              <span>{rule.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <AddClientSubmitButton disabled={hasErrors} />
    </form>
  );
}

function ClientRowActions({
  client,
  onEdit,
  onDelete,
}: {
  client: ClientRow;
  onEdit: (client: ClientRow) => void;
  onDelete: (client: ClientRow) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Open actions">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            onEdit(client);
          }}
        >
          <Edit3 className="mr-2 h-4 w-4" />
          Edit client
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={(event) => {
            event.preventDefault();
            onDelete(client);
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete client
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AdminClientsManager({ clients }: { clients: ClientRow[] }) {
  const router = useRouter();
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

  const [editingClient, setEditingClient] = React.useState<ClientRow | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editEmail, setEditEmail] = React.useState("");
  const [editError, setEditError] = React.useState<string | null>(null);
  const [editPending, startEditTransition] = React.useTransition();

  const [deletingClient, setDeletingClient] = React.useState<ClientRow | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [deletePending, startDeleteTransition] = React.useTransition();
  const [selectedClientIds, setSelectedClientIds] = React.useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const [bulkDeleteError, setBulkDeleteError] = React.useState<string | null>(null);
  const [bulkDeletePending, startBulkDeleteTransition] = React.useTransition();

  const selectedIdSet = React.useMemo(() => new Set(selectedClientIds), [selectedClientIds]);
  const selectedClients = React.useMemo(
    () => clients.filter((client) => selectedIdSet.has(client.id)),
    [clients, selectedIdSet]
  );

  React.useEffect(() => {
    const validIds = new Set(clients.map((client) => client.id));
    setSelectedClientIds((current) => {
      const next = current.filter((clientId) => validIds.has(clientId));
      return next.length === current.length ? current : next;
    });
  }, [clients]);

  const handleCreateSuccess = React.useCallback(
    (message?: string) => {
      if (message) {
        setActionError(null);
        setActionMessage(message);
      }
      router.refresh();
    },
    [router]
  );

  const openEdit = (client: ClientRow) => {
    setEditingClient(client);
    setEditName(client.name);
    setEditEmail(client.email);
    setEditError(null);
    setActionMessage(null);
    setActionError(null);
  };

  const openDelete = (client: ClientRow) => {
    setDeletingClient(client);
    setDeleteError(null);
    setActionMessage(null);
    setActionError(null);
  };

  const editValidationError = React.useMemo(() => {
    if (!editName.trim()) return "Client name is required.";
    if (editName.trim().length < 2) return "Client name must be at least 2 characters.";
    if (!editEmail.trim()) return "Email is required.";
    if (!emailPattern.test(editEmail.trim())) return "Enter a valid email address.";
    return "";
  }, [editEmail, editName]);

  const columns = React.useMemo<ColumnDef<ClientRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => {
          const allSelected = table.getIsAllPageRowsSelected();
          const someSelected = table.getIsSomePageRowsSelected();

          return (
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-muted"
              aria-label={allSelected ? "Deselect all rows" : "Select all rows"}
              onClick={() => table.toggleAllPageRowsSelected(!allSelected)}
            >
              {allSelected ? (
                <Check className="h-4 w-4" />
              ) : someSelected ? (
                <span className="h-2.5 w-2.5 rounded-sm bg-foreground/70" />
              ) : null}
            </button>
          );
        },
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <button
            type="button"
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md border transition-colors",
              row.getIsSelected()
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-muted"
            )}
            aria-label={row.getIsSelected() ? "Deselect row" : "Select row"}
            onClick={(event) => {
              event.stopPropagation();
              row.toggleSelected(!row.getIsSelected());
            }}
          >
            {row.getIsSelected() ? <Check className="h-4 w-4" /> : null}
          </button>
        ),
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Client" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {row.original.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{row.original.name}</p>
              <p className="text-sm text-muted-foreground">{row.original.email}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "emailVerified",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Verification" />
        ),
        cell: ({ row }) =>
          row.original.emailVerified ? (
            <Badge className="gap-1">
              <BadgeCheck className="h-3.5 w-3.5" />
              Verified
            </Badge>
          ) : (
            <Badge variant="secondary">Unverified</Badge>
          ),
      },
      {
        id: "activity",
        header: "Activity",
        cell: ({ row }) => (
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>{row.original.enquiriesCount} enquiries</p>
            <p>{row.original.projectsCount} projects</p>
          </div>
        ),
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Joined" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatDate(row.original.createdAt)}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <ClientRowActions client={row.original} onEdit={openEdit} onDelete={openDelete} />
          </div>
        ),
      },
    ],
    []
  );

  const exportAllClients = () => {
    if (!clients.length) {
      return;
    }
    downloadClientsCsv(clients, "clients-all.csv");
    setActionMessage(
      `Exported ${clients.length} client account${clients.length === 1 ? "" : "s"} to CSV.`
    );
    setActionError(null);
  };

  const exportSelectedClients = () => {
    if (!selectedClients.length) {
      return;
    }
    downloadClientsCsv(selectedClients, "clients-selected.csv");
    setActionMessage(
      `Exported ${selectedClients.length} selected client account${selectedClients.length === 1 ? "" : "s"} to CSV.`
    );
    setActionError(null);
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <UserPlus2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Add New Client</CardTitle>
              <CardDescription className="text-base">
                Create a new client account directly from the admin panel.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AddClientForm onCreated={handleCreateSuccess} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-2xl">Manage Clients</CardTitle>
              <CardDescription className="text-base">
                {clients.length} client account{clients.length === 1 ? "" : "s"} in the
                platform.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {actionError && (
            <Alert variant="destructive">
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          )}
          {actionMessage && (
            <Alert>
              <AlertDescription className="text-base font-medium">
                {actionMessage}
              </AlertDescription>
            </Alert>
          )}
          <DataTable
            columns={columns}
            data={clients}
            filterColumnId="name"
            filterPlaceholder="Search clients by name..."
            emptyMessage="No clients found."
            enableRowSelection
            getRowId={(row) => row.id}
            onRowSelectionChange={setSelectedClientIds}
            toolbarActions={
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Badge
                  variant={selectedClients.length ? "default" : "secondary"}
                  className="h-10 px-3 text-sm"
                >
                  {selectedClients.length} selected
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  onClick={exportAllClients}
                  disabled={!clients.length}
                >
                  <Download className="h-4 w-4" />
                  Export all
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  onClick={exportSelectedClients}
                  disabled={!selectedClients.length}
                >
                  <Download className="h-4 w-4" />
                  Export selected
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-10"
                  disabled={!selectedClients.length}
                  onClick={() => {
                    setBulkDeleteError(null);
                    setBulkDeleteOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete selected
                </Button>
              </div>
            }
          />
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(editingClient)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingClient(null);
            setEditError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit client</DialogTitle>
            <DialogDescription>
              Update the client details below and save the changes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-client-name">Name</Label>
              <Input
                id="edit-client-name"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                className={cn(
                  "h-11 text-base",
                  editValidationError.includes("name") &&
                    "border-destructive focus-visible:ring-destructive"
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-client-email">Email</Label>
              <Input
                id="edit-client-email"
                type="email"
                value={editEmail}
                onChange={(event) => setEditEmail(event.target.value)}
                className={cn(
                  "h-11 text-base",
                  editValidationError.includes("Email") &&
                    "border-destructive focus-visible:ring-destructive"
                )}
              />
            </div>
          </div>

          {(editError || editValidationError) && (
            <Alert variant="destructive">
              <AlertDescription>{editError ?? editValidationError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setEditingClient(null)}
              disabled={editPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={Boolean(editValidationError) || editPending || !editingClient}
              onClick={() => {
                if (!editingClient || editValidationError) {
                  return;
                }
                setEditError(null);
                startEditTransition(async () => {
                  const result = await updateClientAccountAction({
                    clientId: editingClient.id,
                    name: editName,
                    email: editEmail,
                  });
                  if (result.error) {
                    setEditError(result.error);
                    return;
                  }
                  setEditingClient(null);
                  setActionError(null);
                  setActionMessage(result.message ?? "Client updated.");
                  router.refresh();
                });
              }}
            >
              {editPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deletingClient)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingClient(null);
            setDeleteError(null);
          }
        }}
        title="Delete client account?"
        description={
          deletingClient ? (
            <>
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">{deletingClient.name}</span>{" "}
              ({deletingClient.email}).
            </>
          ) : undefined
        }
        icon={<Trash2 className="h-7 w-7" />}
        confirmLabel="Delete client"
        confirmPendingLabel="Deleting..."
        confirmVariant="destructive"
        pending={deletePending}
        error={deleteError}
        onConfirm={() => {
          if (!deletingClient) {
            return;
          }

          setDeleteError(null);
          startDeleteTransition(async () => {
            const result = await deleteClientAccountAction(deletingClient.id);
            if (result.error) {
              setDeleteError(result.error);
              return;
            }
            setSelectedClientIds((current) =>
              current.filter((clientId) => clientId !== deletingClient.id)
            );
            setDeletingClient(null);
            setActionError(null);
            setActionMessage(result.message ?? "Client deleted.");
            router.refresh();
          });
        }}
      >
        <ul className="list-disc space-y-2 pl-6 text-base text-muted-foreground">
          <li>This action cannot be undone.</li>
          <li>Deletion will fail if this client has linked records.</li>
        </ul>
      </ConfirmDialog>

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          setBulkDeleteOpen(open);
          if (!open) {
            setBulkDeleteError(null);
          }
        }}
        title={`Delete ${selectedClients.length} selected client account${selectedClients.length === 1 ? "" : "s"}?`}
        description="Selected client accounts will be deleted in bulk. Accounts with linked enquiries/projects cannot be removed."
        icon={<Trash2 className="h-7 w-7" />}
        confirmLabel="Delete selected"
        confirmPendingLabel="Deleting selected..."
        confirmVariant="destructive"
        pending={bulkDeletePending}
        error={bulkDeleteError}
        onConfirm={() => {
          if (!selectedClients.length) {
            return;
          }

          setBulkDeleteError(null);
          startBulkDeleteTransition(async () => {
            const result = await deleteManyClientAccountsAction(
              selectedClients.map((client) => client.id)
            );

            if (result.error && !result.message) {
              setBulkDeleteError(result.error);
              return;
            }

            setBulkDeleteOpen(false);
            setSelectedClientIds([]);
            setActionMessage(result.message ?? "Selected clients deleted.");
            setActionError(result.error ?? null);
            router.refresh();
          });
        }}
      >
        <div className="rounded-xl border border-border/80 bg-muted/40 p-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Selected accounts
          </p>
          <p className="mt-2 text-base text-muted-foreground">
            {selectedClients
              .slice(0, 4)
              .map((client) => client.email)
              .join(", ")}
            {selectedClients.length > 4 ? ` and ${selectedClients.length - 4} more` : ""}
          </p>
        </div>
      </ConfirmDialog>
    </div>
  );
}

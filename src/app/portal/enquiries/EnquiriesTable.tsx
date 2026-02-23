"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { DataTable } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toSafeHref } from "@/lib/inputSecurity";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { deleteEnquiryAction, updateEnquiryAction } from "./actions";

export type EnquiryFileRow = {
  id: string;
  fileName: string;
  fileUrl: string;
  sha256: string | null;
  createdAt: string;
};

export type EnquiryProjectRow = {
  id: string;
  title: string;
  status: string;
};

export type EnquiryRow = {
  id: string;
  clientId: string;
  status: string;
  fullName: string;
  contactEmail: string;
  contactPhone: string;
  serviceType: string | null;
  addressLine: string | null;
  propertyType: string | null;
  propertySize: string | null;
  state: string | null;
  area: string | null;
  budgetRange: string | null;
  preferredStyle: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  files: EnquiryFileRow[];
  project: EnquiryProjectRow | null;
};

const ENQUIRY_STATUSES = [
  "SUBMITTED",
  "QUOTED",
  "APPROVED",
  "REJECTED",
  "PROJECT_CREATED",
] as const;

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return date.toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getEnquiryStatusVariant(status: string) {
  switch (status) {
    case "SUBMITTED":
      return "default";
    case "APPROVED":
      return "secondary";
    case "REJECTED":
      return "destructive";
    case "PROJECT_CREATED":
      return "outline";
    default:
      return "outline";
  }
}

function ValueRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
      <div className="text-lg font-medium text-foreground break-words">
        {value}
      </div>
    </div>
  );
}

function display(value: string | null | undefined) {
  const normalized = (value ?? "").toString().trim();
  return normalized ? normalized : "—";
}

export default function EnquiriesTable({
  enquiries,
  isAdmin,
}: {
  enquiries: EnquiryRow[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"view" | "edit">("view");
  const [selected, setSelected] = React.useState<EnquiryRow | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<EnquiryRow | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [saving, startTransition] = React.useTransition();

  const [editState, setEditState] = React.useState({
    status: "SUBMITTED",
    fullName: "",
    contactEmail: "",
    contactPhone: "",
    serviceType: "",
    addressLine: "",
    propertyType: "",
    propertySize: "",
    state: "",
    area: "",
    budgetRange: "",
    preferredStyle: "",
    notes: "",
  });

  React.useEffect(() => {
    if (!selected) return;
    setEditState({
      status: selected.status || "SUBMITTED",
      fullName: selected.fullName || "",
      contactEmail: selected.contactEmail || "",
      contactPhone: selected.contactPhone || "",
      serviceType: selected.serviceType ?? "",
      addressLine: selected.addressLine ?? "",
      propertyType: selected.propertyType ?? "",
      propertySize: selected.propertySize ?? "",
      state: selected.state ?? "",
      area: selected.area ?? "",
      budgetRange: selected.budgetRange ?? "",
      preferredStyle: selected.preferredStyle ?? "",
      notes: selected.notes ?? "",
    });
  }, [selected]);

  const columns = React.useMemo<ColumnDef<EnquiryRow>[]>(() => {
    const base: ColumnDef<EnquiryRow>[] = [
      {
        accessorKey: "contactEmail",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        meta: { hideFromViewOptions: true },
      },
      {
        accessorKey: "serviceType",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Service" />
        ),
        cell: ({ row }) => (
          <div>
            <div className="text-lg font-semibold text-foreground">
              {row.original.serviceType ?? "Enquiry"}
            </div>
            <div className="text-base text-muted-foreground mt-1">
              {row.original.fullName} · {row.original.contactEmail}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "propertyType",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Property" />
        ),
        cell: ({ row }) => (
          <div className="text-muted-foreground">
            {row.original.propertyType ?? "—"}
          </div>
        ),
      },
      {
        accessorKey: "budgetRange",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Budget" />
        ),
        cell: ({ row }) => (
          <div className="text-muted-foreground">
            {row.original.budgetRange ?? "—"}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => (
          <Badge variant={getEnquiryStatusVariant(row.original.status)}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Submitted" />
        ),
        cell: ({ row }) => (
          <div className="text-muted-foreground">{formatDate(row.original.createdAt)}</div>
        ),
      },
    ];

    if (!isAdmin) {
      return base;
    }

    return [
      ...base,
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-11 w-11">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    setError(null);
                    setSelected(row.original);
                    setMode("edit");
                    setOpen(true);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={(event) => {
                    event.preventDefault();
                    setError(null);
                    setDeleteError(null);
                    setDeleteTarget(row.original);
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ];
  }, [isAdmin, router, startTransition]);

  function openDetails(enquiry: EnquiryRow) {
    setError(null);
    setSelected(enquiry);
    setMode("view");
    setOpen(true);
  }

  async function saveEdits() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await updateEnquiryAction({
        enquiryId: selected.id,
        data: {
          status: editState.status,
          fullName: editState.fullName,
          contactEmail: editState.contactEmail,
          contactPhone: editState.contactPhone,
          serviceType: editState.serviceType,
          addressLine: editState.addressLine || null,
          propertyType: editState.propertyType || null,
          propertySize: editState.propertySize || null,
          state: editState.state || null,
          area: editState.area || null,
          budgetRange: editState.budgetRange || null,
          preferredStyle: editState.preferredStyle || null,
          notes: editState.notes || null,
        },
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setMode("view");
      setOpen(false);
      setSelected(null);
      router.refresh();
    });
  }

  return (
    <>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <DataTable
        columns={columns}
        data={enquiries}
        filterColumnId="contactEmail"
        filterPlaceholder="Search enquiries by email…"
        emptyMessage="No enquiries yet."
        onRowClick={openDetails}
        initialColumnVisibility={{ contactEmail: false }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(next) => {
          setDeleteOpen(next);
          if (!next) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        title="Delete enquiry?"
        description={
          deleteTarget ? (
            <>
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget.fullName}
              </span>{" "}
              ({deleteTarget.contactEmail}) and any uploaded files.
            </>
          ) : (
            "This action cannot be undone."
          )
        }
        icon={<Trash2 className="h-7 w-7" />}
        confirmLabel="Delete enquiry"
        confirmPendingLabel="Deleting…"
        confirmVariant="destructive"
        pending={saving}
        error={deleteError}
        onConfirm={() => {
          if (!deleteTarget) return;
          setDeleteError(null);
          startTransition(async () => {
            const result = await deleteEnquiryAction(deleteTarget.id);
            if (result.error) {
              setDeleteError(result.error);
              return;
            }
            setDeleteOpen(false);
            setDeleteTarget(null);
            router.refresh();
          });
        }}
      >
        <ul className="list-disc pl-6 space-y-2 text-base text-muted-foreground">
          <li>This action cannot be undone.</li>
          <li>
            If a project already exists for this enquiry, delete the project
            first.
          </li>
        </ul>
      </ConfirmDialog>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setMode("view");
            setSelected(null);
            setError(null);
          }
        }}
      >
        <DialogContent className="max-h-[88vh] overflow-hidden max-w-4xl p-10">
          {!selected ? null : (
            <>
              <DialogHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <DialogTitle className="text-3xl">Enquiry details</DialogTitle>
                    <DialogDescription className="text-lg">
                      Submitted {formatDate(selected.createdAt)}
                    </DialogDescription>
                  </div>
                  <Badge variant={getEnquiryStatusVariant(selected.status)} className="w-fit">
                    {selected.status}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="mt-6 max-h-[60vh] overflow-y-auto pr-1 space-y-8">
                {mode === "view" ? (
                  <>
                    <div className="grid gap-6 md:grid-cols-3">
                      <ValueRow label="Full name" value={display(selected.fullName)} />
                      <ValueRow
                        label="Email"
                        value={
                          <a
                            href={`mailto:${selected.contactEmail}`}
                            className="text-primary hover:underline"
                          >
                            {selected.contactEmail}
                          </a>
                        }
                      />
                      <ValueRow label="Phone" value={display(selected.contactPhone)} />
                    </div>

                    <Separator />

                    <div className="grid gap-6 md:grid-cols-2">
                      <ValueRow label="Service type" value={display(selected.serviceType)} />
                      <ValueRow label="Budget range" value={display(selected.budgetRange)} />
                      <ValueRow label="Property type" value={display(selected.propertyType)} />
                      <ValueRow label="Property size" value={display(selected.propertySize)} />
                      <ValueRow label="State" value={display(selected.state)} />
                      <ValueRow label="Area" value={display(selected.area)} />
                      <ValueRow label="Address" value={display(selected.addressLine)} />
                      <ValueRow label="Preferred style" value={display(selected.preferredStyle)} />
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
                        Notes
                      </div>
                      <div className="rounded-xl border bg-muted/20 p-5 text-lg text-foreground whitespace-pre-wrap">
                        {display(selected.notes)}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-baseline justify-between gap-4">
                        <div>
                          <div className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
                            Attachments
                          </div>
                          <div className="text-base text-muted-foreground">
                            {selected.files.length} file{selected.files.length === 1 ? "" : "s"}
                          </div>
                        </div>
                      </div>

                      {selected.files.length === 0 ? (
                        <div className="text-base text-muted-foreground">No files uploaded.</div>
                      ) : (
                        <div className="space-y-3">
                          {selected.files.map((file) => (
                            <div
                              key={file.id}
                              className="rounded-xl border bg-background p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0">
                                <div className="text-lg font-semibold truncate">
                                  {file.fileName}
                                </div>
                                <div className="text-base text-muted-foreground">
                                  Uploaded {formatDate(file.createdAt)}
                                </div>
                                {file.sha256 && (
                                  <div className="text-xs text-muted-foreground font-mono truncate mt-2">
                                    SHA-256: {file.sha256}
                                  </div>
                                )}
                              </div>
                              <Button asChild variant="outline" size="lg" className="shrink-0">
                                <a href={toSafeHref(file.fileUrl)} target="_blank" rel="noreferrer">
                                  View / Download
                                </a>
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div className="grid gap-6 md:grid-cols-2">
                      <ValueRow label="Enquiry ID" value={<span className="font-mono text-sm">{selected.id}</span>} />
                      <ValueRow label="Client ID" value={<span className="font-mono text-sm">{selected.clientId}</span>} />
                      <ValueRow label="Created at" value={formatDate(selected.createdAt)} />
                      <ValueRow label="Updated at" value={formatDate(selected.updatedAt)} />
                      <ValueRow
                        label="Linked project"
                        value={
                          selected.project ? (
                            <Link
                              href={`/portal/projects/${selected.project.id}`}
                              className="text-primary hover:underline"
                            >
                              {selected.project.title} ({selected.project.status})
                            </Link>
                          ) : (
                            "—"
                          )
                        }
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="enquiry-status">Status</Label>
                        <select
                          id="enquiry-status"
                          value={editState.status}
                          onChange={(event) =>
                            setEditState((prev) => ({ ...prev, status: event.target.value }))
                          }
                          className="h-12 w-full rounded-lg border border-input bg-background px-4 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {ENQUIRY_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="enquiry-service">Service type</Label>
                        <Input
                          id="enquiry-service"
                          value={editState.serviceType}
                          onChange={(event) =>
                            setEditState((prev) => ({ ...prev, serviceType: event.target.value }))
                          }
                          className="h-12 text-base"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="enquiry-name">Full name</Label>
                        <Input
                          id="enquiry-name"
                          value={editState.fullName}
                          onChange={(event) =>
                            setEditState((prev) => ({ ...prev, fullName: event.target.value }))
                          }
                          className="h-12 text-base"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="enquiry-email">Email</Label>
                        <Input
                          id="enquiry-email"
                          type="email"
                          value={editState.contactEmail}
                          onChange={(event) =>
                            setEditState((prev) => ({
                              ...prev,
                              contactEmail: event.target.value,
                            }))
                          }
                          className="h-12 text-base"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="enquiry-phone">Phone</Label>
                        <Input
                          id="enquiry-phone"
                          value={editState.contactPhone}
                          onChange={(event) =>
                            setEditState((prev) => ({
                              ...prev,
                              contactPhone: event.target.value,
                            }))
                          }
                          className="h-12 text-base"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="enquiry-budget">Budget range</Label>
                        <Input
                          id="enquiry-budget"
                          value={editState.budgetRange}
                          onChange={(event) =>
                            setEditState((prev) => ({
                              ...prev,
                              budgetRange: event.target.value,
                            }))
                          }
                          className="h-12 text-base"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="enquiry-address">Address line</Label>
                        <Input
                          id="enquiry-address"
                          value={editState.addressLine}
                          onChange={(event) =>
                            setEditState((prev) => ({
                              ...prev,
                              addressLine: event.target.value,
                            }))
                          }
                          className="h-12 text-base"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="enquiry-property-type">Property type</Label>
                        <Input
                          id="enquiry-property-type"
                          value={editState.propertyType}
                          onChange={(event) =>
                            setEditState((prev) => ({
                              ...prev,
                              propertyType: event.target.value,
                            }))
                          }
                          className="h-12 text-base"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="enquiry-property-size">Property size</Label>
                        <Input
                          id="enquiry-property-size"
                          value={editState.propertySize}
                          onChange={(event) =>
                            setEditState((prev) => ({
                              ...prev,
                              propertySize: event.target.value,
                            }))
                          }
                          className="h-12 text-base"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="enquiry-state">State</Label>
                        <Input
                          id="enquiry-state"
                          value={editState.state}
                          onChange={(event) =>
                            setEditState((prev) => ({ ...prev, state: event.target.value }))
                          }
                          className="h-12 text-base"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="enquiry-area">Area</Label>
                        <Input
                          id="enquiry-area"
                          value={editState.area}
                          onChange={(event) =>
                            setEditState((prev) => ({ ...prev, area: event.target.value }))
                          }
                          className="h-12 text-base"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="enquiry-style">Preferred style</Label>
                        <Input
                          id="enquiry-style"
                          value={editState.preferredStyle}
                          onChange={(event) =>
                            setEditState((prev) => ({
                              ...prev,
                              preferredStyle: event.target.value,
                            }))
                          }
                          className="h-12 text-base"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="enquiry-notes">Notes</Label>
                        <Textarea
                          id="enquiry-notes"
                          value={editState.notes}
                          onChange={(event) =>
                            setEditState((prev) => ({ ...prev, notes: event.target.value }))
                          }
                          className="min-h-[140px] text-base"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-6">
                {mode === "view" ? (
                  <>
                    {isAdmin && (
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={() => setMode("edit")}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    )}
                    <Button type="button" size="lg" onClick={() => setOpen(false)}>
                      Close
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => setMode("view")}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button type="button" size="lg" onClick={saveEdits} disabled={saving}>
                      {saving ? "Saving…" : "Save changes"}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

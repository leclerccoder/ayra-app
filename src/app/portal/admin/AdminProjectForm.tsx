"use client";

import { useActionState, useMemo, useState } from "react";
import { createProjectAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Plus } from "lucide-react";
import { MfaCodeRequest } from "@/components/portal/mfa-code-request";

type DesignerOption = {
  id: string;
  name: string;
  email: string;
};

type EnquiryOption = {
  id: string;
  fullName: string;
  contactEmail: string;
  serviceType: string | null;
};

const initialState = { error: undefined as string | undefined };

export default function AdminProjectForm({
  enquiries,
  designers,
}: {
  enquiries: EnquiryOption[];
  designers: DesignerOption[];
}) {
  const [state, formAction] = useActionState(createProjectAction, initialState);
  const [selectedId, setSelectedId] = useState(enquiries[0]?.id ?? "");
  const selectedEnquiry = useMemo(
    () => enquiries.find((enquiry) => enquiry.id === selectedId) ?? null,
    [enquiries, selectedId]
  );
  const [title, setTitle] = useState(
    selectedEnquiry
      ? `${selectedEnquiry.serviceType ?? "Project"} for ${selectedEnquiry.fullName}`
      : ""
  );

  const handleSelectChange = (value: string) => {
    setSelectedId(value);
    const enquiry = enquiries.find((item) => item.id === value);
    setTitle(
      enquiry
        ? `${enquiry.serviceType ?? "Project"} for ${enquiry.fullName}`
        : ""
    );
  };

  if (enquiries.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No enquiries available for project creation.
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="enquiryId">Select enquiry</Label>
        <select
          id="enquiryId"
          name="enquiryId"
          value={selectedId}
          onChange={(event) => handleSelectChange(event.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {enquiries.map((enquiry) => (
            <option key={enquiry.id} value={enquiry.id}>
              {(enquiry.serviceType ?? "Enquiry")} · {enquiry.fullName} ({enquiry.contactEmail})
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Project title</Label>
          <Input
            id="title"
            name="title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quotedAmount">Quoted amount (RM)</Label>
          <Input
            id="quotedAmount"
            name="quotedAmount"
            type="text"
            placeholder="e.g. 2500.00"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="designerId">Assign designer</Label>
        <select
          id="designerId"
          name="designerId"
          defaultValue=""
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Unassigned</option>
          {designers.map((designer) => (
            <option key={designer.id} value={designer.id}>
              {designer.name} ({designer.email})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="mfaCode">Admin email code</Label>
          <MfaCodeRequest purpose="create_project" />
        </div>
        <Input
          id="mfaCode"
          name="mfaCode"
          type="password"
          inputMode="numeric"
          placeholder="Enter email code"
          required
        />
      </div>

      <Button type="submit" className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Create Project
      </Button>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createProjectAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Plus } from "lucide-react";
import { MfaCodeRequest } from "@/components/portal/mfa-code-request";
import {
  formatDesignerTypes,
  designerMatchesServiceType,
  getRequiredDesignerTypeForService,
} from "@/lib/portalOptions";

type DesignerOption = {
  id: string;
  name: string;
  email: string;
  designerTypes: string[];
};

type EnquiryOption = {
  id: string;
  fullName: string;
  contactEmail: string;
  serviceType: string | null;
};

type FormState = {
  error?: string;
  message?: string;
  projectId?: string;
};

const initialState: FormState = {
  error: undefined,
  message: undefined,
  projectId: undefined,
};

export default function AdminProjectForm({
  enquiries,
  designers,
  initialEnquiryId,
  hideEnquirySelect = false,
  onCreated,
}: {
  enquiries: EnquiryOption[];
  designers: DesignerOption[];
  initialEnquiryId?: string;
  hideEnquirySelect?: boolean;
  onCreated?: (projectId: string) => void;
}) {
  const [state, formAction] = useActionState(createProjectAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (!state.projectId) {
      return;
    }

    router.refresh();
    onCreated?.(state.projectId);
  }, [onCreated, router, state.projectId]);

  return (
    <AdminProjectFormInner
      key={`${initialEnquiryId ?? "project-form"}-${state.projectId ?? "idle"}`}
      enquiries={enquiries}
      designers={designers}
      formAction={formAction}
      state={state}
      initialEnquiryId={initialEnquiryId}
      hideEnquirySelect={hideEnquirySelect}
    />
  );
}

function AdminProjectFormInner({
  enquiries,
  designers,
  formAction,
  state,
  initialEnquiryId,
  hideEnquirySelect,
}: {
  enquiries: EnquiryOption[];
  designers: DesignerOption[];
  formAction: (formData: FormData) => void;
  state: FormState;
  initialEnquiryId?: string;
  hideEnquirySelect: boolean;
}) {
  const [isMfaReady, setIsMfaReady] = useState(false);
  const [selectedId, setSelectedId] = useState(initialEnquiryId ?? enquiries[0]?.id ?? "");
  const [designerSelection, setDesignerSelection] = useState("__AUTO__");
  const selectedEnquiry = useMemo(
    () => enquiries.find((enquiry) => enquiry.id === selectedId) ?? null,
    [enquiries, selectedId]
  );
  const selectedServiceType = selectedEnquiry?.serviceType ?? null;
  const requiredDesignerType = useMemo(
    () => getRequiredDesignerTypeForService(selectedServiceType),
    [selectedServiceType]
  );
  const recommendedDesigners = useMemo(() => {
    if (!selectedEnquiry?.serviceType) {
      return [];
    }

    return designers.filter((designer) =>
      designerMatchesServiceType(selectedEnquiry.serviceType, designer.designerTypes)
    );
  }, [designers, selectedEnquiry]);
  const assignableDesigners = requiredDesignerType ? recommendedDesigners : designers;
  const recommendedDesignerId = recommendedDesigners[0]?.id ?? "";
  const effectiveDesignerId =
    designerSelection === "__AUTO__" ? recommendedDesignerId : designerSelection;
  const [title, setTitle] = useState(
    selectedEnquiry
      ? `${selectedEnquiry.serviceType ?? "Project"} for ${selectedEnquiry.fullName}`
      : ""
  );
  const [quotedAmount, setQuotedAmount] = useState("");

  const handleSelectChange = (value: string) => {
    setSelectedId(value);
    setDesignerSelection("__AUTO__");
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
      {hideEnquirySelect ? (
        <>
          <input type="hidden" name="enquiryId" value={selectedId} />
          {selectedEnquiry && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="text-sm font-medium text-muted-foreground">Selected enquiry</div>
              <div className="mt-1 text-base font-semibold text-foreground">
                {selectedEnquiry.serviceType ?? "Enquiry"} · {selectedEnquiry.fullName}
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedEnquiry.contactEmail}
              </div>
            </div>
          )}
        </>
      ) : (
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
      )}

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
            value={quotedAmount}
            onChange={(event) => setQuotedAmount(event.target.value)}
            placeholder="e.g. 2500.00"
            inputMode="decimal"
            pattern="^[0-9]+([.][0-9]{1,2})?$"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="designerId">Assign designer</Label>
        <select
          id="designerId"
          name="designerId"
          value={effectiveDesignerId}
          onChange={(event) => setDesignerSelection(event.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">
            {requiredDesignerType
              ? recommendedDesignerId
                ? "Auto-assign matched designer"
                : `No ${requiredDesignerType} designer available`
              : "Unassigned"}
          </option>
          {assignableDesigners.map((designer) => (
            <option key={designer.id} value={designer.id}>
              {designer.name} ({designer.email})
              {designer.designerTypes.length > 0
                ? ` · ${formatDesignerTypes(designer.designerTypes)}`
                : ""}
            </option>
          ))}
        </select>
        {requiredDesignerType ? (
          recommendedDesignerId ? (
            <p className="text-xs text-muted-foreground">
              Auto-matched to designers tagged for {requiredDesignerType}. You can
              still choose another compatible designer.
            </p>
          ) : (
            <p className="text-xs text-destructive">
              No designer tagged for {requiredDesignerType} is available right now.
              Project creation will be blocked until a matching designer is added.
            </p>
          )
        ) : (
          <p className="text-xs text-muted-foreground">
            Choose a designer manually when the enquiry does not have a service type.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="mfaCode">Admin email code</Label>
          <MfaCodeRequest purpose="create_project" onCodeSent={() => setIsMfaReady(true)} />
        </div>
        <Input
          id="mfaCode"
          name="mfaCode"
          type="password"
          inputMode="numeric"
          placeholder={isMfaReady ? "Enter email code" : "Click Send code first"}
          required={isMfaReady}
          disabled={!isMfaReady}
        />
        {!isMfaReady && (
          <p className="text-xs text-muted-foreground">
            Send a code first to unlock this field.
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={!isMfaReady}>
        <Plus className="mr-2 h-4 w-4" />
        Create Project
      </Button>
    </form>
  );
}

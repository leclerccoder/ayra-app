"use client";

import {
  useActionState,
  useState,
  useEffect,
  useRef,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { z } from "zod";
import Link from "next/link";
import { createEnquiryAction } from "../actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Send,
  User,
  Wrench,
  Home,
  Palette,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const initialState = {
  error: undefined as string | undefined,
  success: undefined as boolean | undefined,
  enquiryId: undefined as string | undefined,
  message: undefined as string | undefined,
};

// Step definitions
const TOTAL_STEPS = 4;
const steps = [
  { id: 1, title: "Contact Info", icon: User, description: "Your contact details" },
  { id: 2, title: "Service", icon: Wrench, description: "What you need" },
  { id: 3, title: "Property", icon: Home, description: "Property details" },
  { id: 4, title: "Preferences", icon: Palette, description: "Style & budget" },
];

// Validation schemas per step
const stepSchemas = {
  1: z.object({
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    contactEmail: z.string().email("Please enter a valid email address"),
    contactPhone: z.string().min(7, "Phone number must be at least 7 digits"),
  }),
  2: z.object({
    serviceType: z.string().min(1, "Please select a service type"),
  }),
  3: z.object({
    addressLine: z.string().optional(),
    propertyType: z.string().optional(),
    propertySize: z.string().optional(),
    state: z.string().optional(),
    area: z.string().optional(),
  }),
  4: z.object({
    budgetRange: z.string().optional(),
    preferredStyle: z.string().optional(),
    notes: z.string().optional(),
  }),
};

const fullSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  contactEmail: z.string().email("Please enter a valid email address"),
  contactPhone: z.string().min(7, "Phone number must be at least 7 digits"),
  serviceType: z.string().min(1, "Please select a service type"),
  addressLine: z.string().optional(),
  propertyType: z.string().optional(),
  propertySize: z.string().optional(),
  state: z.string().optional(),
  area: z.string().optional(),
  budgetRange: z.string().optional(),
  preferredStyle: z.string().optional(),
  notes: z.string().optional(),
});

type EnquiryValues = {
  fullName: string;
  contactEmail: string;
  contactPhone: string;
  serviceType: string;
  addressLine: string;
  propertyType: string;
  propertySize: string;
  state: string;
  area: string;
  budgetRange: string;
  preferredStyle: string;
  notes: string;
};

const initialValues: EnquiryValues = {
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
};

// Step validation helper
function validateStep(step: number, values: EnquiryValues) {
  const schema = stepSchemas[step as keyof typeof stepSchemas];
  const result = schema.safeParse(values);
  if (result.success) return {};

  const errors: Partial<Record<keyof EnquiryValues, string>> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string") {
      errors[key as keyof EnquiryValues] = issue.message;
    }
  }
  return errors;
}

// Error message component
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 mt-2 text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}

// Step indicator component
function StepIndicator({
  currentStep,
  completedSteps,
}: {
  currentStep: number;
  completedSteps: Set<number>;
}) {
  return (
    <div className="relative mb-12">
      {/* Progress bar background */}
      <div className="absolute top-7 left-0 right-0 h-1.5 bg-muted rounded-full" />

      {/* Progress bar fill */}
      <div
        className="absolute top-7 left-0 h-1.5 bg-primary rounded-full transition-all duration-500 ease-out"
        style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
      />

      {/* Step circles */}
      <div className="relative flex justify-between">
        {steps.map((step) => {
          const isCompleted = completedSteps.has(step.id);
          const isCurrent = currentStep === step.id;
          const isUpcoming = step.id > currentStep;

          return (
            <div key={step.id} className="flex flex-col items-center">
              <div
                className={cn(
                  "relative z-10 flex h-14 w-14 items-center justify-center rounded-full border-2 transition-all duration-300",
                  isCompleted && "bg-primary border-primary text-primary-foreground",
                  isCurrent && !isCompleted && "bg-primary border-primary text-primary-foreground scale-110 shadow-lg shadow-primary/30",
                  isUpcoming && "bg-background border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-7 w-7 animate-in zoom-in duration-200" />
                ) : (
                  <step.icon className="h-6 w-6" />
                )}
              </div>
              <div className="mt-4 text-center">
                <div
                  className={cn(
                    "text-base font-semibold transition-colors",
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </div>
                <div className="text-sm text-muted-foreground mt-1 hidden sm:block">
                  {step.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EnquiryForm() {
  const [state, formAction] = useActionState(createEnquiryAction, initialState);
  const [values, setValues] = useState<EnquiryValues>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof EnquiryValues, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof EnquiryValues, boolean>>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const formRef = useRef<HTMLFormElement | null>(null);
  const formTopRef = useRef<HTMLDivElement | null>(null);
  // Track when we're in the middle of stepping forward to prevent race conditions
  const isSteppingForwardRef = useRef(false);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (state.error || state.success) {
      setIsSubmitting(false);
    }
    if (state.success) {
      setCompletedSteps(new Set(steps.map((s) => s.id)));
      setCurrentStep(TOTAL_STEPS);
    }
  }, [state.error, state.success]);

  // When switching steps, scroll the form back into view so the next step isn't "hidden"
  // while the user stays scrolled at the bottom (which can feel like it skipped steps).
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentStep]);

  // Real-time validation on field change
  const updateField = (field: keyof EnquiryValues, value: string) => {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Validate current step in real-time
    const stepErrors = validateStep(currentStep, nextValues);
    setErrors((prev) => {
      const next = { ...prev };
      // Clear error for this field if it's now valid
      if (!stepErrors[field]) {
        delete next[field];
      } else {
        next[field] = stepErrors[field];
      }
      return next;
    });
  };

  // Check if field should show error
  const showError = (field: keyof EnquiryValues) => Boolean(touched[field]) && Boolean(errors[field]);

  // Validate current step and go to next
  const handleNext = () => {

    const stepErrors = validateStep(currentStep, values);

    // Mark all fields in current step as touched
    const stepFields = Object.keys(stepSchemas[currentStep as keyof typeof stepSchemas].shape);
    const newTouched = { ...touched };
    stepFields.forEach(field => {
      newTouched[field as keyof EnquiryValues] = true;
    });
    setTouched(newTouched);

    if (Object.keys(stepErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...stepErrors }));
      return;
    }


    // Set flag to prevent race condition where submit button gets the click event
    isSteppingForwardRef.current = true;

    // Mark step as completed and move forward
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    setDirection("forward");
    setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));

    // Clear the flag after the next render cycle
    requestAnimationFrame(() => {
      isSteppingForwardRef.current = false;
    });
  };

  // Go to previous step
  const handleBack = () => {
    setDirection("backward");
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Final submission
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {

    // Always prevent the browser's default form submission
    event.preventDefault();
    event.stopPropagation();

    // RACE CONDITION GUARD: If we're in the middle of stepping forward,
    // the Submit button may have appeared due to state change and received the click.
    // In this case, we should NOT submit - just return early.
    if (isSteppingForwardRef.current) {
      return;
    }

    // STRICT GUARD: Only allow submission on the final step
    // This prevents any accidental submissions from earlier steps
    if (currentStep !== TOTAL_STEPS) {
      // If we're not on the last step, just advance to the next step
      handleNext();
      return;
    }


    // We're on step 4 - validate the full form
    const fullResult = fullSchema.safeParse(values);

    if (!fullResult.success) {
      const allErrors: Partial<Record<keyof EnquiryValues, string>> = {};
      for (const issue of fullResult.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string") {
          allErrors[key as keyof EnquiryValues] = issue.message;
        }
      }
      setErrors(allErrors);
      return;
    }

    // Prevent double submission
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Only now do we actually submit the form
    const fd = new FormData(event.currentTarget);
    formAction(fd);
  };

  const onFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Enter") return;
    // Allow Enter for multi-line textareas.
    const target = event.target as HTMLElement | null;
    if (target?.tagName === "TEXTAREA") return;
    // Before the last step, Enter should advance the wizard (not submit).
    if (currentStep !== TOTAL_STEPS) {
      event.preventDefault();
      event.stopPropagation();
      handleNext();
    }
  };

  // Animation class based on direction
  const getAnimationClass = () => {
    return direction === "forward"
      ? "animate-in fade-in slide-in-from-right-4 duration-300"
      : "animate-in fade-in slide-in-from-left-4 duration-300";
  };

  if (state.success && state.enquiryId) {
    return (
      <div className="w-full flex flex-col items-center px-4">
        <Card className="border-2 shadow-xl w-full max-w-3xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary to-purple-600" />
          <CardHeader className="pb-6 pt-8">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-3xl">Enquiry Submitted</CardTitle>
                <CardDescription className="text-base">
                  {state.message ?? "Your enquiry has been submitted successfully."}
                </CardDescription>
                <div className="text-sm text-muted-foreground">
                  Reference ID: <span className="font-mono text-foreground">{state.enquiryId}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-10 px-8 space-y-6">
            <div className="rounded-xl border bg-muted/20 p-5">
              <div className="text-base font-semibold mb-3">Submission summary</div>
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <div className="text-muted-foreground">Service</div>
                  <div className="font-medium">{values.serviceType || "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Budget range</div>
                  <div className="font-medium">{values.budgetRange || "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Preferred style</div>
                  <div className="font-medium">{values.preferredStyle || "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Contact email</div>
                  <div className="font-medium">{values.contactEmail || "—"}</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link href="/portal/enquiries" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto">
                  View Enquiries
                </Button>
              </Link>
              <Link href="/portal/enquiries/new" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Submit Another Enquiry
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center px-4">
      {/* Header */}
      <div className="text-center mb-12 w-full">
        <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          New Design Enquiry
        </h1>
        <p className="text-xl text-muted-foreground mt-4">
          Complete the form below to request a quotation. We'll prepare a detailed escrow plan tailored to your project.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="w-full max-w-4xl">
        <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />
      </div>

      {/* Form Card */}
      <div ref={formTopRef} className="w-full max-w-4xl">
        <Card className="border-2 shadow-xl w-full">
          <CardHeader className="pb-8 pt-8 border-b bg-muted/30">
            <div className="flex items-center gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
                {(() => {
                  const StepIcon = steps[currentStep - 1].icon;
                  return <StepIcon className="h-8 w-8" />;
                })()}
              </div>
              <div>
                <CardTitle className="text-2xl">
                  Step {currentStep}: {steps[currentStep - 1].title}
                </CardTitle>
                <CardDescription className="text-base mt-1">
                  {steps[currentStep - 1].description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-10 pb-10 px-8">
            <form
              ref={formRef}
              onSubmit={onSubmit}
              onKeyDown={onFormKeyDown}
              encType="multipart/form-data"
            >
              {/* Hidden inputs for all values */}
              {Object.entries(values).map(([key, value]) => (
                <input key={key} type="hidden" name={key} value={value} />
              ))}

              {state.error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription className="text-base">{state.error}</AlertDescription>
                </Alert>
              )}

              {/* Step 1: Contact Information */}
              {currentStep === 1 && (
                <div className={cn("space-y-6", getAnimationClass())} key="step-1">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-base">
                        Full Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="John Doe"
                        value={values.fullName}
                        onChange={(e) => updateField("fullName", e.target.value)}
                        className={cn(
                          "transition-all duration-200",
                          showError("fullName") && "border-destructive ring-2 ring-destructive/20"
                        )}
                      />
                      <FieldError message={showError("fullName") ? errors.fullName : undefined} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail" className="text-base">
                        Email Address <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        placeholder="john@example.com"
                        value={values.contactEmail}
                        onChange={(e) => updateField("contactEmail", e.target.value)}
                        className={cn(
                          "transition-all duration-200",
                          showError("contactEmail") && "border-destructive ring-2 ring-destructive/20"
                        )}
                      />
                      <FieldError message={showError("contactEmail") ? errors.contactEmail : undefined} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone" className="text-base">
                      Phone Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="contactPhone"
                      type="tel"
                      placeholder="+60 12 345 6789"
                      value={values.contactPhone}
                      onChange={(e) => updateField("contactPhone", e.target.value)}
                      className={cn(
                        "transition-all duration-200",
                        showError("contactPhone") && "border-destructive ring-2 ring-destructive/20"
                      )}
                    />
                    <FieldError message={showError("contactPhone") ? errors.contactPhone : undefined} />
                  </div>
                </div>
              )}

              {/* Step 2: Service Details */}
              {currentStep === 2 && (
                <div className={cn("space-y-6", getAnimationClass())} key="step-2">
                  <div className="space-y-3">
                    <Label htmlFor="serviceType" className="text-base">
                      Service Type <span className="text-destructive">*</span>
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Select the type of design service you're interested in
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2 mt-4">
                      {[
                        { value: "2D Design", label: "2D Design", desc: "Floor plans & layouts" },
                        { value: "3D Design", label: "3D Design", desc: "Realistic visualizations" },
                        { value: "Renovation", label: "Renovation", desc: "Transform your space" },
                        { value: "Design & Build", label: "Design & Build", desc: "Complete package" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateField("serviceType", option.value)}
                          className={cn(
                            "flex flex-col items-start p-5 rounded-xl border-2 text-left transition-all duration-200 hover:border-primary/50 hover:bg-muted/50",
                            values.serviceType === option.value
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                              : "border-muted"
                          )}
                        >
                          <span className="font-semibold text-lg">{option.label}</span>
                          <span className="text-sm text-muted-foreground mt-1">{option.desc}</span>
                          {values.serviceType === option.value && (
                            <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                    <FieldError message={showError("serviceType") ? errors.serviceType : undefined} />
                  </div>
                </div>
              )}

              {/* Step 3: Property Information */}
              {currentStep === 3 && (
                <div className={cn("space-y-6", getAnimationClass())} key="step-3">
                  <div className="space-y-2">
                    <Label htmlFor="addressLine" className="text-base">Property Address</Label>
                    <Input
                      id="addressLine"
                      type="text"
                      placeholder="123 Main Street, City"
                      value={values.addressLine}
                      onChange={(e) => updateField("addressLine", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="propertyType" className="text-base">Property Type</Label>
                      <select
                        id="propertyType"
                        value={values.propertyType}
                        onChange={(e) => updateField("propertyType", e.target.value)}
                        className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="">Select type</option>
                        <option value="Condominium">Condominium</option>
                        <option value="Landed House">Landed House</option>
                        <option value="Apartment">Apartment</option>
                        <option value="Commercial">Commercial</option>
                        <option value="Office">Office</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="propertySize" className="text-base">Property Size (sq ft)</Label>
                      <Input
                        id="propertySize"
                        type="text"
                        placeholder="e.g., 1200"
                        value={values.propertySize}
                        onChange={(e) => updateField("propertySize", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-base">State</Label>
                      <select
                        id="state"
                        value={values.state}
                        onChange={(e) => updateField("state", e.target.value)}
                        className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="">Select state</option>
                        <option value="Kuala Lumpur">Kuala Lumpur</option>
                        <option value="Selangor">Selangor</option>
                        <option value="Penang">Penang</option>
                        <option value="Johor">Johor</option>
                        <option value="Sabah">Sabah</option>
                        <option value="Sarawak">Sarawak</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="area" className="text-base">Area / District</Label>
                      <Input
                        id="area"
                        type="text"
                        placeholder="e.g., Mont Kiara"
                        value={values.area}
                        onChange={(e) => updateField("area", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Preferences */}
              {currentStep === 4 && (
                <div className={cn("space-y-6", getAnimationClass())} key="step-4">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="budgetRange" className="text-base">Budget Range (RM)</Label>
                      <select
                        id="budgetRange"
                        value={values.budgetRange}
                        onChange={(e) => updateField("budgetRange", e.target.value)}
                        className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="">Select budget</option>
                        <option value="Below 50k">Below RM 50,000</option>
                        <option value="50k - 100k">RM 50,000 - RM 100,000</option>
                        <option value="100k - 200k">RM 100,000 - RM 200,000</option>
                        <option value="200k - 500k">RM 200,000 - RM 500,000</option>
                        <option value="Above 500k">Above RM 500,000</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preferredStyle" className="text-base">Preferred Style</Label>
                      <select
                        id="preferredStyle"
                        value={values.preferredStyle}
                        onChange={(e) => updateField("preferredStyle", e.target.value)}
                        className="flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="">Select style</option>
                        <option value="Modern">Modern</option>
                        <option value="Contemporary">Contemporary</option>
                        <option value="Minimalist">Minimalist</option>
                        <option value="Industrial">Industrial</option>
                        <option value="Scandinavian">Scandinavian</option>
                        <option value="Traditional">Traditional</option>
                        <option value="Luxury">Luxury</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-base">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Tell us more about your vision, requirements, or any specific requests..."
                      rows={5}
                      value={values.notes}
                      onChange={(e) => updateField("notes", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="floorPlan" className="text-base">Upload Floor Plan (Optional)</Label>
                    <Input id="floorPlan" name="floorPlan" type="file" accept=".pdf,.jpg,.jpeg,.png" />
                    <p className="text-sm text-muted-foreground">
                      Accepted formats: PDF, JPG, PNG (max 10MB)
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-10 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className={cn(
                    "gap-2 transition-all duration-200",
                    currentStep === 1 && "opacity-0 pointer-events-none"
                  )}
                >
                  <ChevronLeft className="h-5 w-5" />
                  Back
                </Button>

                {currentStep < TOTAL_STEPS ? (
                  <Button
                    type="button"
                    size="lg"
                    onClick={handleNext}
                    className="gap-2 min-w-[140px]"
                  >
                    Continue
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="lg"
                    className="gap-2 min-w-[160px] bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        Submit Enquiry
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Progress Text */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-3 px-6 py-3 bg-muted/50 rounded-full border">
          <span className="text-base font-medium text-foreground">Step {currentStep} of {steps.length}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-base text-muted-foreground">{completedSteps.size} completed</span>
        </div>
      </div>
    </div>
  );
}

"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { saveUploadedFile } from "@/lib/storage";
import { notifyAdmins } from "@/lib/notifications";
import {
  getSanitizedFormText,
  getSanitizedOptionalFormText,
  sanitizeTextInput,
} from "@/lib/inputSecurity";

type FormState = {
  error?: string;
  success?: boolean;
  enquiryId?: string;
  message?: string;
};

type ActionResult = {
  error?: string;
  message?: string;
};

const enquirySchema = z.object({
  fullName: z.string().min(2, "Name is required."),
  contactEmail: z.string().email("Enter a valid email address."),
  contactPhone: z.string().min(7, "Enter a valid phone number."),
  serviceType: z.string().min(1, "Select a service type."),
  addressLine: z.string().optional(),
  propertyType: z.string().optional(),
  propertySize: z.string().optional(),
  state: z.string().optional(),
  area: z.string().optional(),
  budgetRange: z.string().optional(),
  preferredStyle: z.string().optional(),
  notes: z.string().optional(),
});

const enquiryUpdateSchema = z.object({
  enquiryId: z.string().min(1, "Enquiry id is required."),
  data: z.object({
    status: z.enum([
      "SUBMITTED",
      "QUOTED",
      "APPROVED",
      "REJECTED",
      "PROJECT_CREATED",
    ]),
    fullName: z.string().min(2, "Name is required."),
    contactEmail: z.string().email("Enter a valid email address."),
    contactPhone: z.string().min(7, "Enter a valid phone number."),
    serviceType: z.string().optional(),
    addressLine: z.string().nullable().optional(),
    propertyType: z.string().nullable().optional(),
    propertySize: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    area: z.string().nullable().optional(),
    budgetRange: z.string().nullable().optional(),
    preferredStyle: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  }),
});

function normalizeOptionalText(value: string | null | undefined) {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function createEnquiryAction(
  _: FormState,
  formData: FormData
): Promise<FormState> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return { error: "Please sign in to submit an enquiry." };
  }

  const parsed = enquirySchema.safeParse({
    fullName: getSanitizedFormText(formData, "fullName", {
      allowNewlines: false,
      maxLength: 160,
    }),
    contactEmail: getSanitizedFormText(formData, "contactEmail", {
      allowNewlines: false,
      maxLength: 320,
    }),
    contactPhone: getSanitizedFormText(formData, "contactPhone", {
      allowNewlines: false,
      maxLength: 40,
    }),
    serviceType: getSanitizedFormText(formData, "serviceType", {
      allowNewlines: false,
      maxLength: 100,
    }),
    addressLine: getSanitizedOptionalFormText(formData, "addressLine", {
      maxLength: 255,
    }),
    propertyType: getSanitizedOptionalFormText(formData, "propertyType", {
      allowNewlines: false,
      maxLength: 80,
    }),
    propertySize: getSanitizedOptionalFormText(formData, "propertySize", {
      allowNewlines: false,
      maxLength: 80,
    }),
    state: getSanitizedOptionalFormText(formData, "state", {
      allowNewlines: false,
      maxLength: 80,
    }),
    area: getSanitizedOptionalFormText(formData, "area", {
      allowNewlines: false,
      maxLength: 120,
    }),
    budgetRange: getSanitizedOptionalFormText(formData, "budgetRange", {
      allowNewlines: false,
      maxLength: 80,
    }),
    preferredStyle: getSanitizedOptionalFormText(formData, "preferredStyle", {
      allowNewlines: false,
      maxLength: 80,
    }),
    notes: getSanitizedOptionalFormText(formData, "notes", {
      maxLength: 5000,
    }),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const enquiry = await prisma.enquiry.create({
    data: {
      clientId: currentUser.id,
      ...parsed.data,
    },
  });

  const floorPlan = formData.get("floorPlan");
  if (floorPlan instanceof File && floorPlan.size > 0) {
    const stored = await saveUploadedFile(floorPlan, "enquiries");
    await prisma.enquiryFile.create({
      data: {
        enquiryId: enquiry.id,
        fileName: stored.fileName,
        fileUrl: stored.url,
        sha256: stored.sha256,
      },
    });
  }

  await notifyAdmins(
    "New enquiry submitted",
    `${enquiry.fullName} submitted a ${enquiry.serviceType ?? "service"} enquiry.`
  );

  revalidatePath("/portal/enquiries");

  return {
    success: true,
    enquiryId: enquiry.id,
    message: "Enquiry submitted successfully.",
  };
}

export async function updateEnquiryAction(input: {
  enquiryId: string;
  data: {
    status: string;
    fullName: string;
    contactEmail: string;
    contactPhone: string;
    serviceType?: string;
    addressLine?: string | null;
    propertyType?: string | null;
    propertySize?: string | null;
    state?: string | null;
    area?: string | null;
    budgetRange?: string | null;
    preferredStyle?: string | null;
    notes?: string | null;
  };
}): Promise<ActionResult> {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return { error: "Admin access required." };
  }

  const parsed = enquiryUpdateSchema.safeParse({
    enquiryId: sanitizeTextInput(input.enquiryId, {
      allowNewlines: false,
      maxLength: 128,
    }),
    data: {
      status: sanitizeTextInput(input.data.status, {
        allowNewlines: false,
        maxLength: 32,
      }),
      fullName: sanitizeTextInput(input.data.fullName, {
        allowNewlines: false,
        maxLength: 160,
      }),
      contactEmail: sanitizeTextInput(input.data.contactEmail, {
        allowNewlines: false,
        maxLength: 320,
      }),
      contactPhone: sanitizeTextInput(input.data.contactPhone, {
        allowNewlines: false,
        maxLength: 40,
      }),
      serviceType: input.data.serviceType
        ? sanitizeTextInput(input.data.serviceType, {
            allowNewlines: false,
            maxLength: 100,
          })
        : undefined,
      addressLine:
        input.data.addressLine === null
          ? null
          : sanitizeTextInput(input.data.addressLine, { maxLength: 255 }) || null,
      propertyType:
        input.data.propertyType === null
          ? null
          : sanitizeTextInput(input.data.propertyType, {
              allowNewlines: false,
              maxLength: 80,
            }) || null,
      propertySize:
        input.data.propertySize === null
          ? null
          : sanitizeTextInput(input.data.propertySize, {
              allowNewlines: false,
              maxLength: 80,
            }) || null,
      state:
        input.data.state === null
          ? null
          : sanitizeTextInput(input.data.state, {
              allowNewlines: false,
              maxLength: 80,
            }) || null,
      area:
        input.data.area === null
          ? null
          : sanitizeTextInput(input.data.area, {
              allowNewlines: false,
              maxLength: 120,
            }) || null,
      budgetRange:
        input.data.budgetRange === null
          ? null
          : sanitizeTextInput(input.data.budgetRange, {
              allowNewlines: false,
              maxLength: 80,
            }) || null,
      preferredStyle:
        input.data.preferredStyle === null
          ? null
          : sanitizeTextInput(input.data.preferredStyle, {
              allowNewlines: false,
              maxLength: 80,
            }) || null,
      notes:
        input.data.notes === null
          ? null
          : sanitizeTextInput(input.data.notes, { maxLength: 5000 }) || null,
    },
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { enquiryId, data } = parsed.data;

  const existing = await prisma.enquiry.findUnique({
    where: { id: enquiryId },
    select: { id: true },
  });

  if (!existing) {
    return { error: "Enquiry not found." };
  }

  try {
    await prisma.enquiry.update({
      where: { id: enquiryId },
      data: {
        status: data.status,
        fullName: data.fullName.trim(),
        contactEmail: data.contactEmail.trim(),
        contactPhone: data.contactPhone.trim(),
        serviceType: normalizeOptionalText(data.serviceType),
        addressLine: normalizeOptionalText(data.addressLine),
        propertyType: normalizeOptionalText(data.propertyType),
        propertySize: normalizeOptionalText(data.propertySize),
        state: normalizeOptionalText(data.state),
        area: normalizeOptionalText(data.area),
        budgetRange: normalizeOptionalText(data.budgetRange),
        preferredStyle: normalizeOptionalText(data.preferredStyle),
        notes: normalizeOptionalText(data.notes),
      },
    });
  } catch (error) {
    return { error: (error as Error).message || "Failed to update enquiry." };
  }

  revalidatePath("/portal/enquiries");
  return { message: "Enquiry updated." };
}

export async function deleteEnquiryAction(enquiryId: string): Promise<ActionResult> {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return { error: "Admin access required." };
  }

  const sanitizedEnquiryId = sanitizeTextInput(enquiryId, {
    allowNewlines: false,
    maxLength: 128,
  });

  if (!sanitizedEnquiryId) {
    return { error: "Enquiry id is required." };
  }

  const enquiry = await prisma.enquiry.findUnique({
    where: { id: sanitizedEnquiryId },
    select: { id: true, project: { select: { id: true } } },
  });

  if (!enquiry) {
    return { error: "Enquiry not found." };
  }

  if (enquiry.project) {
    return {
      error: "This enquiry has a linked project. Delete the project first.",
    };
  }

  try {
    await prisma.$transaction([
      prisma.enquiryFile.deleteMany({ where: { enquiryId: sanitizedEnquiryId } }),
      prisma.enquiry.delete({ where: { id: sanitizedEnquiryId } }),
    ]);
  } catch (error) {
    return { error: (error as Error).message || "Failed to delete enquiry." };
  }

  revalidatePath("/portal/enquiries");
  return { message: "Enquiry deleted." };
}

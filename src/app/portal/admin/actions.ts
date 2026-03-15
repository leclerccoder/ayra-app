"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import {
  createLocalWallet,
  deployEscrowContract,
  fundWallet,
  getCompanyWallet,
} from "@/lib/blockchain";
import { notifyUsers } from "@/lib/notifications";
import { ensureUserWallet } from "@/lib/userWallet";
import { assertAdminMfa } from "@/lib/mfa";
import { processReviewTimeouts } from "@/lib/reviewTimeout";
import { indexChainEvents } from "@/lib/chainIndex";
import { sendEmail } from "@/lib/email";
import { quotedAmountSchema } from "@/lib/formValidation";
import { deriveInviteCode, hashInviteToken } from "@/lib/adminInvite";
import {
  DEFAULT_SERVICE_TYPES,
  designerMatchesServiceType,
  getAcceptedDesignerTypesForService,
  getRequiredDesignerTypeForService,
  normalizeDesignerTypes,
} from "@/lib/portalOptions";
import {
  getSanitizedFormText,
  getSanitizedOptionalFormText,
  sanitizeForwardedProtocol,
  sanitizeHostHeader,
  sanitizeStringArray,
  sanitizeTextInput,
} from "@/lib/inputSecurity";
import { getFirstPasswordPolicyError } from "@/lib/passwordPolicy";
import { Prisma, UserRole } from "@prisma/client";

type FormState = {
  error?: string;
  message?: string;
  projectId?: string;
};

export type ReviewTimeoutActionState = {
  error?: string;
  message?: string;
  releasedProjects: {
    projectId: string;
    title: string;
    clientName: string;
    reviewDueAt: string | null;
    txHash: string;
  }[];
  skippedProjects: {
    projectId: string;
    title: string;
    clientName: string;
    reviewDueAt: string | null;
    reason: string;
  }[];
};

export type ChainIndexActionState = {
  error?: string;
  message?: string;
  projectResults: {
    projectId: string;
    title: string;
    status: string;
    escrowAddress: string;
    newEventCount: number;
    newEvents: {
      eventName: string;
      txHash: string;
      blockNumber: number | null;
    }[];
    error?: string;
  }[];
};

const projectSchema = z.object({
  enquiryId: z.string().min(1),
  title: z.string().min(2, "Project title is required."),
  quotedAmount: quotedAmountSchema,
  designerId: z.string().optional(),
});

const inviteSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  role: z.enum(["ADMIN", "DESIGNER"]),
});

const updateDesignerProfileSchema = z.object({
  userId: z.string().trim().min(1, "Designer id is required."),
  name: z.string().trim().min(2, "Designer name must be at least 2 characters."),
  designerTypes: z.array(z.string()).default([]),
});

const serviceTypeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Service type must be at least 2 characters.")
    .max(80, "Service type is too long."),
});

const createClientSchema = z
  .object({
    name: z.string().trim().min(2, "Client name must be at least 2 characters."),
    email: z.string().trim().email("Enter a valid email address."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(128, "Password is too long."),
    confirmPassword: z.string().min(8, "Please confirm the password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

const updateClientSchema = z.object({
  clientId: z.string().min(1, "Client id is required."),
  name: z.string().trim().min(2, "Client name must be at least 2 characters."),
  email: z.string().trim().email("Enter a valid email address."),
});

const bulkDeleteClientsSchema = z
  .array(z.string().trim().min(1))
  .min(1, "Select at least one client to delete.");

const INVITE_TTL_DAYS = Number(process.env.ADMIN_INVITE_TTL_DAYS ?? "7");

async function getAvailableDesignerTypeOptions() {
  const serviceTypes = await prisma.serviceType.findMany({
    orderBy: [{ name: "asc" }],
    select: { name: true },
  });

  return serviceTypes.length > 0
    ? serviceTypes.map((serviceType) => serviceType.name)
    : DEFAULT_SERVICE_TYPES.map((serviceType) => serviceType.name);
}

function validateDesignerTypes(
  values: string[],
  availableDesignerTypes: string[],
  options?: { required?: boolean }
) {
  const normalizedValues = normalizeDesignerTypes(values);
  const validatedValues = normalizeDesignerTypes(values, availableDesignerTypes);

  if (options?.required && validatedValues.length === 0) {
    return { error: "Select at least one designer type.", designerTypes: [] as string[] };
  }

  if (normalizedValues.length !== validatedValues.length) {
    return { error: "Select valid designer types from the current service list.", designerTypes: [] as string[] };
  }

  return { designerTypes: validatedValues };
}

async function getAppUrl() {
  const configuredBase = (process.env.APP_URL ?? "").trim();
  let configuredOrigin = "";
  let configuredHost: string | null = null;

  if (configuredBase) {
    try {
      const parsed = new URL(configuredBase);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        const safeHost = sanitizeHostHeader(parsed.host);
        if (safeHost) {
          configuredHost = safeHost;
          configuredOrigin = `${parsed.protocol}//${safeHost}`;
        }
      }
    } catch {
      configuredOrigin = "";
      configuredHost = null;
    }
  }

  const configuredIsLocal =
    !configuredOrigin ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configuredOrigin);

  const requestHeaders = await headers();
  const forwardedHost = sanitizeHostHeader(
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")
  );
  const forwardedProto = sanitizeForwardedProtocol(
    requestHeaders.get("x-forwarded-proto")
  );

  if (
    forwardedHost &&
    (configuredIsLocal ||
      forwardedHost.endsWith("trycloudflare.com") ||
      forwardedHost === configuredHost)
  ) {
    const protocol =
      forwardedProto ??
      (forwardedHost.startsWith("localhost") || forwardedHost.startsWith("127.0.0.1")
        ? "http"
        : "https");
    return `${protocol}://${forwardedHost}`;
  }

  if (configuredOrigin) {
    return configuredOrigin;
  }

  return "http://localhost:3000";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getRoleLabel(role: UserRole) {
  return role === "ADMIN" ? "Admin" : "Designer";
}

export async function createProjectAction(
  _: FormState,
  formData: FormData
): Promise<FormState> {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return { error: "Admin access required." };
  }

  try {
    await assertAdminMfa(formData, currentUser, "create_project");
  } catch (error) {
    return { error: (error as Error).message };
  }

  const adminUser = await ensureUserWallet(currentUser.id);
  const adminWalletKey = adminUser.walletPrivateKey;
  if (!adminWalletKey) {
    return { error: "Admin wallet not available." };
  }

  const parsed = projectSchema.safeParse({
    enquiryId: getSanitizedFormText(formData, "enquiryId", {
      allowNewlines: false,
      maxLength: 128,
    }),
    title: getSanitizedFormText(formData, "title", {
      allowNewlines: false,
      maxLength: 160,
    }),
    quotedAmount: getSanitizedFormText(formData, "quotedAmount", {
      allowNewlines: false,
      maxLength: 32,
    }),
    designerId: getSanitizedOptionalFormText(formData, "designerId", {
      allowNewlines: false,
      maxLength: 128,
    }),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const enquiry = await prisma.enquiry.findUnique({
    where: { id: parsed.data.enquiryId },
  });

  if (!enquiry) {
    return { error: "Enquiry not found." };
  }

  const quotedAmount = new Prisma.Decimal(parsed.data.quotedAmount);
  const depositAmount = quotedAmount.mul(new Prisma.Decimal("0.5"));
  const balanceAmount = quotedAmount.minus(depositAmount);
  const acceptedDesignerTypes = getAcceptedDesignerTypesForService(enquiry.serviceType);
  const requiredDesignerType = getRequiredDesignerTypeForService(enquiry.serviceType);

  let assignedDesignerId = parsed.data.designerId ?? null;
  let assignedDesigner:
    | { id: string; name: string; designerTypes: string[]; role: UserRole }
    | null = null;

  if (assignedDesignerId) {
    assignedDesigner = await prisma.user.findUnique({
      where: { id: assignedDesignerId },
      select: {
        id: true,
        name: true,
        role: true,
        designerTypes: true,
      },
    });

    if (!assignedDesigner || assignedDesigner.role !== "DESIGNER") {
      return { error: "Selected designer was not found." };
    }

    if (!designerMatchesServiceType(enquiry.serviceType, assignedDesigner.designerTypes)) {
      return {
        error: `The selected service requires a ${requiredDesignerType} designer. Choose a matching designer or leave the field on auto-assign.`,
      };
    }
  }

  if (!assignedDesignerId && acceptedDesignerTypes.length > 0) {
    assignedDesigner = await prisma.user.findFirst({
      where: {
        role: "DESIGNER",
        designerTypes: { hasSome: acceptedDesignerTypes },
      },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        role: true,
        designerTypes: true,
      },
    });

    if (!assignedDesigner) {
      return {
        error: `No ${requiredDesignerType} designer is currently available for the selected service.`,
      };
    }

    assignedDesignerId = assignedDesigner.id;
  }

  const client = await ensureUserWallet(enquiry.clientId);
  if (!client.walletAddress) {
    return { error: "Client wallet not available." };
  }

  const companyWallet = getCompanyWallet();
  const deployResult = await deployEscrowContract({
    clientAddress: client.walletAddress,
    companyAddress: companyWallet.address,
    adminPrivateKey: adminWalletKey,
    depositAmount: depositAmount.toString(),
    balanceAmount: balanceAmount.toString(),
  });

  const project = await prisma.project.create({
    data: {
      enquiryId: enquiry.id,
      clientId: enquiry.clientId,
      adminId: currentUser.id,
      designerId: assignedDesignerId,
      title: parsed.data.title,
      quotedAmount,
      depositAmount,
      balanceAmount,
      status: "DRAFT",
      escrowAddress: deployResult.address,
      chainId: deployResult.chainId,
      timeline: {
        create: {
          actorId: currentUser.id,
          eventType: "PROJECT_CREATED",
          message: "Project created from enquiry.",
        },
      },
    },
  });

  const notifyTargets = [enquiry.clientId];
  if (assignedDesignerId) {
    notifyTargets.push(assignedDesignerId);
  }
  await notifyUsers(
    notifyTargets,
    "Project created",
    `Escrow project "${project.title}" has been created with a 50/50 payment plan.`
  );

  await prisma.enquiry.update({
    where: { id: enquiry.id },
    data: { status: "PROJECT_CREATED" },
  });

  revalidatePath("/portal/admin");
  revalidatePath("/portal/enquiries");
  revalidatePath("/portal/projects");

  return {
    message: `Project "${project.title}" created successfully.`,
    projectId: project.id,
  };
}

export async function runReviewTimeoutAction(
  _: FormState,
  formData: FormData
): Promise<ReviewTimeoutActionState> {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return {
      error: "Admin access required.",
      releasedProjects: [],
      skippedProjects: [],
    };
  }

  try {
    await assertAdminMfa(formData, currentUser, "review_timeout");
  } catch (error) {
    return {
      error: (error as Error).message,
      releasedProjects: [],
      skippedProjects: [],
    };
  }

  const result = await processReviewTimeouts();
  revalidatePath("/portal/admin");
  return {
    message: `Review timeout processed. Released: ${result.processed}, skipped: ${result.skipped}.`,
    releasedProjects: result.releasedProjects,
    skippedProjects: result.skippedProjects,
  };
}

export async function indexChainEventsAction(
  _: FormState,
  formData: FormData
): Promise<ChainIndexActionState> {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return { error: "Admin access required.", projectResults: [] };
  }

  try {
    await assertAdminMfa(formData, currentUser, "index_chain_events");
  } catch (error) {
    return { error: (error as Error).message, projectResults: [] };
  }

  const result = await indexChainEvents();
  revalidatePath("/portal/admin");
  return {
    message: `Chain indexing complete. Scanned: ${result.scanned}, new events: ${result.indexed}.`,
    projectResults: result.projectResults,
  };
}

export async function inviteAdminAction(
  _: FormState,
  formData: FormData
): Promise<FormState> {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return { error: "Admin access required." };
  }

  const parsed = inviteSchema.safeParse({
    email: getSanitizedFormText(formData, "email", {
      allowNewlines: false,
      maxLength: 320,
    }),
    role: getSanitizedFormText(formData, "role", {
      allowNewlines: false,
      maxLength: 16,
    }),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const inviteRole = parsed.data.role;
  const availableDesignerTypes = await getAvailableDesignerTypeOptions();
  const rawDesignerTypes = sanitizeStringArray(formData.getAll("designerTypes"), {
    allowNewlines: false,
    maxLength: 80,
  });
  const designerTypeValidation = validateDesignerTypes(rawDesignerTypes, availableDesignerTypes, {
    required: inviteRole === "DESIGNER",
  });
  if (designerTypeValidation.error) {
    return { error: designerTypeValidation.error };
  }

  const designerTypes =
    inviteRole === "DESIGNER" ? designerTypeValidation.designerTypes : [];
  const roleLabel = getRoleLabel(inviteRole);
  const existingRoleUser = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, role: inviteRole },
  });

  if (existingRoleUser) {
    return { error: `This email already belongs to a ${roleLabel.toLowerCase()}.` };
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashInviteToken(token);
  const invitationCode = deriveInviteCode(token);
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  const existingInvite = await prisma.adminInvite.findFirst({
    where: { email, role: inviteRole, acceptedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (existingInvite) {
    await prisma.adminInvite.update({
      where: { id: existingInvite.id },
      data: {
        tokenHash,
        role: inviteRole,
        designerTypes,
        invitedById: currentUser.id,
        expiresAt,
        acceptedAt: null,
        acceptedUserId: null,
      },
    });
  } else {
    await prisma.adminInvite.create({
      data: {
        email,
        role: inviteRole,
        designerTypes,
        tokenHash,
        invitedById: currentUser.id,
        expiresAt,
      },
    });
  }

  const inviteUrl = `${await getAppUrl()}/portal/admin-invite/${token}`;
  const escapedInviter = escapeHtml(currentUser.name);
  const escapedEmail = escapeHtml(email);
  const escapedInviteUrl = escapeHtml(inviteUrl);

  const destinationLabel =
    inviteRole === "ADMIN" ? "admin console" : "designer workspace";
  const designerTypesLabel = designerTypes.join(", ");
  const designerTypeSentence =
    inviteRole === "DESIGNER" && designerTypesLabel
      ? `\nDesigner types: ${designerTypesLabel}\n`
      : "";
  const designerTypeHtml =
    inviteRole === "DESIGNER" && designerTypesLabel
      ? `<p style="margin:8px 0 0;font-size:13px;line-height:1.5;color:#64748b;">Designer types: ${escapeHtml(designerTypesLabel)}</p>`
      : "";

  try {
    await sendEmail({
      to: email,
      subject: `You're invited to Ayra ${roleLabel}`,
      text:
        `You have been invited to join Ayra as a ${roleLabel.toLowerCase()} by ${currentUser.name}.\n\n` +
        designerTypeSentence +
        `Invitation code: ${invitationCode}\n\n` +
        `Accept your invite:\n${inviteUrl}\n\n` +
        `On the invite page, fill in your username, password, and this invitation code.\n` +
        `You will be signed in to the ${destinationLabel} after successful setup.\n` +
        `This link expires in ${INVITE_TTL_DAYS} days.`,
      html: `
        <div style="margin:0;padding:24px;background:#f8fafc;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;background:linear-gradient(135deg,#0f172a,#1e293b);color:#f8fafc;">
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.8;">Ayra Portal</p>
                <h1 style="margin:0;font-size:24px;line-height:1.2;">${roleLabel} Invitation</h1>
                <p style="margin:12px 0 0;font-size:15px;line-height:1.5;color:#cbd5e1;">
                  ${escapedInviter} invited you to join Ayra as a ${roleLabel.toLowerCase()}.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#334155;">
                  This invitation is linked to <strong>${escapedEmail}</strong>. Use the code below when completing account setup.
                </p>
                <div style="margin:0 0 18px;padding:16px;border:1px dashed #cbd5e1;border-radius:12px;background:#f8fafc;text-align:center;">
                  <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Invitation code</p>
                  <p style="margin:0;font-size:34px;line-height:1;font-weight:700;letter-spacing:0.2em;color:#0f172a;">${invitationCode}</p>
                </div>
                <div style="margin:0 0 16px;">
                  <a href="${escapedInviteUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:600;">
                    Accept invitation
                  </a>
                </div>
                <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#64748b;">
                  Link: <a href="${escapedInviteUrl}" style="color:#0f172a;">${escapedInviteUrl}</a>
                </p>
                <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">
                  Expires in ${INVITE_TTL_DAYS} day${INVITE_TTL_DAYS === 1 ? "" : "s"}.
                </p>
                ${designerTypeHtml}
                <p style="margin:8px 0 0;font-size:13px;line-height:1.5;color:#64748b;">
                  Destination: ${destinationLabel}
                </p>
              </td>
            </tr>
          </table>
        </div>
      `,
    });
  } catch (error) {
    return {
      error:
        (error as Error).message ||
        "Failed to send invite email. Please check SMTP configuration.",
    };
  }

  return {
    message: `${roleLabel} invitation sent to ${email}.`,
  };
}

export async function addServiceTypeAction(
  _: FormState,
  formData: FormData
): Promise<FormState> {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return { error: "Admin access required." };
  }

  const parsed = serviceTypeSchema.safeParse({
    name: getSanitizedFormText(formData, "name", {
      allowNewlines: false,
      maxLength: 80,
    }),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const name = parsed.data.name.trim();
  const existing = await prisma.serviceType.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });

  if (existing) {
    return { error: "This service type already exists." };
  }

  await prisma.serviceType.create({
    data: { name },
  });

  revalidatePath("/portal/admin");
  revalidatePath("/portal/enquiries/new");
  return { message: `Service type "${name}" added.` };
}

export async function deleteServiceTypeAction(serviceTypeId: string): Promise<FormState> {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return { error: "Admin access required." };
  }

  const sanitizedServiceTypeId = sanitizeTextInput(serviceTypeId, {
    allowNewlines: false,
    maxLength: 128,
  });

  if (!sanitizedServiceTypeId) {
    return { error: "Service type id is required." };
  }

  const serviceTypeCount = await prisma.serviceType.count();
  if (serviceTypeCount <= 1) {
    return { error: "Keep at least one service type available for enquiries." };
  }

  try {
    const serviceType = await prisma.serviceType.findUnique({
      where: { id: sanitizedServiceTypeId },
      select: { id: true, name: true },
    });

    if (!serviceType) {
      return { error: "Service type not found." };
    }

    await prisma.$transaction([
      prisma.$executeRaw`
        UPDATE "User"
        SET "designerTypes" = array_remove("designerTypes", ${serviceType.name})
        WHERE ${serviceType.name} = ANY("designerTypes")
      `,
      prisma.$executeRaw`
        UPDATE "AdminInvite"
        SET "designerTypes" = array_remove("designerTypes", ${serviceType.name})
        WHERE ${serviceType.name} = ANY("designerTypes")
      `,
      prisma.serviceType.delete({ where: { id: sanitizedServiceTypeId } }),
    ]);
  } catch (error) {
    return { error: (error as Error).message || "Failed to delete service type." };
  }

  revalidatePath("/portal/admin");
  revalidatePath("/portal/enquiries/new");
  return { message: "Service type removed." };
}

export async function deleteAdminInviteAction(inviteId: string): Promise<FormState> {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return { error: "Admin access required." };
  }

  const sanitizedInviteId = sanitizeTextInput(inviteId, {
    allowNewlines: false,
    maxLength: 128,
  });

  if (!sanitizedInviteId) {
    return { error: "Invitation id is required." };
  }

  try {
    await prisma.adminInvite.delete({ where: { id: sanitizedInviteId } });
  } catch (error) {
    return { error: (error as Error).message || "Failed to delete invitation." };
  }

  revalidatePath("/portal/admin/invites");
  return { message: "Invitation deleted." };
}

async function deleteTeamUserAction(
  userId: string,
  role: "ADMIN" | "DESIGNER"
): Promise<FormState> {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return { error: "Admin access required." };
  }

  const sanitizedUserId = sanitizeTextInput(userId, {
    allowNewlines: false,
    maxLength: 128,
  });

  if (!sanitizedUserId) {
    return { error: "User id is required." };
  }

  if (role === "ADMIN" && sanitizedUserId === currentUser.id) {
    return { error: "You cannot delete your own account." };
  }

  const roleLabel = getRoleLabel(role);

  if (role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return { error: "You cannot delete the last admin account." };
    }
  }

  const target = await prisma.user.findUnique({
    where: { id: sanitizedUserId },
    select: {
      id: true,
      role: true,
      _count: {
        select: {
          enquiries: true,
          projectsAsClient: true,
          projectsAsDesigner: true,
          projectsAsAdmin: true,
          drafts: true,
          draftComments: true,
          disputesOpened: true,
          disputesDecided: true,
          disputeFiles: true,
          timelineEvents: true,
        },
      },
    },
  });

  if (!target || target.role !== role) {
    return { error: `${roleLabel} user not found.` };
  }

  const detachableLinks =
    target._count.projectsAsAdmin +
    target._count.projectsAsDesigner +
    target._count.disputesDecided +
    target._count.timelineEvents;
  const reassignedLinks =
    target._count.drafts +
    target._count.draftComments +
    target._count.disputesOpened +
    target._count.disputeFiles;
  const adminDetachLinks =
    target._count.projectsAsAdmin +
    target._count.disputesDecided +
    target._count.timelineEvents;
  const unsafeLinks = target._count.enquiries + target._count.projectsAsClient;

  if (unsafeLinks > 0) {
    return {
      error: `This ${roleLabel.toLowerCase()} is linked to client-owned records and cannot be deleted automatically.`,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (target._count.projectsAsAdmin > 0) {
        await tx.project.updateMany({
          where: { adminId: sanitizedUserId },
          data: { adminId: null },
        });
      }

      if (target._count.projectsAsDesigner > 0) {
        await tx.project.updateMany({
          where: { designerId: sanitizedUserId },
          data: { designerId: null },
        });
      }

      if (target._count.disputesDecided > 0) {
        await tx.dispute.updateMany({
          where: { decidedById: sanitizedUserId },
          data: { decidedById: null },
        });
      }

      if (target._count.timelineEvents > 0) {
        await tx.timelineEvent.updateMany({
          where: { actorId: sanitizedUserId },
          data: { actorId: null },
        });
      }

      if (target._count.drafts > 0) {
        await tx.draft.updateMany({
          where: { uploadedById: sanitizedUserId },
          data: { uploadedById: currentUser.id },
        });
      }

      if (target._count.draftComments > 0) {
        await tx.draftComment.updateMany({
          where: { authorId: sanitizedUserId },
          data: { authorId: currentUser.id },
        });
      }

      if (target._count.disputesOpened > 0) {
        await tx.dispute.updateMany({
          where: { openedById: sanitizedUserId },
          data: { openedById: currentUser.id },
        });
      }

      if (target._count.disputeFiles > 0) {
        await tx.disputeFile.updateMany({
          where: { uploadedById: sanitizedUserId },
          data: { uploadedById: currentUser.id },
        });
      }

      await tx.session.deleteMany({ where: { userId: sanitizedUserId } });
      await tx.mfaCode.deleteMany({ where: { userId: sanitizedUserId } });
      await tx.passwordResetToken.deleteMany({ where: { userId: sanitizedUserId } });
      await tx.notification.deleteMany({ where: { userId: sanitizedUserId } });
      await tx.adminInvite.deleteMany({ where: { invitedById: sanitizedUserId } });
      await tx.adminInvite.updateMany({
        where: { acceptedUserId: sanitizedUserId },
        data: { acceptedUserId: null },
      });
      await tx.user.delete({ where: { id: sanitizedUserId } });
    });
  } catch (error) {
    return { error: (error as Error).message || "Failed to delete user." };
  }

  revalidatePath("/portal/admin/invites");
  revalidatePath("/portal/admin");
  if (detachableLinks > 0 || reassignedLinks > 0) {
    const detailParts = [
      target._count.projectsAsAdmin + target._count.projectsAsDesigner > 0
        ? `${target._count.projectsAsAdmin + target._count.projectsAsDesigner} project assignment(s) removed`
        : null,
      target._count.timelineEvents > 0
        ? `${target._count.timelineEvents} timeline actor record(s) detached`
        : null,
      target._count.disputesDecided > 0
        ? `${target._count.disputesDecided} dispute decision record(s) detached`
        : null,
      reassignedLinks > 0
        ? `${reassignedLinks} authored record(s) preserved under the current admin`
        : null,
    ].filter(Boolean);

    if (role === "ADMIN" && adminDetachLinks > 0 && reassignedLinks === 0) {
      return {
        message: `Admin deleted. ${detailParts.join(", ")}.`,
      };
    }

    return {
      message: `${roleLabel} user deleted. ${detailParts.join(", ")}.`,
    };
  }

  return { message: `${roleLabel} user deleted.` };
}

export async function deleteAdminUserAction(userId: string): Promise<FormState> {
  return deleteTeamUserAction(userId, "ADMIN");
}

export async function deleteDesignerUserAction(userId: string): Promise<FormState> {
  return deleteTeamUserAction(userId, "DESIGNER");
}

export async function updateDesignerProfileAction(input: {
  userId: string;
  name: string;
  designerTypes: string[];
}): Promise<FormState> {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return { error: "Admin access required." };
  }

  const parsed = updateDesignerProfileSchema.safeParse({
    userId: sanitizeTextInput(input.userId, {
      allowNewlines: false,
      maxLength: 128,
    }),
    name: sanitizeTextInput(input.name, {
      allowNewlines: false,
      maxLength: 160,
    }),
    designerTypes: sanitizeStringArray(input.designerTypes, {
      allowNewlines: false,
      maxLength: 80,
    }),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const designer = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, role: true },
  });

  if (!designer || designer.role !== "DESIGNER") {
    return { error: "Designer not found." };
  }

  const availableDesignerTypes = await getAvailableDesignerTypeOptions();
  const designerTypeValidation = validateDesignerTypes(
    parsed.data.designerTypes,
    availableDesignerTypes
  );

  if (designerTypeValidation.error) {
    return { error: designerTypeValidation.error };
  }

  await prisma.user.update({
    where: { id: designer.id },
    data: {
      name: parsed.data.name.trim(),
      designerTypes: designerTypeValidation.designerTypes,
    },
  });

  revalidatePath("/portal/admin/invites");
  revalidatePath("/portal/admin");
  revalidatePath("/portal/enquiries");
  return { message: "Designer updated." };
}

export async function createClientAccountAction(
  _: FormState,
  formData: FormData
): Promise<FormState> {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return { error: "Admin access required." };
  }

  const parsed = createClientSchema.safeParse({
    name: getSanitizedFormText(formData, "name", {
      allowNewlines: false,
      maxLength: 160,
    }),
    email: getSanitizedFormText(formData, "email", {
      allowNewlines: false,
      maxLength: 320,
    }),
    password: getSanitizedFormText(formData, "password", {
      trim: false,
      allowNewlines: false,
      normalizeUnicode: false,
      maxLength: 128,
    }),
    confirmPassword: getSanitizedFormText(formData, "confirmPassword", {
      trim: false,
      allowNewlines: false,
      normalizeUnicode: false,
      maxLength: 128,
    }),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const passwordPolicyError = getFirstPasswordPolicyError(parsed.data.password);
  if (passwordPolicyError) {
    return { error: passwordPolicyError };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });

  if (existingUser) {
    return { error: "A user with this email already exists." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const wallet = createLocalWallet();

  await prisma.user.create({
    data: {
      name: parsed.data.name.trim(),
      email,
      passwordHash,
      role: "CLIENT",
      emailVerified: true,
      walletAddress: wallet.address,
      walletPrivateKey: wallet.privateKey,
    },
  });

  try {
    await fundWallet(wallet.address, "2.0");
  } catch (error) {
    console.warn("Wallet funding failed:", error);
  }

  revalidatePath("/portal/admin/clients");
  return { message: `Client account created for ${email}.` };
}

export async function updateClientAccountAction(input: {
  clientId: string;
  name: string;
  email: string;
}): Promise<FormState> {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return { error: "Admin access required." };
  }

  const parsed = updateClientSchema.safeParse({
    clientId: sanitizeTextInput(input.clientId, {
      allowNewlines: false,
      maxLength: 128,
    }),
    name: sanitizeTextInput(input.name, {
      allowNewlines: false,
      maxLength: 160,
    }),
    email: sanitizeTextInput(input.email, {
      allowNewlines: false,
      maxLength: 320,
    }),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const client = await prisma.user.findUnique({
    where: { id: parsed.data.clientId },
    select: { id: true, role: true, email: true },
  });

  if (!client || client.role !== "CLIENT") {
    return { error: "Client not found." };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const duplicate = await prisma.user.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      id: { not: client.id },
    },
    select: { id: true },
  });

  if (duplicate) {
    return { error: "Another user already uses this email." };
  }

  await prisma.user.update({
    where: { id: client.id },
    data: {
      name: parsed.data.name.trim(),
      email,
    },
  });

  revalidatePath("/portal/admin/clients");
  return { message: "Client updated successfully." };
}

async function deleteClientAccountById(clientId: string): Promise<FormState> {
  const sanitizedClientId = sanitizeTextInput(clientId, {
    allowNewlines: false,
    maxLength: 128,
  });

  if (!sanitizedClientId) {
    return { error: "Client id is required." };
  }

  const client = await prisma.user.findUnique({
    where: { id: sanitizedClientId },
    select: {
      id: true,
      role: true,
      archivedAt: true,
      _count: {
        select: {
          enquiries: true,
          projectsAsClient: true,
          drafts: true,
          disputesOpened: true,
          disputeFiles: true,
          timelineEvents: true,
        },
      },
    },
  });

  if (!client || client.role !== "CLIENT") {
    return { error: "Client not found." };
  }

  if (client.archivedAt) {
    return { error: "This client has already been archived." };
  }

  const linkedRecords =
    client._count.enquiries +
    client._count.projectsAsClient +
    client._count.drafts +
    client._count.disputesOpened +
    client._count.disputeFiles +
    client._count.timelineEvents;

  try {
    if (linkedRecords > 0) {
      const archivedAt = new Date();
      const archivedPasswordHash = await hashPassword(crypto.randomUUID());

      await prisma.$transaction([
        prisma.session.deleteMany({ where: { userId: client.id } }),
        prisma.mfaCode.deleteMany({ where: { userId: client.id } }),
        prisma.passwordResetToken.deleteMany({ where: { userId: client.id } }),
        prisma.notification.deleteMany({ where: { userId: client.id } }),
        prisma.user.update({
          where: { id: client.id },
          data: {
            name: `Deleted Client ${client.id.slice(-6)}`,
            email: `deleted-client+${client.id}@ayra.local`,
            passwordHash: archivedPasswordHash,
            emailVerified: false,
            mfaEnabled: false,
            mfaSecret: null,
            walletAddress: null,
            walletPrivateKey: null,
            archivedAt,
          },
        }),
      ]);

      return {
        message: "Client archived and removed from the active client list.",
      };
    }

    await prisma.$transaction([
      prisma.session.deleteMany({ where: { userId: client.id } }),
      prisma.mfaCode.deleteMany({ where: { userId: client.id } }),
      prisma.passwordResetToken.deleteMany({ where: { userId: client.id } }),
      prisma.notification.deleteMany({ where: { userId: client.id } }),
      prisma.user.delete({ where: { id: client.id } }),
    ]);
  } catch (error) {
    return { error: (error as Error).message || "Failed to delete client." };
  }

  return { message: "Client deleted successfully." };
}

export async function deleteClientAccountAction(clientId: string): Promise<FormState> {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return { error: "Admin access required." };
  }

  const result = await deleteClientAccountById(clientId);
  if (result.error) {
    return result;
  }

  revalidatePath("/portal/admin/clients");
  return result;
}

export async function deleteManyClientAccountsAction(
  clientIds: string[]
): Promise<FormState> {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return { error: "Admin access required." };
  }

  const normalizedClientIds = Array.from(
    new Set(
      sanitizeStringArray(clientIds, {
        allowNewlines: false,
        maxLength: 128,
      })
    )
  );

  const parsed = bulkDeleteClientsSchema.safeParse(normalizedClientIds);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid client list." };
  }

  let deletedCount = 0;
  const failureMessages: string[] = [];

  for (const clientId of parsed.data) {
    const result = await deleteClientAccountById(clientId);
    if (result.error) {
      failureMessages.push(result.error);
      continue;
    }
    deletedCount += 1;
  }

  revalidatePath("/portal/admin/clients");

  if (!deletedCount && failureMessages.length) {
    return { error: failureMessages[0] };
  }

  if (!failureMessages.length) {
    return {
      message: `${deletedCount} client account${deletedCount === 1 ? "" : "s"} removed successfully.`,
    };
  }

  return {
    message: `${deletedCount} client account${deletedCount === 1 ? "" : "s"} removed successfully.`,
    error: `${failureMessages.length} client account${failureMessages.length === 1 ? "" : "s"} could not be removed because of linked records or missing data.`,
  };
}

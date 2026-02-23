import Link from "next/link";
import { prisma } from "@/lib/db";
import AdminInviteForm from "./AdminInviteForm";
import { hashInviteToken } from "@/lib/adminInvite";
import { UserRole } from "@prisma/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldCheck } from "lucide-react";

function formatDate(value: Date) {
  return value.toLocaleDateString("en-MY", {
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

export default async function AdminInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Invite link invalid
            </CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/portal/login"
              className="text-primary underline-offset-4 hover:underline"
            >
              Return to sign in
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  const invite = await prisma.adminInvite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    include: { invitedBy: true },
  });

  if (!invite) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Invite link invalid
            </CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/portal/login"
              className="text-primary underline-offset-4 hover:underline"
            >
              Return to sign in
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invite.acceptedAt) {
    const roleLabel = getRoleLabel(invite.role);
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Invitation already used
            </CardTitle>
            <CardDescription>
              This {roleLabel.toLowerCase()} invitation was accepted on{" "}
              {formatDate(invite.acceptedAt)}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/portal/login"
              className="text-primary underline-offset-4 hover:underline"
            >
              Sign in to the admin console
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invite.expiresAt < new Date()) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Invitation expired
            </CardTitle>
            <CardDescription>
              This invite expired on {formatDate(invite.expiresAt)}. Please ask the admin
              to send a new invitation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/portal/login"
              className="text-primary underline-offset-4 hover:underline"
            >
              Return to sign in
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleLabel = getRoleLabel(invite.role);
  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-xl border-2 shadow-xl">
        <CardHeader className="space-y-3 pb-2">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <ShieldCheck className="h-6 w-6" />
            Accept {roleLabel.toLowerCase()} invitation
          </CardTitle>
          <CardDescription className="text-base">
            You were invited by {invite.invitedBy.name} to join as a{" "}
            {roleLabel.toLowerCase()}. Set your credentials and enter the 6-digit
            invitation code sent to
            <span className="font-semibold text-foreground"> {invite.email}</span>.
          </CardDescription>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Expires {formatDate(invite.expiresAt)}</Badge>
            <Badge variant="secondary">Role: {roleLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <AdminInviteForm token={token} />
        </CardContent>
      </Card>
    </div>
  );
}

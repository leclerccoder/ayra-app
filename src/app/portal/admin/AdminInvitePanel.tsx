import { prisma } from "@/lib/db";
import AdminInviteForm from "./AdminInviteForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Users } from "lucide-react";

function formatDate(value: Date | null) {
  if (!value) return "—";
  return value.toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminInvitePanel() {
  const [admins, invites] = await Promise.all([
    prisma.user.findMany({
      where: { role: "ADMIN" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.adminInvite.findMany({
      include: {
        invitedBy: true,
        acceptedUser: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const now = new Date();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Admin Invitations
        </CardTitle>
        <CardDescription>
          Invite new admins and track acceptance status.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <AdminInviteForm />

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <h3 className="text-base font-semibold">Active admins</h3>
            </div>
            <div className="rounded-lg border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground">
                        No admins found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    admins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell className="font-medium">
                          {admin.name}
                        </TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell>{formatDate(admin.createdAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              <h3 className="text-base font-semibold">Invitation tracking</h3>
            </div>
            <div className="rounded-lg border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground">
                        No invitations sent yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    invites.map((invite) => {
                      const isExpired = invite.expiresAt < now;
                      const status = invite.acceptedAt
                        ? "Accepted"
                        : isExpired
                          ? "Expired"
                          : "Pending";
                      const badgeVariant = invite.acceptedAt
                        ? "default"
                        : isExpired
                          ? "secondary"
                          : "outline";

                      return (
                        <TableRow key={invite.id}>
                          <TableCell className="font-medium">
                            {invite.email}
                            <div className="text-xs text-muted-foreground">
                              Invited by {invite.invitedBy.name}
                            </div>
                            {invite.acceptedUser && (
                              <div className="text-xs text-muted-foreground">
                                Accepted by {invite.acceptedUser.name}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={badgeVariant}>{status}</Badge>
                            {invite.acceptedAt && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {formatDate(invite.acceptedAt)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {formatDate(invite.createdAt)}
                            <div className="text-xs text-muted-foreground">
                              Expires {formatDate(invite.expiresAt)}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

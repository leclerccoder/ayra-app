import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, MailCheck, UserPlus2, Users } from "lucide-react";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import AdminClientsManager, { type ClientRow } from "./AdminClientsManager";

export default async function AdminClientsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/portal/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/portal");
  }

  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      createdAt: true,
      _count: {
        select: {
          enquiries: true,
          projectsAsClient: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const verifiedClients = clients.filter((client) => client.emailVerified).length;
  const unverifiedClients = clients.length - verifiedClients;

  const rows: ClientRow[] = clients.map((client) => ({
    id: client.id,
    name: client.name,
    email: client.email,
    emailVerified: client.emailVerified,
    createdAt: client.createdAt.toISOString(),
    enquiriesCount: client._count.enquiries,
    projectsCount: client._count.projectsAsClient,
  }));

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-sky-700 p-8 text-white lg:p-10">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -right-14 -top-14 h-56 w-56 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-20 left-8 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl" />
        </div>

        <div className="relative z-10 space-y-6">
          <Link
            href="/portal/admin"
            className="inline-flex items-center gap-2 text-white/85 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Admin Console</span>
          </Link>

          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
              Client Management
            </h1>
            <p className="max-w-2xl text-lg text-white/85">
              Manage client accounts with full control: create new clients, update
              their profile details, and remove inactive accounts safely.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-white/30 bg-white/10 text-white backdrop-blur-sm">
              <CardContent className="flex items-center gap-3 px-5 py-4">
                <Users className="h-6 w-6" />
                <div>
                  <p className="text-3xl font-bold">{clients.length}</p>
                  <p className="text-sm text-white/75">Total Clients</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-white/30 bg-white/10 text-white backdrop-blur-sm">
              <CardContent className="flex items-center gap-3 px-5 py-4">
                <MailCheck className="h-6 w-6" />
                <div>
                  <p className="text-3xl font-bold">{verifiedClients}</p>
                  <p className="text-sm text-white/75">Verified</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-white/30 bg-white/10 text-white backdrop-blur-sm">
              <CardContent className="flex items-center gap-3 px-5 py-4">
                <UserPlus2 className="h-6 w-6" />
                <div>
                  <p className="text-3xl font-bold">{unverifiedClients}</p>
                  <p className="text-sm text-white/75">Unverified</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AdminClientsManager clients={rows} />
    </div>
  );
}

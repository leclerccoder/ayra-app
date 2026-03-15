import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import AdminProjectForm from "./AdminProjectForm";
import AdminOpsPanel from "./AdminOpsPanel";
import AdminServiceTypeManager from "./AdminServiceTypeManager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, User, Mail } from "lucide-react";

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/portal/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/portal");
  }

  const [enquiries, designers, serviceTypes, reviewTargets, chainTargets] =
    await Promise.all([
      prisma.enquiry.findMany({
        where: { status: { in: ["SUBMITTED", "QUOTED", "APPROVED"] } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        where: { role: "DESIGNER" },
        orderBy: [{ designerType: "asc" }, { name: "asc" }],
      }),
      prisma.serviceType.findMany({
        orderBy: [{ name: "asc" }],
      }),
      prisma.project.findMany({
        where: {
          status: "DRAFT_SUBMITTED",
          reviewDueAt: { lt: new Date() },
          escrowAddress: { not: null },
          escrowPaused: false,
        },
        orderBy: [{ reviewDueAt: "asc" }, { title: "asc" }],
        select: {
          id: true,
          title: true,
          status: true,
          reviewDueAt: true,
          client: {
            select: { name: true },
          },
        },
      }),
      prisma.project.findMany({
        where: { escrowAddress: { not: null } },
        orderBy: [{ title: "asc" }],
        select: {
          id: true,
          title: true,
          status: true,
          escrowAddress: true,
          client: {
            select: { name: true },
          },
          _count: {
            select: { chainEvents: true },
          },
        },
      }),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Admin Console
        </h1>
        <p className="text-muted-foreground">
          Review enquiries, issue quotations, and create escrow projects.
        </p>
      </div>

      <AdminOpsPanel
        reviewTargets={reviewTargets.map((project) => ({
          projectId: project.id,
          title: project.title,
          status: project.status,
          clientName: project.client.name,
          reviewDueAt: project.reviewDueAt?.toISOString() ?? null,
        }))}
        chainTargets={chainTargets.map((project) => ({
          projectId: project.id,
          title: project.title,
          status: project.status,
          clientName: project.client.name,
          escrowAddress: project.escrowAddress ?? "",
          indexedEvents: project._count.chainEvents,
        }))}
      />

      <Card>
        <CardHeader>
          <CardTitle>Service Types</CardTitle>
          <CardDescription>
            Add or remove the enquiry service options shown to portal clients.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminServiceTypeManager
            serviceTypes={serviceTypes.map((serviceType) => ({
              id: serviceType.id,
              name: serviceType.name,
              createdAt: serviceType.createdAt.toISOString(),
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create Project</CardTitle>
          <CardDescription>
            Select an enquiry, assign a designer, and deploy escrow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminProjectForm enquiries={enquiries} designers={designers} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Enquiries</CardTitle>
          <CardDescription>
            {enquiries.length === 0
              ? "No pending enquiries at the moment"
              : `${enquiries.length} enquir${enquiries.length === 1 ? "y" : "ies"} awaiting action`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enquiries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground">No pending enquiries.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {enquiries.map((enquiry) => (
                <div key={enquiry.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {enquiry.serviceType ?? "Service enquiry"}
                        </span>
                        <Badge variant="outline">{enquiry.status}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {enquiry.fullName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {enquiry.contactEmail}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Property: {enquiry.propertyType ?? "TBD"} · Budget:{" "}
                    {enquiry.budgetRange ?? "TBD"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

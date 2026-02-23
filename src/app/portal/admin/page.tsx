import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import AdminProjectForm from "./AdminProjectForm";
import AdminOpsPanel from "./AdminOpsPanel";
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

  const enquiries = await prisma.enquiry.findMany({
    where: { status: { in: ["SUBMITTED", "QUOTED", "APPROVED"] } },
    orderBy: { createdAt: "desc" },
  });

  const designers = await prisma.user.findMany({
    where: { role: "DESIGNER" },
    orderBy: { name: "asc" },
  });

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

      <AdminOpsPanel />

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

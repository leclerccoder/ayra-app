import { redirect } from "next/navigation";
import { Wrench } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import AdminOpsPanel from "../AdminOpsPanel";

export default async function AdminMaintenancePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/portal/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/portal");
  }

  const chainTargets = await prisma.project.findMany({
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
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Wrench className="h-6 w-6" />
          System Maintenance
        </h1>
        <p className="text-muted-foreground">
          Technical recovery and reconciliation tools for the portal and blockchain data.
        </p>
      </div>

      <AdminOpsPanel
        reviewTargets={[]}
        chainTargets={chainTargets.map((project) => ({
          projectId: project.id,
          title: project.title,
          status: project.status,
          clientName: project.client.name,
          escrowAddress: project.escrowAddress ?? "",
          indexedEvents: project._count.chainEvents,
        }))}
        showReviewTimeout={false}
      />
    </div>
  );
}

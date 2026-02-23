import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import DeleteProjectButton from "./DeleteProjectButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink } from "lucide-react";

export default async function ProjectsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/portal/login");
  }

  const projects = await prisma.project.findMany({
    where:
      user.role === "ADMIN"
        ? {}
        : user.role === "DESIGNER"
          ? { designerId: user.id }
          : { clientId: user.id },
    include: {
      _count: {
        select: {
          chainEvents: true,
          timeline: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "outline";
      case "APPROVED":
        return "default";
      case "RELEASED":
        return "secondary";
      case "DISPUTED":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Projects</h1>
          <p className="text-base text-muted-foreground mt-1">
            Track deposits, draft reviews, and escrow releases at a glance.
          </p>
        </div>
        <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
          <Link href="/portal/enquiries">View Enquiries</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Project List</CardTitle>
          <CardDescription className="text-base">
            {projects.length === 0
              ? "No projects yet. Projects are created from approved enquiries."
              : `Showing ${projects.length} project${projects.length === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-lg text-muted-foreground mb-6">No projects yet.</p>
              <Button asChild variant="outline" size="lg">
                <Link href="/portal/enquiries">Browse Enquiries</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground">Project</TableHead>
                  <TableHead className="text-foreground">Deposit</TableHead>
                  <TableHead className="text-foreground">Balance</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                  <TableHead className="text-right text-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div>
                        <Link
                          href={`/portal/projects/${project.id}`}
                          className="font-semibold text-xl text-primary hover:underline"
                        >
                          {project.title}
                        </Link>
                        <div className="text-base text-muted-foreground mt-1">
                          Quoted RM {project.quotedAmount.toString()}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="font-mono text-[11px]">
                            {project.escrowAddress ? "Contract linked" : "Contract pending"}
                          </Badge>
                          <span>
                            {project._count.chainEvents + project._count.timeline} proof event
                            {project._count.chainEvents + project._count.timeline === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-lg">RM {project.depositAmount.toString()}</TableCell>
                    <TableCell className="text-lg">RM {project.balanceAmount.toString()}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(project.status)}>
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-3">
                        <Button asChild>
                          <Link href={`/portal/projects/${project.id}`}>
                            Open
                            <ExternalLink className="ml-2 h-5 w-5" />
                          </Link>
                        </Button>
                        {user.role === "ADMIN" && (
                          <DeleteProjectButton
                            projectId={project.id}
                            projectTitle={project.title}
                            size="default"
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

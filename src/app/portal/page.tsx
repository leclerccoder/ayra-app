import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
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
  ArrowRight,
  Bell,
  ClipboardCheck,
  FileSearch,
  FolderKanban,
  Gavel,
  LayoutDashboard,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react";

const formatCurrency = (value: string | number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  }).format(typeof value === "string" ? Number(value) : value);

const statusVariant = (status: string) => {
  if (["DISPUTED", "REFUNDED"].includes(status)) return "destructive";
  if (["APPROVED", "RELEASED", "RESOLVED"].includes(status)) return "default";
  return "secondary";
};

function StatCard({
  title,
  value,
  icon: Icon,
  hint,
}: {
  title: string;
  value: string | number;
  icon: typeof LayoutDashboard;
  hint: string;
}) {
  return (
    <Card className="border-none bg-white/80 shadow-sm backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="text-2xl font-semibold text-foreground">{value}</div>
        </div>
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-0 text-xs text-muted-foreground">
        {hint}
      </CardContent>
    </Card>
  );
}

export default async function PortalHome() {
  const user = await getCurrentUser();
  const role = user?.role ?? "GUEST";

  if (!user) {
    return (
      <div className="space-y-8">
        <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-accent/10 p-8 shadow-sm">
          <Badge variant="secondary" className="mb-4 gap-2">
            <Sparkles className="h-3 w-3" />
            Blockchain escrow workflow
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to the Ayra Portal.
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Submit enquiries, track escrow milestones, and access dispute
            resolution from one secure portal.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/portal/login">Sign In</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/portal/register">Create Account</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Start an Enquiry",
              description:
                "Submit your 2D/3D or renovation request and upload references for quotation.",
              icon: MessageSquare,
              href: "/portal/enquiries/new",
              label: "New Enquiry",
            },
            {
              title: "Track Projects",
              description:
                "Follow deposit status, draft uploads, approvals, and refund decisions.",
              icon: FolderKanban,
              href: "/portal/projects",
              label: "Project Timeline",
            },
            {
              title: "Dispute Resolution",
              description:
                "Review disputes, submit evidence, and receive auditable outcomes.",
              icon: Gavel,
              href: "/portal/projects",
              label: "Review Disputes",
            },
          ].map((item) => (
            <Card key={item.title} className="border-none shadow-sm">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, status: "UNREAD" },
  });

  const baseProjectWhere =
    role === "ADMIN"
      ? {}
      : role === "DESIGNER"
      ? { designerId: user.id }
      : { clientId: user.id };

  const recentProjects = await prisma.project.findMany({
    where: baseProjectWhere,
    orderBy: { updatedAt: "desc" },
    take: 4,
    include: { client: true, designer: true },
  });

  const clientStats =
    role === "CLIENT"
      ? await prisma.project.groupBy({
          by: ["status"],
          where: { clientId: user.id },
          _count: { status: true },
        })
      : [];

  const designerStats =
    role === "DESIGNER"
      ? await prisma.project.groupBy({
          by: ["status"],
          where: { designerId: user.id },
          _count: { status: true },
        })
      : [];

  const adminCounts =
    role === "ADMIN"
      ? await Promise.all([
          prisma.enquiry.count({
            where: { status: { in: ["SUBMITTED", "QUOTED", "APPROVED"] } },
          }),
          prisma.project.count({
            where: { status: { in: ["DRAFT", "FUNDED", "DRAFT_SUBMITTED", "APPROVED"] } },
          }),
          prisma.dispute.count({ where: { status: "OPEN" } }),
        ])
      : [0, 0, 0];

  const recentEnquiries =
    role === "ADMIN"
      ? await prisma.enquiry.findMany({
          orderBy: { createdAt: "desc" },
          take: 4,
        })
      : [];

  const recentNotifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  const getCount = (stats: { status: string; _count: { status: number } }[], status: string) =>
    stats.find((row) => row.status === status)?._count.status ?? 0;

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-accent/10 p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge variant="secondary" className="mb-3 gap-2">
              <ShieldCheck className="h-3 w-3" />
              {role} dashboard
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {user.name}.
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Track escrow progress, review milestones, and action the next
              steps for your role in one unified workspace.
            </p>
          </div>
          <Card className="w-full max-w-sm border-none bg-white/80 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Quick access</CardTitle>
              <CardDescription>
                Signed in as {user.email} ({user.role}).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild className="w-full">
                <Link href="/portal/projects">
                  View Projects
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/portal/notifications">Notifications</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {role === "ADMIN" ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Pending enquiries"
            value={adminCounts[0]}
            icon={MessageSquare}
            hint="Awaiting quotation or approval."
          />
          <StatCard
            title="Projects in motion"
            value={adminCounts[1]}
            icon={FolderKanban}
            hint="Draft, funded, or awaiting decision."
          />
          <StatCard
            title="Open disputes"
            value={adminCounts[2]}
            icon={Gavel}
            hint="Require arbitration decisions."
          />
          <StatCard
            title="Unread alerts"
            value={unreadCount}
            icon={Bell}
            hint="Latest system notifications."
          />
        </div>
      ) : null}

      {role === "DESIGNER" ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Assigned projects"
            value={designerStats.reduce((sum, row) => sum + row._count.status, 0)}
            icon={FolderKanban}
            hint="All projects under your care."
          />
          <StatCard
            title="Drafts to upload"
            value={getCount(designerStats, "FUNDED")}
            icon={UploadCloud}
            hint="Deposit received, draft needed."
          />
          <StatCard
            title="Awaiting client review"
            value={getCount(designerStats, "DRAFT_SUBMITTED")}
            icon={ClipboardCheck}
            hint="Draft submitted, client reviewing."
          />
          <StatCard
            title="Disputes open"
            value={getCount(designerStats, "DISPUTED")}
            icon={Gavel}
            hint="Requires admin decision."
          />
        </div>
      ) : null}

      {role === "CLIENT" ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Awaiting deposit"
            value={getCount(clientStats, "DRAFT")}
            icon={ClipboardCheck}
            hint="Projects ready for 50% deposit."
          />
          <StatCard
            title="Drafts to review"
            value={getCount(clientStats, "DRAFT_SUBMITTED")}
            icon={FileSearch}
            hint="Drafts ready for your approval."
          />
          <StatCard
            title="Open disputes"
            value={getCount(clientStats, "DISPUTED")}
            icon={Gavel}
            hint="Disputes under review."
          />
          <StatCard
            title="Unread alerts"
            value={unreadCount}
            icon={Bell}
            hint="Latest system notifications."
          />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>
              Move the workflow forward with the right next step.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {role === "CLIENT" ? (
              <>
                <Button asChild className="w-full">
                  <Link href="/portal/enquiries/new">Submit new enquiry</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/portal/projects">Review drafts</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/portal/notifications">View notifications</Link>
                </Button>
              </>
            ) : null}

            {role === "DESIGNER" ? (
              <>
                <Button asChild className="w-full">
                  <Link href="/portal/projects">Upload draft deliverable</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/portal/projects">Check client feedback</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/portal/notifications">Designer alerts</Link>
                </Button>
              </>
            ) : null}

            {role === "ADMIN" ? (
              <>
                <Button asChild className="w-full">
                  <Link href="/portal/admin">Review enquiries &amp; create projects</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/portal/projects">Arbitrate disputes</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/portal/projects">Release / refund escrow</Link>
                </Button>
                <Button disabled className="w-full" variant="secondary">
                  Pause escrow actions (demo)
                </Button>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent projects</CardTitle>
            <CardDescription>Latest activity across your portfolio.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentProjects.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No projects yet. Once a project is created, it will appear here.
              </div>
            ) : (
              <div className="space-y-3">
                {recentProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border/70 bg-background p-3"
                  >
                    <div>
                      <div className="font-semibold">{project.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Client: {project.client?.name ?? "Unassigned"} ·
                        Designer: {project.designer?.name ?? "Unassigned"}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant(project.status)}>
                        {project.status}
                      </Badge>
                      <div className="text-sm font-medium text-muted-foreground">
                        {formatCurrency(project.quotedAmount.toString())}
                      </div>
                      <Button asChild size="sm">
                        <Link href={`/portal/projects/${project.id}`}>Open</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {role === "ADMIN" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Pending enquiries</CardTitle>
              <CardDescription>Requests awaiting review or quotation.</CardDescription>
            </CardHeader>
            <CardContent>
              {recentEnquiries.length === 0 ? (
                <div className="text-sm text-muted-foreground">No pending enquiries.</div>
              ) : (
                <div className="space-y-3">
                  {recentEnquiries.map((enquiry) => (
                    <div
                      key={enquiry.id}
                      className="flex items-center justify-between rounded-lg border border-border/70 bg-background p-3"
                    >
                      <div>
                        <div className="font-medium">
                          {enquiry.serviceType ?? "Service enquiry"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {enquiry.fullName} · {enquiry.contactEmail}
                        </div>
                      </div>
                      <Badge variant="secondary">{enquiry.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Recent notifications</CardTitle>
              <CardDescription>System alerts for quick follow-up.</CardDescription>
            </CardHeader>
            <CardContent>
              {recentNotifications.length === 0 ? (
                <div className="text-sm text-muted-foreground">No notifications yet.</div>
              ) : (
                <div className="space-y-3">
                  {recentNotifications.map((note) => (
                    <div key={note.id} className="rounded-lg border border-border/70 bg-background p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{note.title}</div>
                        <Badge variant={note.status === "UNREAD" ? "default" : "secondary"}>
                          {note.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {note.createdAt.toDateString()}
                      </div>
                      <div className="text-sm text-muted-foreground">{note.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Recent notifications</CardTitle>
            <CardDescription>Stay on top of escrow updates.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentNotifications.length === 0 ? (
              <div className="text-sm text-muted-foreground">No notifications yet.</div>
            ) : (
              <div className="space-y-3">
                {recentNotifications.map((note) => (
                  <div key={note.id} className="rounded-lg border border-border/70 bg-background p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{note.title}</div>
                      <Badge variant={note.status === "UNREAD" ? "default" : "secondary"}>
                        {note.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {note.createdAt.toDateString()}
                    </div>
                    <div className="text-sm text-muted-foreground">{note.message}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

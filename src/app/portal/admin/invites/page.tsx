import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import AdminInviteForm from "../AdminInviteForm";
import InvitesTables from "./InvitesTables";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Users,
    Mail,
    Clock,
    CheckCircle2,
    UserPlus,
    ArrowLeft,
    Briefcase,
} from "lucide-react";
import Link from "next/link";

export default async function AdminInvitesPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/portal/login");
    }

    if (user.role !== "ADMIN") {
        redirect("/portal");
    }

    const [admins, designers, invites] = await Promise.all([
        prisma.user.findMany({
            where: { role: "ADMIN" },
            select: { id: true, name: true, email: true, role: true, createdAt: true },
            orderBy: { createdAt: "desc" },
        }),
        prisma.user.findMany({
            where: { role: "DESIGNER" },
            select: { id: true, name: true, email: true, role: true, createdAt: true },
            orderBy: { createdAt: "desc" },
        }),
        prisma.adminInvite.findMany({
            select: {
                id: true,
                email: true,
                createdAt: true,
                expiresAt: true,
                acceptedAt: true,
                role: true,
                invitedBy: { select: { name: true } },
                acceptedUser: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
        }),
    ]);

    const now = new Date();
    const pendingCount = invites.filter(
        (invite) => !invite.acceptedAt && invite.expiresAt > now
    ).length;
    const acceptedCount = invites.filter((invite) => invite.acceptedAt).length;

    return (
        <div className="space-y-8">
            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-purple-700 p-8 lg:p-12 text-white">
                {/* Background decorations */}
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400/20 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10">
                    <Link href="/portal/admin" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back to Admin Console</span>
                    </Link>

                    <div className="flex items-start gap-6">
                        <div className="hidden sm:flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg">
                            <UserPlus className="h-10 w-10" />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-3">
                                Team Invitations
                            </h1>
                            <p className="text-xl text-white/80 max-w-2xl">
                                Invite new admins and designers to the platform. Track invitation status and manage both teams.
                            </p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-8">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                            <div className="flex items-center gap-3">
                                <Users className="h-6 w-6" />
                                <div>
                                    <p className="text-3xl font-bold">{admins.length}</p>
                                    <p className="text-white/70 text-sm">Active Admins</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                            <div className="flex items-center gap-3">
                                <Briefcase className="h-6 w-6" />
                                <div>
                                    <p className="text-3xl font-bold">{designers.length}</p>
                                    <p className="text-white/70 text-sm">Active Designers</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                            <div className="flex items-center gap-3">
                                <Mail className="h-6 w-6" />
                                <div>
                                    <p className="text-3xl font-bold">{invites.length}</p>
                                    <p className="text-white/70 text-sm">Total Invites</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                            <div className="flex items-center gap-3">
                                <Clock className="h-6 w-6" />
                                <div>
                                    <p className="text-3xl font-bold">{pendingCount}</p>
                                    <p className="text-white/70 text-sm">Pending</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="h-6 w-6" />
                                <div>
                                    <p className="text-3xl font-bold">{acceptedCount}</p>
                                    <p className="text-white/70 text-sm">Accepted</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Invite Form Card */}
            <Card className="shadow-lg">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                            <Mail className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl">Send New Invitation</CardTitle>
                            <CardDescription className="text-base">
                                Enter the email address of the person you want to invite
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <AdminInviteForm />
                </CardContent>
            </Card>

            <InvitesTables
                admins={admins.map((admin) => ({
                    id: admin.id,
                    name: admin.name,
                    email: admin.email,
                    role: admin.role,
                    createdAt: admin.createdAt.toISOString(),
                }))}
                designers={designers.map((designer) => ({
                    id: designer.id,
                    name: designer.name,
                    email: designer.email,
                    role: designer.role,
                    createdAt: designer.createdAt.toISOString(),
                }))}
                invites={invites.map((invite) => ({
                    id: invite.id,
                    email: invite.email,
                    role: invite.role,
                    createdAt: invite.createdAt.toISOString(),
                    expiresAt: invite.expiresAt.toISOString(),
                    acceptedAt: invite.acceptedAt ? invite.acceptedAt.toISOString() : null,
                    invitedByName: invite.invitedBy.name,
                    acceptedUserName: invite.acceptedUser?.name ?? null,
                }))}
            />
        </div>
    );
}

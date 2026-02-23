import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "./actions";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/portal/sidebar";
import { LiveTracking } from "@/components/portal/live-tracking";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const unreadCount = user
    ? await prisma.notification.count({
      where: { userId: user.id, status: "UNREAD" },
    })
    : 0;

  const serializedUser = user
    ? { name: user.name, email: user.email, role: user.role }
    : null;

  return (
    <div className="min-h-screen bg-muted/40 text-base">
      {/* Mobile header is rendered inside Sidebar */}
      <div className="flex">
        <Sidebar
          user={serializedUser}
          unreadCount={unreadCount}
          logoutAction={logoutAction}
        />
        <LiveTracking />
        <main className="flex-1 min-w-0 overflow-auto">
          <div className="w-full p-4 sm:p-5 md:p-8 lg:p-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

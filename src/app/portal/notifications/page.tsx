import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { markAllReadAction } from "./actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bell, Check } from "lucide-react";

export default async function NotificationsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/portal/login");
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-lg text-muted-foreground mt-1">
            Stay updated on your projects and enquiries
          </p>
        </div>
        <form action={markAllReadAction} className="w-full sm:w-auto">
          <Button type="submit" variant="outline" size="lg" className="w-full sm:w-auto">
            <Check className="mr-2 h-5 w-5" />
            Mark all read
          </Button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Bell className="h-6 w-6" />
            All Notifications
          </CardTitle>
          <CardDescription>
            {notifications.length === 0
              ? "No notifications yet"
              : `${notifications.length} notification${notifications.length === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bell className="h-16 w-16 text-muted-foreground/50 mb-6" />
              <p className="text-lg text-muted-foreground">No notifications yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((note, index) => (
                <div key={note.id}>
                  <div className="flex items-start gap-5 p-6 rounded-xl hover:bg-muted/50 transition-colors">
                    <div
                      className={`mt-2 h-3 w-3 rounded-full ${note.status === "UNREAD" ? "bg-primary" : "bg-muted"
                        }`}
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-semibold">{note.title}</p>
                        <Badge variant={note.status === "UNREAD" ? "default" : "outline"}>
                          {note.status}
                        </Badge>
                      </div>
                      <p className="text-base text-muted-foreground">{note.message}</p>
                      <p className="text-sm text-muted-foreground">
                        {note.createdAt.toDateString()}
                      </p>
                    </div>
                  </div>
                  {index < notifications.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

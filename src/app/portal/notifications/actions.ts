"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function markAllReadAction() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/portal/login");
  }

  await prisma.notification.updateMany({
    where: { userId: user.id, status: "UNREAD" },
    data: { status: "READ", readAt: new Date() },
  });
}

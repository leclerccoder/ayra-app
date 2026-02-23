import { prisma } from "@/lib/db";

export async function notifyUsers(
  userIds: string[],
  title: string,
  message: string
) {
  if (userIds.length === 0) {
    return;
  }

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      title,
      message,
    })),
  });
}

export async function notifyAdmins(title: string, message: string) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  await notifyUsers(
    admins.map((admin) => admin.id),
    title,
    message
  );
}

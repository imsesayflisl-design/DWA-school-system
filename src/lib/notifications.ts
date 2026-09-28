import prisma from "./prisma";
import { emitNotification } from "./socket-server";

export type NotificationInput = {
  title: string;
  message: string;
  type?: string;
  link?: string | null;
};

/**
 * Create a notification for each target user and push it in real time
 * to their connected clients via the socket room `user:<id>`.
 */
export async function notifyUsers(
  userIds: string[],
  data: NotificationInput
) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) return;

  const created = await prisma.notification.createManyAndReturn({
    data: uniqueIds.map((userId) => ({
      userId,
      title: data.title,
      message: data.message,
      type: data.type ?? "info",
      link: data.link ?? null,
    })),
  });

  for (const notification of created) {
    emitNotification(notification.userId, notification);
  }
}

/** Notify every student, parent, teacher and admin in the system. */
export async function notifyEveryone(data: NotificationInput) {
  const [students, parents, teachers, admins] = await Promise.all([
    prisma.student.findMany({ select: { id: true, parentId: true } }),
    prisma.parent.findMany({ select: { id: true } }),
    prisma.teacher.findMany({ select: { id: true } }),
    prisma.admin.findMany({ select: { id: true } }),
  ]);

  const ids = students.map((s) => s.id);
  ids.push(
    ...students
      .map((s) => s.parentId)
      .filter((id): id is string => Boolean(id))
  );
  ids.push(...parents.map((p) => p.id));
  ids.push(...teachers.map((t) => t.id));
  ids.push(...admins.map((a) => a.id));

  await notifyUsers(ids, data);
}

/**
 * Resolve the recipient ids for a class-based notification:
 * students of the class, their parents, and teachers who teach the class.
 */
export async function notifyClass(
  classId: number,
  data: NotificationInput
) {
  const [students, teachers] = await Promise.all([
    prisma.student.findMany({
      where: { classId },
      select: { id: true, parentId: true },
    }),
    prisma.lesson.findMany({
      where: { classId },
      distinct: ["teacherId"],
      select: { teacherId: true },
    }),
  ]);

  const ids = students.map((s) => s.id);
  ids.push(
    ...students
      .map((s) => s.parentId)
      .filter((id): id is string => Boolean(id))
  );
  ids.push(...teachers.map((t) => t.teacherId));

  await notifyUsers(ids, data);
}

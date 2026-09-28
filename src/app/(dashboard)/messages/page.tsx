import { auth } from "@clerk/nextjs/server";
import { getRole } from "@/lib/roles";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import RealtimeSync from "@/components/RealtimeSync";
import GroupChat from "./GroupChat";

export type GroupSummary = {
  id: number;
  name: string;
  classId: number;
  memberCount: number;
  lastMessage: {
    senderName: string;
    content: string;
    createdAt: Date;
  } | null;
};

type LastMessageRow = {
  groupId: number;
  senderName: string;
  content: string;
  createdAt: Date;
};

async function resolveMyName(userId: string, role?: string) {
  if (role === "student") {
    const s = await prisma.student.findUnique({
      where: { id: userId },
      select: { name: true, surname: true },
    });
    if (s) return `${s.name} ${s.surname}`;
  } else if (role === "teacher") {
    const t = await prisma.teacher.findUnique({
      where: { id: userId },
      select: { name: true, surname: true },
    });
    if (t) return `${t.name} ${t.surname}`;
  } else if (role === "admin") {
    const a = await prisma.admin.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    if (a) return a.username;
  }
  return userId;
}

export default async function MessagesPage() {
  const { userId } = auth();
  const role = await getRole();

  if (!userId) return <div>Please sign in.</div>;

  let classIds: number[] = [];
  if (role === "student") {
    const s = await prisma.student.findUnique({
      where: { id: userId },
      select: { classId: true },
    });
    if (s) classIds = [s.classId];
  } else if (role === "teacher") {
    const [lessons, supervised] = await Promise.all([
      prisma.lesson.findMany({
        where: { teacherId: userId },
        select: { classId: true },
        distinct: ["classId"],
      }),
      prisma.class.findMany({
        where: { supervisorId: userId },
        select: { id: true },
      }),
    ]);
    classIds = Array.from(
      new Set([...lessons.map((l) => l.classId), ...supervised.map((c) => c.id)])
    );
  } else if (role === "admin") {
    const classes = await prisma.class.findMany({ select: { id: true } });
    classIds = classes.map((c) => c.id);
  }

  let groups: GroupSummary[] = [];

  if (classIds.length > 0) {
    const classes = await prisma.class.findMany({
      where: { id: { in: classIds } },
      select: {
        id: true,
        name: true,
        _count: { select: { students: true } },
      },
      orderBy: { name: "asc" },
    });

    const summaries = await Promise.all(
      classes.map(async (c) => {
        const group = await prisma.group.upsert({
          where: { classId: c.id },
          update: {},
          create: { name: `${c.name} Group`, classId: c.id },
          select: { id: true, name: true, classId: true },
        });
        return {
          id: group.id,
          name: group.name,
          classId: c.id,
          memberCount: c._count.students,
        };
      })
    );

    const ids = summaries.map((g) => g.id);
    const lastRows =
      ids.length > 0
        ? await prisma.$queryRaw<LastMessageRow[]>`
            WITH latest AS (
              SELECT "groupId", "senderName", "content", "createdAt",
                     ROW_NUMBER() OVER (PARTITION BY "groupId" ORDER BY "createdAt" DESC) AS rn
              FROM "GroupMessage"
              WHERE "groupId" IN (${Prisma.join(ids)})
            )
            SELECT "groupId", "senderName", "content", "createdAt"
            FROM latest
            WHERE rn = 1
          `
        : [];

    const lastByGroup = new Map(lastRows.map((r) => [r.groupId, r]));

    groups = summaries.map((g) => {
      const last = lastByGroup.get(g.id);
      return {
        ...g,
        lastMessage: last
          ? {
              senderName: last.senderName,
              content: last.content,
              createdAt: last.createdAt,
            }
          : null,
      };
    });
  }

  const myName = await resolveMyName(userId, role);

  return (
    <div className="flex-1 p-4">
      <RealtimeSync userId={userId} />
      <GroupChat
        groups={groups}
        currentUserId={userId}
        currentRole={role || "student"}
        currentUserName={myName}
      />
    </div>
  );
}

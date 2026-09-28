import { auth } from "@clerk/nextjs/server";
import { getRole } from "@/lib/roles";
import prisma from "@/lib/prisma";
import AttendanceMarker, { AttendanceLesson } from "@/components/AttendanceMarker";

export default async function AttendancePage() {
  const { userId } = auth();
  const role = await getRole();

  if (!userId) return null;

  // STUDENT: view my own attendance history
  if (role === "student") {
    const records = await prisma.attendance.findMany({
      where: { studentId: userId },
      orderBy: { date: "desc" },
      take: 100,
      include: {
        lesson: { include: { subject: true, class: true } },
      },
    });

    const presentCount = records.filter((r) => r.present).length;

    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">My Attendance</h1>
          <span className="text-xs text-gray-500">
            {presentCount}/{records.length} present
          </span>
        </div>

        {records.length === 0 ? (
          <div className="text-center text-gray-400 py-10 text-sm">
            No attendance recorded yet. Your teacher will mark you present each lesson.
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {records.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between border border-gray-100 rounded-md px-4 py-3 text-sm"
              >
                <div>
                  <div className="font-medium">
                    {r.lesson.subject.name}{" "}
                    <span className="text-gray-400 font-normal">-</span>{" "}
                    <span className="text-gray-500 font-normal">
                      {r.lesson.class.name}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Intl.DateTimeFormat("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    }).format(r.date)}
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    r.present
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {r.present ? "Present" : "Absent"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // TEACHER / ADMIN: mark attendance
  const lessons = await prisma.lesson.findMany({
    where: role === "teacher" ? { teacherId: userId } : {},
    include: {
      subject: true,
      class: {
        include: {
          students: { select: { id: true, name: true, surname: true } },
        },
      },
    },
    orderBy: { class: { name: "asc" } },
  });

  const markerLessons: AttendanceLesson[] = lessons
    .filter((l) => l.class.students.length > 0)
    .map((l) => ({
      id: l.id,
      name: l.name,
      subjectName: l.subject.name,
      className: l.class.name,
      students: l.class.students,
    }));

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Attendance</h1>
        <span className="text-xs text-gray-500">{role}</span>
      </div>
      <p className="text-xs text-gray-400 mt-1 mb-4">
        Pick a lesson and date, then mark each student present or absent.
      </p>
      <AttendanceMarker lessons={markerLessons} />
    </div>
  );
}
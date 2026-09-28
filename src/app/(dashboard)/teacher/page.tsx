import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import GradingPanel from "@/components/GradingPanel";
import RealtimeSync from "@/components/RealtimeSync";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

const TeacherPage = async () => {
  const { userId } = auth();

  const assignmentsWithSubmissions = await prisma.assignment.findMany({
    where: {
      lesson: { teacherId: userId! },
      submissions: { some: { status: "SUBMITTED" } },
    },
    include: {
      submissions: {
        where: { status: "SUBMITTED" },
        include: { student: { select: { id: true, name: true, surname: true } } },
      },
    },
  });

  const gradingData = assignmentsWithSubmissions.map((a) => ({
    id: a.id,
    title: a.title,
    submissions: a.submissions.map((s) => ({
      id: s.id,
      student: s.student,
      answers: s.answers as { questionId: number; answer: string }[],
      score: s.score,
      totalPoints: s.totalPoints,
      status: s.status,
      submittedAt: s.submittedAt,
    })),
  }));

  return (
    <>
      <RealtimeSync userId={userId!} />
      <div className="flex-1 p-4 flex gap-4 flex-col xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3 flex flex-col gap-8">
        <div className="bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold mb-4">Schedule</h1>
          <BigCalendarContainer type="teacherId" id={userId!} />
        </div>
        {gradingData.length > 0 && (
          <div className="bg-white p-4 rounded-md">
            <h1 className="text-xl font-semibold mb-4">Pending Grading</h1>
            {gradingData.map((g) => (
              <GradingPanel
                key={g.id}
                submissions={g.submissions}
                assignmentId={g.id}
                assignmentTitle={g.title}
              />
            ))}
          </div>
        )}
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        <Announcements />
      </div>
      </div>
    </>
  );
};

export default TeacherPage;

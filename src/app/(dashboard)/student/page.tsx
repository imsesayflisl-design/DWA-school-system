import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import EventCalendar from "@/components/EventCalendar";
import MyAssignments from "@/components/MyAssignments";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import StudentPageClient from "./StudentPageClient";

const StudentPage = async () => {
  const { userId } = auth();

  const classItem = await prisma.class.findMany({
    where: {
      students: { some: { id: userId! } },
    },
  });

  const assignments = await prisma.assignment.findMany({
    where: {
      lesson: {
        class: {
          students: { some: { id: userId! } },
        },
      },
    },
    include: {
      lesson: {
        select: {
          subject: { select: { name: true } },
          teacher: { select: { name: true, surname: true } },
        },
      },
      questions: true,
      submissions: {
        where: { studentId: userId! },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  const assignmentsWithSubmission = assignments.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    type: a.type as "EASY_QUESTION" | "OBJECTIVE",
    dueDate: a.dueDate,
    lesson: a.lesson,
    questions: a.questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      type: q.type as "EASY_QUESTION" | "OBJECTIVE",
      options: q.options as { label: string; text: string }[] | null,
      points: q.points,
    })),
    submission: a.submissions[0]
      ? {
          id: a.submissions[0].id,
          answers: a.submissions[0].answers as {
            questionId: number;
            answer: string;
          }[],
          score: a.submissions[0].score,
          totalPoints: a.submissions[0].totalPoints,
          status: a.submissions[0].status,
        }
      : null,
  }));

  return (
    <>
      <StudentPageClient userId={userId!} />
      <div className="p-4 flex gap-4 flex-col xl:flex-row">
        {/* LEFT */}
        <div className="w-full xl:w-2/3 flex flex-col gap-8">
          <div className="bg-white p-4 rounded-md">
            <h1 className="text-xl font-semibold mb-4">Schedule</h1>
            <BigCalendarContainer type="classId" id={classItem[0]?.id} />
          </div>
          <div className="bg-white p-4 rounded-md">
            <h1 className="text-xl font-semibold mb-4">My Assignments</h1>
            <MyAssignments assignments={assignmentsWithSubmission} />
          </div>
        </div>
        {/* RIGHT */}
        <div className="w-full xl:w-1/3 flex flex-col gap-8">
          <EventCalendar />
          <Announcements />
        </div>
      </div>
    </>
  );
};

export default StudentPage;

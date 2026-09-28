import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import MyAssignments from "@/components/MyAssignments";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Assignment, Class, Prisma, Subject, Teacher } from "@prisma/client";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import { getRole } from "@/lib/roles";

const AssignmentListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {

  const { userId } = auth();
  const role = await getRole();
  const currentUserId = userId;

  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;

  const query: Prisma.AssignmentWhereInput = {};
  query.lesson = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "classId":
            query.lesson.classId = parseInt(value);
            break;
          case "teacherId":
            query.lesson.teacherId = value;
            break;
          case "search":
            query.lesson.subject = {
              name: { contains: value, mode: "insensitive" },
            };
            break;
          default:
            break;
        }
      }
    }
  }

  switch (role) {
    case "admin":
      break;
    case "teacher":
      query.lesson.teacherId = currentUserId!;
      break;
    case "student":
      query.lesson.class = {
        students: { some: { id: currentUserId! } },
      };
      break;
    default:
      break;
  }

  const [data, count] = await prisma.$transaction([
    prisma.assignment.findMany({
      where: query,
      include: {
        lesson: {
          select: {
            subject: { select: { name: true } },
            teacher: { select: { name: true, surname: true } },
            class: { select: { name: true } },
          },
        },
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.assignment.count({ where: query }),
  ]);

  // For students, also fetch questions and submissions
  let studentAssignments: any[] = [];
  if (role === "student" && currentUserId) {
    const detailedAssignments = await prisma.assignment.findMany({
      where: query,
      include: {
        lesson: {
          select: {
            subject: { select: { name: true } },
            teacher: { select: { name: true, surname: true } },
          },
        },
        questions: true,
        submissions: { where: { studentId: currentUserId } },
      },
      orderBy: { dueDate: "asc" },
    });

    studentAssignments = detailedAssignments.map((a) => ({
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
  }

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          All Assignments
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {(role === "admin" || role === "teacher") && (
                <FormContainer table="assignment" type="create" />
              )}
          </div>
        </div>
      </div>
      {/* LIST */}
      {role === "student" ? (
        <MyAssignments assignments={studentAssignments} />
      ) : (
        <>
          <Table
            columns={[
              { header: "Subject Name", accessor: "name" },
              { header: "Class", accessor: "class" },
              { header: "Teacher", accessor: "teacher", className: "hidden md:table-cell" },
              { header: "Due Date", accessor: "dueDate", className: "hidden md:table-cell" },
              ...(role === "admin" || role === "teacher"
                ? [{ header: "Actions", accessor: "action" }]
                : []),
            ]}
            renderRow={(item: any) => (
              <tr className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight">
                <td className="flex items-center gap-4 p-4">{item.lesson.subject.name}</td>
                <td>{item.lesson.class.name}</td>
                <td className="hidden md:table-cell">
                  {item.lesson.teacher.name + " " + item.lesson.teacher.surname}
                </td>
                <td className="hidden md:table-cell">
                  {new Intl.DateTimeFormat("en-US").format(item.dueDate)}
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    {(role === "admin" || role === "teacher") && (
                      <>
                        <FormContainer table="assignment" type="update" data={item} />
                        <FormContainer table="assignment" type="delete" id={item.id} />
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )}
            data={data}
          />
          <Pagination page={p} count={count} />
        </>
      )}
    </div>
  );
};

export default AssignmentListPage;

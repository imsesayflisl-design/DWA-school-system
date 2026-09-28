import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import ExamTimetable from "@/components/ExamTimetable";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Exam, Prisma } from "@prisma/client";
import Image from "next/image";
import { getRole } from "@/lib/roles";
import { auth } from "@clerk/nextjs/server";

type ExamList = Exam & {
  lesson: {
    subject: { name: string };
    class: { name: string };
    teacher: { name: string; surname: string };
  };
};

const ExamListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {

const role = await getRole();
const { userId: currentUserId } = auth();
const view = searchParams?.view || "list";

const columns = [
  {
    header: "Subject Name",
    accessor: "name",
  },
  {
    header: "Class",
    accessor: "class",
  },
  {
    header: "Teacher",
    accessor: "teacher",
    className: "hidden md:table-cell",
  },
  {
    header: "File / Link",
    accessor: "file",
    className: "hidden lg:table-cell",
  },
  {
    header: "Date",
    accessor: "date",
    className: "hidden md:table-cell",
  },
  ...(role === "admin" || role === "teacher"
    ? [
        {
          header: "Actions",
          accessor: "action",
        },
      ]
    : []),
];

const renderRow = (item: ExamList) => (
  <tr
    key={item.id}
    className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
  >
    <td className="flex items-center gap-4 p-4">{item.lesson.subject.name}</td>
    <td>{item.lesson.class.name}</td>
    <td className="hidden md:table-cell">
      {item.lesson.teacher.name + " " + item.lesson.teacher.surname}
    </td>
    <td className="hidden lg:table-cell">
      {(() => {
        const href = item.fileUrl || item.link || "";
        if (!href) return <span>-</span>;
        const label = item.fileUrl
          ? "Download"
          : item.link?.startsWith("http")
          ? "Open"
          : "View";
        return (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-blue-500 text-xs hover:underline"
          >
            {label}
          </a>
        );
      })()}
    </td>
    <td className="hidden md:table-cell">
      {new Intl.DateTimeFormat("en-US").format(item.startTime)}
    </td>
    <td>
      <div className="flex items-center gap-2">
        {(role === "admin" || role === "teacher") && (
          <>
            <FormContainer table="exam" type="update" data={item} />
            <FormContainer table="exam" type="delete" id={item.id} />
          </>
        )}
      </div>
    </td>
  </tr>
);

  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;

  // URL PARAMS CONDITION

  const query: Prisma.ExamWhereInput = {};

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

  // ROLE CONDITIONS

  switch (role) {
    case "admin":
      break;
    case "teacher":
      query.lesson.teacherId = currentUserId!;
      break;
    case "student":
      query.lesson.class = {
        students: {
          some: {
            id: currentUserId!,
          },
        },
      };
      break;
    default:
      break;
  }

  const [data, count] = await prisma.$transaction([
    prisma.exam.findMany({
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
      take: view === "list" ? ITEM_PER_PAGE : undefined,
      skip: view === "list" ? ITEM_PER_PAGE * (p - 1) : undefined,
    }),
    prisma.exam.count({ where: query }),
  ]);

  const adminClasses =
    role === "admin"
      ? await prisma.class.findMany({
          select: {
            id: true,
            name: true,
            grade: { select: { level: true } },
          },
          orderBy: { name: "asc" },
        })
      : [];

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Exams</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <a
                href={`/list/exams?view=list`}
                className={`px-3 py-1 text-xs rounded ${
                  view === "list"
                    ? "bg-white shadow text-gray-800"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                List
              </a>
              <a
                href={`/list/exams?view=timetable`}
                className={`px-3 py-1 text-xs rounded ${
                  view === "timetable"
                    ? "bg-white shadow text-gray-800"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Timetable
              </a>
            </div>
            {role === "admin" && (
              <form method="GET" action="/list/exams">
                <input type="hidden" name="view" value={view} />
                <select
                  name="classId"
                  onChange={(e) => {
                    if (e.target.value) {
                      (e.target as HTMLSelectElement).closest("form")?.submit();
                    }
                  }}
                  defaultValue={
                    searchParams.classId ? String(searchParams.classId) : ""
                  }
                  className="bg-gray-100 text-xs rounded-lg px-3 py-1.5 border-none focus:outline-none"
                >
                  <option value="">All Classes</option>
                  {adminClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Grade {c.grade.level})
                    </option>
                  ))}
                </select>
              </form>
            )}
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-lamaYellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {(role === "admin" || role === "teacher") && (
              <FormContainer table="exam" type="create" />
            )}
          </div>
        </div>
      </div>
      {/* LIST / TIMETABLE */}
      {view === "timetable" ? (
        <ExamTimetable exams={data as any[]} />
      ) : (
        <>
          <Table columns={columns} renderRow={renderRow} data={data} />
          <Pagination page={p} count={count} />
        </>
      )}
    </div>
  );
};

export default ExamListPage;

"use client";

import { useState } from "react";
import AssignmentAnswer from "./AssignmentAnswer";

type AssignmentItem = {
  id: number;
  title: string;
  description?: string | null;
  type: "EASY_QUESTION" | "OBJECTIVE";
  dueDate: Date;
  lesson: {
    subject: { name: string };
    teacher: { name: string; surname: string };
  };
  questions: {
    id: number;
    questionText: string;
    type: "EASY_QUESTION" | "OBJECTIVE";
    options: { label: string; text: string }[] | null;
    points: number;
  }[];
  submission?: {
    id: number;
    answers: { questionId: number; answer: string }[];
    score?: number | null;
    totalPoints?: number | null;
    status: string;
  } | null;
};

type Props = {
  assignments: AssignmentItem[];
};

export default function MyAssignments({ assignments }: Props) {
  const [activeAssignment, setActiveAssignment] = useState<number | null>(null);

  if (assignments.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8 text-sm">
        No assignments yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {assignments.map((assignment) => {
        const isPastDue = new Date(assignment.dueDate) < new Date();
        const isSubmitted = assignment.submission?.status === "SUBMITTED";
        const isGraded = assignment.submission?.status === "GRADED";

        return (
          <div
            key={assignment.id}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden"
          >
            <div
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() =>
                setActiveAssignment(
                  activeAssignment === assignment.id ? null : assignment.id
                )
              }
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">{assignment.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {assignment.lesson.subject.name} -{" "}
                    {assignment.lesson.teacher.name}{" "}
                    {assignment.lesson.teacher.surname}
                  </p>
                  {assignment.description && (
                    <p className="text-xs text-gray-400 mt-1">
                      {assignment.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    Due:{" "}
                    {new Date(assignment.dueDate).toLocaleDateString("en-US")}
                  </span>
                  {isGraded ? (
                    <span className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full">
                      Graded: {assignment.submission?.score}/
                      {assignment.submission?.totalPoints}
                    </span>
                  ) : isSubmitted ? (
                    <span className="bg-yellow-50 text-yellow-700 text-xs px-2 py-1 rounded-full">
                      Submitted
                    </span>
                  ) : isPastDue ? (
                    <span className="bg-red-50 text-red-700 text-xs px-2 py-1 rounded-full">
                      Past Due
                    </span>
                  ) : (
                    <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
                      Pending
                    </span>
                  )}
                </div>
              </div>
            </div>

            {activeAssignment === assignment.id && (
              <div className="border-t border-gray-100 p-4 bg-gray-50">
                <AssignmentAnswer
                  assignmentId={assignment.id}
                  title={assignment.title}
                  questions={assignment.questions}
                  existingSubmission={assignment.submission}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

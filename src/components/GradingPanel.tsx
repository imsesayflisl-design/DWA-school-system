"use client";

import { useState } from "react";
import { gradeSubmission } from "@/lib/actions";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

type Submission = {
  id: number;
  student: { id: string; name: string; surname: string };
  answers: { questionId: number; answer: string }[];
  score: number | null;
  totalPoints: number | null;
  status: string;
  submittedAt: Date;
};

type Props = {
  submissions: Submission[];
  assignmentId: number;
  assignmentTitle: string;
};

export default function GradingPanel({
  submissions,
  assignmentId,
  assignmentTitle,
}: Props) {
  const [scores, setScores] = useState<Record<number, string>>({});
  const [comments, setComments] = useState<Record<number, string>>({});
  const [grading, setGrading] = useState<Record<number, boolean>>({});
  const router = useRouter();

  const pendingSubmissions = submissions.filter(
    (s) => s.status === "SUBMITTED"
  );

  const handleGrade = async (submissionId: number) => {
    const score = parseInt(scores[submissionId]);
    if (isNaN(score) || score < 0) {
      toast.error("Please enter a valid score.");
      return;
    }

    setGrading((prev) => ({ ...prev, [submissionId]: true }));
    const result = await gradeSubmission(
      { success: false, error: false },
      {
        submissionId,
        score,
        comment: comments[submissionId] || undefined,
      }
    );

    if (result.success) {
      toast.success("Submission graded!");
      router.refresh();
    } else {
      toast.error("Failed to grade. Try again.");
    }
    setGrading((prev) => ({ ...prev, [submissionId]: false }));
  };

  if (pendingSubmissions.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8 text-sm">
        No submissions to grade for &quot;{assignmentTitle}&quot;
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-700">
        {assignmentTitle} - {pendingSubmissions.length} pending
      </h3>

      {pendingSubmissions.map((submission) => (
        <div
          key={submission.id}
          className="border border-gray-200 rounded-lg p-4 bg-white"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">
              {submission.student.name} {submission.student.surname}
            </div>
            <div className="text-xs text-gray-400">
              Submitted:{" "}
              {new Date(submission.submittedAt).toLocaleString("en-US", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </div>
          </div>

          {Array.isArray(submission.answers) &&
            submission.answers.map((answer, idx) => (
              <div key={idx} className="mb-2 text-sm">
                <span className="text-gray-500">Q{idx + 1}:</span>{" "}
                <span>{answer.answer}</span>
              </div>
            ))}

          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Score:</label>
              <input
                type="number"
                className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                placeholder="0"
                value={scores[submission.id] || ""}
                onChange={(e) =>
                  setScores((prev) => ({
                    ...prev,
                    [submission.id]: e.target.value,
                  }))
                }
              />
              {submission.totalPoints && (
                <span className="text-xs text-gray-400">
                  / {submission.totalPoints}
                </span>
              )}
            </div>
            <input
              type="text"
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
              placeholder="Comment (optional)"
              value={comments[submission.id] || ""}
              onChange={(e) =>
                setComments((prev) => ({
                  ...prev,
                  [submission.id]: e.target.value,
                }))
              }
            />
            <button
              onClick={() => handleGrade(submission.id)}
              disabled={grading[submission.id]}
              className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {grading[submission.id] ? "Grading..." : "Grade"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

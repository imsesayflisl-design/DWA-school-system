"use client";

import { useState } from "react";
import { submitAssignment } from "@/lib/actions";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

type Question = {
  id: number;
  questionText: string;
  type: "EASY_QUESTION" | "OBJECTIVE";
  options?: { label: string; text: string }[] | null;
  points: number;
};

type Props = {
  assignmentId: number;
  title: string;
  questions: Question[];
  existingSubmission?: {
    answers: { questionId: number; answer: string }[];
    score?: number | null;
    totalPoints?: number | null;
    status: string;
  } | null;
};

export default function AssignmentAnswer({
  assignmentId,
  title,
  questions,
  existingSubmission,
}: Props) {
  const [answers, setAnswers] = useState<Record<number, string>>(
    existingSubmission?.answers?.reduce(
      (acc, a) => ({ ...acc, [a.questionId]: a.answer }),
      {} as Record<number, string>
    ) || {}
  );
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const allAnswered = questions.every(
      (q) => answers[q.id]?.trim()
    );
    if (!allAnswered) {
      toast.error("Please answer all questions before submitting.");
      return;
    }

    setSubmitting(true);
    const result = await submitAssignment(
      { success: false, error: false },
      {
        assignmentId,
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId: parseInt(questionId),
          answer,
        })),
      }
    );

    setSubmitting(false);

    if (result.success) {
      toast.success("Assignment submitted successfully!");
      router.refresh();
    } else {
      toast.error("Failed to submit. Try again.");
    }
  };

  const isGraded = existingSubmission?.status === "GRADED";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {isGraded && existingSubmission && (
          <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
            Score: {existingSubmission.score}/{existingSubmission.totalPoints}
          </div>
        )}
      </div>

      {questions.map((question, index) => (
        <div
          key={question.id}
          className="bg-white border border-gray-200 rounded-lg p-4"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-2">
              <span className="text-sm font-medium text-gray-500">
                {index + 1}.
              </span>
              <p className="text-sm font-medium">{question.questionText}</p>
            </div>
            <span className="text-xs text-gray-400">{question.points} pt</span>
          </div>

          {question.type === "OBJECTIVE" && question.options ? (
            <div className="space-y-2 ml-4">
              {question.options.map((opt) => (
                <label
                  key={opt.label}
                  className={`flex items-center gap-3 p-2 rounded cursor-pointer text-sm ${
                    answers[question.id] === opt.label
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-gray-50 border border-transparent"
                  }`}
                >
                  <input
                    type="radio"
                    name={`q_${question.id}`}
                    value={opt.label}
                    checked={answers[question.id] === opt.label}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [question.id]: e.target.value,
                      }))
                    }
                    className="accent-blue-500"
                    disabled={isGraded}
                  />
                  <span className="font-medium text-gray-600">{opt.label}.</span>
                  <span>{opt.text}</span>
                </label>
              ))}
            </div>
          ) : (
            <textarea
              className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ml-4"
              rows={3}
              placeholder="Type your answer here..."
              value={answers[question.id] || ""}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  [question.id]: e.target.value,
                }))
              }
              disabled={isGraded}
            />
          )}

          {isGraded && existingSubmission?.answers && (
            <div className="mt-2 text-xs text-gray-400 ml-4">
              Your answer:{" "}
              {
                existingSubmission.answers.find(
                  (a) => a.questionId === question.id
                )?.answer
              }
            </div>
          )}
        </div>
      ))}

      {!isGraded && (
        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-500 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Assignment"}
        </button>
      )}
    </form>
  );
}

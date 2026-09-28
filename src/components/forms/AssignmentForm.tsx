"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { assignmentSchema, AssignmentSchema } from "@/lib/formValidationSchemas";
import { createAssignment, updateAssignment, createAssignmentWithQuestions } from "@/lib/actions";
import { useFormState } from "react-dom";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

type Question = {
  questionText: string;
  type: "EASY_QUESTION" | "OBJECTIVE";
  options: { label: string; text: string }[];
  correctAnswer: string;
  points: number;
};

const AssignmentForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AssignmentSchema>({
    resolver: zodResolver(assignmentSchema),
  });

  const [state, formAction] = useFormState(
    type === "create" ? createAssignment : updateAssignment,
    { success: false, error: false }
  );

  const [assignType, setAssignType] = useState<"EASY_QUESTION" | "OBJECTIVE">(
    data?.type || "EASY_QUESTION"
  );
  const [questions, setQuestions] = useState<Question[]>([
    { questionText: "", type: "EASY_QUESTION", options: [], correctAnswer: "", points: 1 },
  ]);

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Assignment has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const { lessons } = relatedData;

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        questionText: "",
        type: assignType,
        options:
          assignType === "OBJECTIVE"
            ? [
                { label: "A", text: "" },
                { label: "B", text: "" },
                { label: "C", text: "" },
                { label: "D", text: "" },
              ]
            : [],
        correctAnswer: "",
        points: 1,
      },
    ]);
  };

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, field: keyof Question, value: any) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q))
    );
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? {
              ...q,
              options: q.options.map((opt, oi) =>
                oi === oIdx ? { ...opt, text: value } : opt
              ),
            }
          : q
      )
    );
  };

  const handleCreateWithQuestions = handleSubmit(async (d) => {
    const isValid = questions.every((q) => {
      if (!q.questionText.trim()) return false;
      if (q.type === "OBJECTIVE") {
        if (!q.options.every((o) => o.text.trim())) return false;
        if (!q.correctAnswer) return false;
      }
      return true;
    });

    if (!isValid) {
      toast.error("Please fill in all question fields.");
      return;
    }

    const result = await createAssignmentWithQuestions(
      { success: false, error: false },
      {
        title: d.title,
        description: (d as any).description,
        type: assignType,
        startDate: d.startDate,
        dueDate: d.dueDate,
        lessonId: d.lessonId,
        questions: questions.map((q) => ({
          questionText: q.questionText,
          type: q.type,
          options: q.type === "OBJECTIVE" ? q.options : undefined,
          correctAnswer: q.type === "OBJECTIVE" ? q.correctAnswer : undefined,
          points: q.points,
        })),
      }
    );

    if (result.success) {
      toast("Assignment created with questions!");
      setOpen(false);
      router.refresh();
    } else {
      toast.error("Failed to create assignment.");
    }
  });

  return (
    <form className="flex flex-col gap-8" onSubmit={handleCreateWithQuestions}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new assignment" : "Update the assignment"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Title"
          name="title"
          defaultValue={data?.title}
          register={register}
          error={errors?.title}
        />
        <InputField
          label="Description"
          name="description"
          defaultValue={data?.description}
          register={register}
          error={errors?.description}
        />
        <InputField
          label="Start Date"
          name="startDate"
          defaultValue={data?.startDate ? new Date(data.startDate).toISOString().slice(0, 16) : ""}
          register={register}
          error={errors?.startDate}
          type="datetime-local"
        />
        <InputField
          label="Due Date"
          name="dueDate"
          defaultValue={data?.dueDate ? new Date(data.dueDate).toISOString().slice(0, 16) : ""}
          register={register}
          error={errors?.dueDate}
          type="datetime-local"
        />
        {data && (
          <InputField
            label="Id"
            name="id"
            defaultValue={data?.id}
            register={register}
            error={errors?.id}
            hidden
          />
        )}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Lesson</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("lessonId")}
            defaultValue={data?.lessonId}
          >
            {lessons.map((lesson: { id: number; name: string }) => (
              <option value={lesson.id} key={lesson.id}>
                {lesson.name}
              </option>
            ))}
          </select>
          {errors.lessonId?.message && (
            <p className="text-xs text-red-400">{errors.lessonId.message.toString()}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Assignment Type</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            value={assignType}
            onChange={(e) => {
              const newType = e.target.value as "EASY_QUESTION" | "OBJECTIVE";
              setAssignType(newType);
              setQuestions((prev) =>
                prev.map((q) => ({
                  ...q,
                  type: newType,
                  options:
                    newType === "OBJECTIVE"
                      ? [
                          { label: "A", text: "" },
                          { label: "B", text: "" },
                          { label: "C", text: "" },
                          { label: "D", text: "" },
                        ]
                      : [],
                  correctAnswer: "",
                }))
              );
            }}
          >
            <option value="EASY_QUESTION">Easy Question</option>
            <option value="OBJECTIVE">Objective</option>
          </select>
        </div>
      </div>

      {/* Questions */}
      {type === "create" && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Questions</h2>
            <button
              type="button"
              onClick={addQuestion}
              className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
            >
              + Add Question
            </button>
          </div>

          <div className="space-y-4">
            {questions.map((q, qIdx) => (
              <div
                key={qIdx}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">
                    Question {qIdx + 1}
                  </span>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(qIdx)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Question text"
                    value={q.questionText}
                    onChange={(e) =>
                      updateQuestion(qIdx, "questionText", e.target.value)
                    }
                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Points"
                    value={q.points}
                    onChange={(e) =>
                      updateQuestion(qIdx, "points", parseInt(e.target.value) || 1)
                    }
                    className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>

                {q.type === "OBJECTIVE" && (
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 w-4">
                          {opt.label}.
                        </span>
                        <input
                          type="text"
                          placeholder={`Option ${opt.label}`}
                          value={opt.text}
                          onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                          className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                        <input
                          type="radio"
                          name={`correct_${qIdx}`}
                          value={opt.label}
                          checked={q.correctAnswer === opt.label}
                          onChange={() =>
                            updateQuestion(qIdx, "correctAnswer", opt.label)
                          }
                          className="accent-blue-500"
                          title="Mark as correct answer"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {state.error && <span className="text-red-500">Something went wrong!</span>}
      <button className="bg-blue-400 text-white p-2 rounded-md">
        {type === "create" ? "Create with Questions" : "Update"}
      </button>
    </form>
  );
};

export default AssignmentForm;

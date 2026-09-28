"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { getAttendanceForLesson, markAttendance } from "@/lib/actions";

export type AttendanceLesson = {
  id: number;
  name: string;
  subjectName: string;
  className: string;
  students: { id: string; name: string; surname: string }[];
};

export default function AttendanceMarker({ lessons }: { lessons: AttendanceLesson[] }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(
    lessons[0]?.id ?? null
  );
  const [date, setDate] = useState(today);
  const [present, setPresent] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const lesson = lessons.find((l) => l.id === selectedLessonId) || null;

  useEffect(() => {
    if (!selectedLessonId) return;
    let cancelled = false;
    setLoading(true);
    getAttendanceForLesson(selectedLessonId, date).then((records) => {
      if (cancelled) return;
      const defaults: Record<string, boolean> = {};
      lesson?.students.forEach((s) => {
        defaults[s.id] = true;
      });
      setPresent({ ...defaults, ...records });
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLessonId, date]);

  const toggle = (studentId: string) => {
    setPresent((prev) => ({ ...prev, [studentId]: !(prev[studentId] ?? true) }));
  };

  const save = async () => {
    if (!selectedLessonId || !lesson) return;
    setSaving(true);
    const result = await markAttendance(
      { success: false, error: false },
      {
        lessonId: selectedLessonId,
        date,
        records: lesson.students.map((s) => ({
          studentId: s.id,
          present: present[s.id] ?? true,
        })),
      }
    );
    setSaving(false);
    if (result.success) {
      router.refresh();
    }
  };

  const presentCount = lesson
    ? lesson.students.filter((s) => present[s.id] ?? true).length
    : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex flex-col gap-2 w-full md:w-1/2">
          <label className="text-xs text-gray-500">Lesson</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            value={selectedLessonId ?? ""}
            onChange={(e) => setSelectedLessonId(parseInt(e.target.value))}
          >
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.subjectName} - {l.className} ({l.students.length} students)
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 w-full md:w-1/2">
          <label className="text-xs text-gray-500">Date</label>
          <input
            type="date"
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {lesson ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              {lesson.subjectName} - {lesson.className}
            </h2>
            {loading ? (
              <span className="text-xs text-gray-400">Loading...</span>
            ) : (
              <span className="text-xs text-gray-500">
                {presentCount}/{lesson.students.length} present
              </span>
            )}
          </div>

          {lesson.students.length === 0 ? (
            <div className="text-center text-gray-400 py-8 text-sm">
              No students in this class yet.
            </div>
          ) : (
            <div className="border border-gray-200 rounded-md divide-y divide-gray-100">
              {lesson.students.map((student) => {
                const isPresent = present[student.id] ?? true;
                return (
                  <div
                    key={student.id}
                    className="flex items-center justify-between px-4 py-3 text-sm"
                  >
                    <span className="font-medium">
                      {student.name} {student.surname}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggle(student.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                          isPresent
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                      >
                        {isPresent ? "Present" : "Absent"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {lesson.students.length > 0 && (
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition disabled:opacity-50 self-start"
            >
              {saving ? "Saving..." : "Mark Attendance"}
            </button>
          )}
        </>
      ) : (
        <div className="text-center text-gray-400 py-8 text-sm">
          No lessons with students found. Add lessons or students first.
        </div>
      )}
    </div>
  );
}
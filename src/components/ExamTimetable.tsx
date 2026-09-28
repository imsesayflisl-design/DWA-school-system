"use client";

import { useState } from "react";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const HOURS = Array.from({ length: 10 }, (_, i) => i + 8);

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
};

type ExamEvent = {
  id: number;
  title: string;
  fileUrl?: string | null;
  link?: string | null;
  lesson: {
    subject: { name: string };
    class: { name: string };
    teacher: { name: string; surname: string };
  };
  startTime: Date;
  endTime: Date;
};

export default function ExamTimetable({ exams }: { exams: ExamEvent[] }) {
  const [currentDate] = useState(new Date());

  const getWeekDates = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    startOfWeek.setDate(startOfWeek.getDate() + diff);
    startOfWeek.setHours(0, 0, 0, 0);

    return DAYS.map((_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      return d;
    });
  };

  const weekDates = getWeekDates();

  const getDayName = (date: Date) => {
    const names = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    return names[date.getDay()];
  };

  const getExamsForDayAndHour = (dayName: string, hour: number) => {
    return exams.filter((exam) => {
      const examDate = new Date(exam.startTime);
      const examDayName = getDayName(examDate);
      const examHour = examDate.getHours();
      return examDayName === dayName && examHour === hour;
    });
  };

  const getExamsForDay = (dayName: string) => {
    return exams.filter((exam) => {
      const examDate = new Date(exam.startTime);
      return getDayName(examDate) === dayName;
    });
  };

  const getExamsByClass = () => {
    const byClass = new Map<string, ExamEvent[]>();
    exams.forEach((exam) => {
      const className = exam.lesson.class.name;
      const existing = byClass.get(className) || [];
      existing.push(exam);
      byClass.set(className, existing);
    });
    return Array.from(byClass.entries());
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        <div className="grid grid-cols-6 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
          <div className="p-2 text-xs font-medium text-gray-500 border-r border-gray-200">Time</div>
          {weekDates.map((date, i) => (
            <div
              key={i}
              className="p-2 text-xs font-medium text-gray-500 border-r border-gray-200 text-center"
            >
              <div>{DAY_LABELS[DAYS[i]]}</div>
              <div className="text-gray-400">
                {date.getDate()}/{date.getMonth() + 1}
              </div>
            </div>
          ))}
        </div>

        {HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-6 border-b border-gray-100">
            <div className="p-2 text-xs text-gray-400 border-r border-gray-100">
              {hour.toString().padStart(2, "0")}:00
            </div>
            {DAYS.map((day) => {
              const dayExams = getExamsForDayAndHour(day, hour);
              return (
                <div
                  key={day}
                  className="p-1 border-r border-gray-100 min-h-[60px] relative"
                >
                  {dayExams.map((exam) => (
                    <div
                      key={exam.id}
                      className="bg-lamaSkyLight rounded p-1 mb-1 text-xs cursor-pointer hover:bg-lamaSky transition-colors"
                      title={`${exam.title} - ${exam.lesson.class.name}`}
                    >
                      <div className="font-semibold truncate">{exam.title}</div>
                      <div className="text-gray-500 truncate">
                        {exam.lesson.subject.name}
                      </div>
                      <div className="text-gray-400 truncate">
                        {exam.lesson.class.name}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-500 mb-2">Grouped by Class</h3>
        {getExamsByClass().map(([className, classExams]) => (
          <div key={className} className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-1">{className}</h4>
            <div className="space-y-1">
              {classExams.map((exam) => (
                <div
                  key={exam.id}
                  className="bg-white border border-gray-200 rounded p-2 flex items-center justify-between text-sm"
                >
                  <div>
                    <span className="font-medium">{exam.title}</span>
                    <span className="text-gray-500 ml-2">
                      {exam.lesson.subject.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {exam.fileUrl || exam.link ? (
                      <a
                        href={exam.fileUrl || exam.link || ""}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-500 text-xs hover:underline"
                      >
                        {exam.fileUrl ? "Download" : "Open"}
                      </a>
                    ) : null}
                    <div className="text-gray-400">
                      {DAY_LABELS[getDayName(new Date(exam.startTime)) as keyof typeof DAY_LABELS] ||
                        ""}{" "}
                      {new Date(exam.startTime).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-500 mb-2">Grouped by Date</h3>
        {DAYS.map((day) => {
          const dayExams = getExamsForDay(day);
          if (dayExams.length === 0) return null;
          return (
            <div key={day} className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-1">{DAY_LABELS[day]}</h4>
              <div className="space-y-1">
                {dayExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="bg-white border border-gray-200 rounded p-2 flex items-center justify-between text-sm"
                  >
                    <div>
                      <span className="font-medium">{exam.title}</span>
                      <span className="text-gray-500 ml-2">
                        {exam.lesson.subject.name}
                      </span>
                    </div>
                    <div className="text-gray-400">
                      {new Date(exam.startTime).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {new Date(exam.endTime).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="text-gray-400">{exam.lesson.class.name}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

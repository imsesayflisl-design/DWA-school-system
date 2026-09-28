"use client";

import { useMemo, useState } from "react";
import StudentForm from "./forms/StudentForm";
import TeacherForm from "./forms/TeacherForm";
import { useRouter } from "next/navigation";
import { Subject } from "@prisma/client";
import Image from "next/image";

const SignUpFlow = ({
  subjects,
}: {
  subjects: Subject[];
}) => {
  const [role, setRole] = useState<"student" | "teacher" | null>(null);
  const router = useRouter();

  const roleLabel = useMemo(() => {
    if (role === "student") return "Student";
    if (role === "teacher") return "Teacher";
    return "";
  }, [role]);

  return (
    <div className="min-h-screen bg-lamaSkyLight flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="p-10">
            <div className="flex items-center gap-3 mb-6">
              <Image src="/dwa-logo.png" alt="Divine Wonders Academy logo" width={40} height={40} className="w-10 h-10" />
              <div>
                <h1 className="text-2xl font-bold">Divine Wonders Academy</h1>
                <p className="text-sm text-gray-500">
                  Create your account as a student or teacher, then log in to access the dashboard.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                className={`rounded-2xl p-4 text-left border ${
                  role === "student" ? "border-blue-500 bg-blue-50" : "border-gray-200"
                }`}
                onClick={() => setRole("student")}
              >
                <div className="text-xs uppercase text-gray-500">I am a</div>
                <div className="text-xl font-semibold">Student</div>
                <div className="text-sm text-gray-500 mt-2">
                  Enroll, access class information, and view results.
                </div>
              </button>
              <button
                className={`rounded-2xl p-4 text-left border ${
                  role === "teacher" ? "border-blue-500 bg-blue-50" : "border-gray-200"
                }`}
                onClick={() => setRole("teacher")}
              >
                <div className="text-xs uppercase text-gray-500">I am a</div>
                <div className="text-xl font-semibold">Teacher</div>
                <div className="text-sm text-gray-500 mt-2">
                  Manage classes, lessons, exams, and student records.
                </div>
              </button>
            </div>

            <div className="space-y-2 text-sm text-gray-500">
              <p>
                If you already have an account, <button onClick={() => router.push("/sign-in")} className="text-blue-600 hover:underline">sign in here</button>.
              </p>
              <p>
                After signup, the form will redirect you to login automatically.
              </p>
            </div>
          </div>

          <div className="p-10 bg-slate-50">
            {!role ? (
              <div className="rounded-3xl border border-dashed border-gray-300 h-full flex items-center justify-center text-center p-8 text-gray-500">
                Select your role above to continue.
              </div>
            ) : (
              <div>
                <h2 className="text-lg font-semibold mb-4">{roleLabel} signup</h2>
                {role === "student" ? (
                  <StudentForm
                    type="create"
                    relatedData={{}}
                    redirectUrl="/sign-in"
                  />
                ) : (
                  <TeacherForm
                    type="create"
                    relatedData={{ subjects }}
                    redirectUrl="/sign-in"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpFlow;

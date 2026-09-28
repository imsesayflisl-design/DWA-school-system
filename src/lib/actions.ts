"use server";

import { revalidatePath } from "next/cache";
import {
  ClassSchema,
  ExamSchema,
  StudentSchema,
  SubjectSchema,
  TeacherSchema,
  LessonSchema,
  AssignmentSchema,
  ResultSchema,
  EventSchema,
  AnnouncementSchema,
  ParentSchema,
  CreateAssignmentSchema,
} from "./formValidationSchemas";
import prisma from "./prisma";
import { createClerkClient } from "@clerk/backend";
import { auth } from "@clerk/nextjs/server";
import { getRole } from "./roles";
import { notifyUsers, notifyClass, notifyEveryone } from "./notifications";
import { emitDataUpdated, emitNewMessage, emitGroupMessage } from "./socket-server";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

type CurrentState = { success: boolean; error: boolean };

async function resolveGrade(gradeInput: string) {
  const level = parseInt(gradeInput);
  if (isNaN(level)) throw new Error("Invalid grade level");
  return prisma.grade.upsert({
    where: { level },
    create: { level },
    update: {},
  });
}

async function resolveClass(className: string, gradeId: number) {
  return prisma.class.upsert({
    where: { name: className },
    create: { name: className, capacity: 30, gradeId },
    update: {},
  });
}

export const createSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
) => {
  try {
    await prisma.subject.create({
      data: {
        name: data.name,
        teachers: {
          connect: data.teachers.map((teacherId) => ({ id: teacherId })),
        },
      },
    });

    // revalidatePath("/list/subjects");
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
) => {
  try {
    await prisma.subject.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        teachers: {
          set: data.teachers.map((teacherId) => ({ id: teacherId })),
        },
      },
    });

    // revalidatePath("/list/subjects");
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteSubject = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await prisma.subject.delete({
      where: {
        id: parseInt(id),
      },
    });

    // revalidatePath("/list/subjects");
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createClass = async (
  currentState: CurrentState,
  data: ClassSchema
) => {
  try {
    const grade = await resolveGrade(data.gradeId);

    await prisma.class.create({
      data: {
        name: data.name,
        capacity: data.capacity,
        gradeId: grade.id,
        supervisorId: data.supervisorId || null,
      },
    });

    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateClass = async (
  currentState: CurrentState,
  data: ClassSchema
) => {
  try {
    const grade = await resolveGrade(data.gradeId);

    await prisma.class.update({
      where: { id: data.id },
      data: {
        name: data.name,
        capacity: data.capacity,
        gradeId: grade.id,
        supervisorId: data.supervisorId || null,
      },
    });

    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteClass = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await prisma.class.delete({
      where: {
        id: parseInt(id),
      },
    });

    // revalidatePath("/list/class");
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
) => {
  try {
    if (!data.password) {
      return { success: false, error: true };
    }

    const user = await clerkClient.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      emailAddress: data.email ? [data.email] : [],
      publicMetadata:{role:"teacher"}
    });

    try {
      await prisma.teacher.create({
        data: {
          id: user.id,
          username: data.username,
          name: data.name,
          surname: data.surname,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address,
          img: data.img || null,
          bloodType: data.bloodType,
          sex: data.sex,
          birthday: data.birthday,
          subjects: {
            connect: data.subjects?.map((subjectId: string) => ({
              id: parseInt(subjectId),
            })),
          },
        },
      });
    } catch (err) {
      await clerkClient.users.deleteUser(user.id);
      throw err;
    }

    // revalidatePath("/list/teachers");
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }
  try {
    const user = await clerkClient.users.updateUser(data.id, {
      username: data.username,
      ...(data.password !== "" && { password: data.password }),
      firstName: data.name,
      lastName: data.surname,
    });

    await prisma.teacher.update({
      where: {
        id: data.id,
      },
      data: {
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        subjects: {
          set: data.subjects?.map((subjectId: string) => ({
            id: parseInt(subjectId),
          })),
        },
      },
    });
    // revalidatePath("/list/teachers");
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteTeacher = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await clerkClient.users.deleteUser(id);

    await prisma.teacher.delete({
      where: {
        id: id,
      },
    });

    // revalidatePath("/list/teachers");
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createStudent = async (
  currentState: CurrentState,
  data: StudentSchema & {
    parentName?: string;
    parentSurname?: string;
    parentEmail?: string;
    parentPhone?: string;
    parentAddress?: string;
  }
) => {
  console.log(data);
  try {
    if (!data.password) {
      return { success: false, error: true };
    }

    const grade = await resolveGrade(data.gradeId);
    const classItem = await resolveClass(data.classId, grade.id);

    const classWithCount = await prisma.class.findUnique({
      where: { id: classItem.id },
      include: { _count: { select: { students: true } } },
    });

    if (classWithCount && classWithCount.capacity === classWithCount._count.students) {
      return { success: false, error: true };
    }

    const parentUsername = `parent_${Date.now()}`;

    const parent = await prisma.parent.create({
      data: {
        id: parentUsername,
        username: parentUsername,
        name: data.parentName || "Unknown",
        surname: data.parentSurname || "Parent",
        email: data.parentEmail || null,
        phone: data.parentPhone || "0000000000",
        address: data.parentAddress || "Not provided",
      },
    });

    const user = await clerkClient.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      emailAddress: data.email ? [data.email] : [],
      publicMetadata: { role: "student" },
    });

    try {
      await prisma.student.create({
        data: {
          id: user.id,
          username: data.username,
          name: data.name,
          surname: data.surname,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address,
          img: data.img || null,
          bloodType: data.bloodType,
          sex: data.sex,
          birthday: data.birthday,
          gradeId: grade.id,
          classId: classItem.id,
          parentId: parent.id,
        },
      });
    } catch (err) {
      await clerkClient.users.deleteUser(user.id);
      await prisma.parent.delete({ where: { id: parent.id } });
      throw err;
    }

    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }
  try {
    const user = await clerkClient.users.updateUser(data.id, {
      username: data.username,
      ...(data.password !== "" && { password: data.password }),
      firstName: data.name,
      lastName: data.surname,
    });

    const grade = await resolveGrade(data.gradeId);
    const classItem = await resolveClass(data.classId, grade.id);

    await prisma.student.update({
      where: { id: data.id },
      data: {
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        gradeId: grade.id,
        classId: classItem.id,
        parentId: data.parentId,
      },
    });
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteStudent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await clerkClient.users.deleteUser(id);

    await prisma.student.delete({
      where: {
        id: id,
      },
    });

    // revalidatePath("/list/students");
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createExam = async (
  currentState: CurrentState,
  data: ExamSchema
) => {
  // const { userId, sessionClaims } = auth();
  // const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    // if (role === "teacher") {
    //   const teacherLesson = await prisma.lesson.findFirst({
    //     where: {
    //       teacherId: userId!,
    //       id: data.lessonId,
    //     },
    //   });

    //   if (!teacherLesson) {
    //     return { success: false, error: true };
    //   }
    // }

    await prisma.exam.create({
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId,
        fileUrl: data.fileUrl || null,
        link: data.link || null,
      },
    });

    const lesson = await prisma.lesson.findUnique({
      where: { id: data.lessonId },
      select: { classId: true },
    });
    if (lesson) {
      notifyClass(lesson.classId, {
        title: "New exam posted",
        message: `A new exam "${data.title}" has been scheduled.`,
        type: "exam",
        link: "/list/exams",
      });
    }

    // revalidatePath("/list/subjects");
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateExam = async (
  currentState: CurrentState,
  data: ExamSchema
) => {
  // const { userId, sessionClaims } = auth();
  // const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    // if (role === "teacher") {
    //   const teacherLesson = await prisma.lesson.findFirst({
    //     where: {
    //       teacherId: userId!,
    //       id: data.lessonId,
    //     },
    //   });

    //   if (!teacherLesson) {
    //     return { success: false, error: true };
    //   }
    // }

    await prisma.exam.update({
      where: {
        id: data.id,
      },
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId,
        fileUrl: data.fileUrl || null,
        link: data.link || null,
      },
    });

    // revalidatePath("/list/subjects");
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteExam = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  // const { userId, sessionClaims } = auth();
  // const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    await prisma.exam.delete({
      where: {
        id: parseInt(id),
        // ...(role === "teacher" ? { lesson: { teacherId: userId! } } : {}),
      },
    });

    // revalidatePath("/list/subjects");
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

// === LESSON ACTIONS ===

export const createLesson = async (
  currentState: CurrentState,
  data: LessonSchema
) => {
  try {
    await prisma.lesson.create({ data });
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateLesson = async (
  currentState: CurrentState,
  data: LessonSchema
) => {
  try {
    await prisma.lesson.update({
      where: { id: data.id },
      data: {
        name: data.name,
        day: data.day,
        startTime: data.startTime,
        endTime: data.endTime,
        subjectId: data.subjectId,
        classId: data.classId,
        teacherId: data.teacherId,
      },
    });
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteLesson = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await prisma.lesson.delete({ where: { id: parseInt(id) } });
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

// === ASSIGNMENT ACTIONS ===

export const createAssignment = async (
  currentState: CurrentState,
  data: AssignmentSchema
) => {
  try {
    await prisma.assignment.create({
      data: {
        title: data.title,
        description: data.description || null,
        type: data.type || "EASY_QUESTION",
        startDate: data.startDate,
        dueDate: data.dueDate,
        lessonId: data.lessonId,
      },
    });

    const lesson = await prisma.lesson.findUnique({
      where: { id: data.lessonId },
      select: { classId: true },
    });
    if (lesson) {
      notifyClass(lesson.classId, {
        title: "New assignment",
        message: `A new assignment "${data.title}" was posted for your class.`,
        type: "assignment",
        link: "/list/assignments",
      });
    }

    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createAssignmentWithQuestions = async (
  currentState: CurrentState,
  data: {
    title: string;
    description?: string;
    type: "EASY_QUESTION" | "OBJECTIVE";
    startDate: Date;
    dueDate: Date;
    lessonId: number;
    questions: {
      questionText: string;
      type: "EASY_QUESTION" | "OBJECTIVE";
      options?: { label: string; text: string }[];
      correctAnswer?: string;
      points: number;
    }[];
  }
) => {
  try {
    const assignment = await prisma.assignment.create({
      data: {
        title: data.title,
        description: data.description || null,
        type: data.type,
        startDate: data.startDate,
        dueDate: data.dueDate,
        lessonId: data.lessonId,
        questions: {
          create: data.questions.map((q) => ({
            questionText: q.questionText,
            type: q.type,
            options: q.options || undefined,
            correctAnswer: q.correctAnswer || null,
            points: q.points,
          })),
        },
      },
    });

    emitDataUpdated({ type: "assignment" });

    const lesson = await prisma.lesson.findUnique({
      where: { id: data.lessonId },
      select: { classId: true },
    });
    if (lesson) {
      notifyClass(lesson.classId, {
        title: "New assignment",
        message: `A new assignment "${data.title}" was posted for your class.`,
        type: "assignment",
        link: "/list/assignments",
      });
    }

    return { success: true, error: false, data: assignment };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateAssignment = async (
  currentState: CurrentState,
  data: AssignmentSchema
) => {
  try {
    await prisma.assignment.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description || null,
        type: data.type,
        startDate: data.startDate,
        dueDate: data.dueDate,
        lessonId: data.lessonId,
      },
    });
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteAssignment = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await prisma.assignment.delete({ where: { id: parseInt(id) } });
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

// === ASSIGNMENT SUBMISSION ACTIONS ===

export const submitAssignment = async (
  currentState: CurrentState,
  data: {
    assignmentId: number;
    answers: { questionId: number; answer: string }[];
  }
) => {
  try {
    const { userId } = auth();
    if (!userId) return { success: false, error: true };

    const assignment = await prisma.assignment.findUnique({
      where: { id: data.assignmentId },
      include: { questions: true },
    });

    if (!assignment) return { success: false, error: true };

    let totalPoints = 0;
    let earnedPoints = 0;

    for (const question of assignment.questions) {
      totalPoints += question.points;
      const studentAnswer = data.answers.find(
        (a) => a.questionId === question.id
      );
      if (question.type === "OBJECTIVE" && question.correctAnswer) {
        if (studentAnswer?.answer === question.correctAnswer) {
          earnedPoints += question.points;
        }
      }
    }

    const isAllObjective = assignment.questions.every(
      (q) => q.type === "OBJECTIVE"
    );

    await prisma.assignmentSubmission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId: data.assignmentId,
          studentId: userId,
        },
      },
      update: {
        answers: data.answers,
        score: isAllObjective ? earnedPoints : null,
        totalPoints,
        submittedAt: new Date(),
        status: isAllObjective ? "GRADED" : "SUBMITTED",
        gradedAt: isAllObjective ? new Date() : null,
      },
      create: {
        assignmentId: data.assignmentId,
        studentId: userId,
        answers: data.answers,
        score: isAllObjective ? earnedPoints : null,
        totalPoints,
        status: isAllObjective ? "GRADED" : "SUBMITTED",
        gradedAt: isAllObjective ? new Date() : null,
      },
    });

    if (isAllObjective) {
      await prisma.result.create({
        data: {
          score: earnedPoints,
          assignmentId: data.assignmentId,
          studentId: userId,
          comment: `Auto-graded: ${earnedPoints}/${totalPoints}`,
        },
      });
    }

    revalidatePath("/list/assignments");
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const gradeSubmission = async (
  currentState: CurrentState,
  data: {
    submissionId: number;
    score: number;
    comment?: string;
  }
) => {
  try {
    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: data.submissionId },
      include: { assignment: true },
    });

    if (!submission) return { success: false, error: true };

    await prisma.assignmentSubmission.update({
      where: { id: data.submissionId },
      data: {
        score: data.score,
        status: "GRADED",
        gradedAt: new Date(),
      },
    });

    await prisma.result.create({
      data: {
        score: data.score,
        assignmentId: submission.assignmentId,
        studentId: submission.studentId,
        comment: data.comment || `Graded: ${data.score}/${submission.totalPoints}`,
      },
    });

    notifyUsers([submission.studentId], {
      title: "Assignment graded",
      message: `Your assignment "${submission.assignment.title}" was graded: ${data.score}/${submission.totalPoints}`,
      type: "grade",
      link: "/list/results",
    });

    revalidatePath("/list/assignments");
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

// === MESSAGING ACTIONS ===

export const sendMessage = async (data: {
  receiverId: string;
  content: string;
}) => {
  try {
    const { userId } = auth();
    if (!userId) return { success: false, error: true };

    const { sessionClaims } = auth();
    const role = (sessionClaims?.metadata as { role?: string })?.role || "student";

    const message = await prisma.message.create({
      data: {
        senderId: userId,
        receiverId: data.receiverId,
        content: data.content,
        senderRole: role,
      },
    });

    emitNewMessage({
      senderId: userId,
      receiverId: data.receiverId,
      content: data.content,
      createdAt: new Date(),
      senderRole: role,
    });

    revalidatePath("/messages");
    return { success: true, error: false, data: message };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const markMessagesAsRead = async (otherUserId: string) => {
  try {
    const { userId } = auth();
    if (!userId) return;

    await prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: userId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
  } catch (err) {
    console.log(err);
  }
};

export const getConversations = async () => {
  try {
    const { userId } = auth();
    if (!userId) return [];

    const sentMessages = await prisma.message.findMany({
      where: { senderId: userId },
      select: { receiverId: true },
      distinct: ["receiverId"],
    });

    const receivedMessages = await prisma.message.findMany({
      where: { receiverId: userId },
      select: { senderId: true },
      distinct: ["senderId"],
    });

    const contactIds = new Set([
      ...sentMessages.map((m) => m.receiverId),
      ...receivedMessages.map((m) => m.senderId),
    ]);

    const conversations = await Promise.all(
      Array.from(contactIds).map(async (contactId) => {
        const lastMessage = await prisma.message.findFirst({
          where: {
            OR: [
              { senderId: userId, receiverId: contactId },
              { senderId: contactId, receiverId: userId },
            ],
          },
          orderBy: { createdAt: "desc" },
        });

        const unreadCount = await prisma.message.count({
          where: { senderId: contactId, receiverId: userId, readAt: null },
        });

        return { userId: contactId, lastMessage, unreadCount };
      })
    );

    return conversations;
  } catch (err) {
    console.log(err);
    return [];
  }
};

export const getMessages = async (otherUserId: string) => {
  try {
    const { userId } = auth();
    if (!userId) return [];

    return prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: "asc" },
    });
  } catch (err) {
    console.log(err);
    return [];
  }
};

// === GROUP CHAT ACTIONS ===

async function canAccessGroup(userId: string, role: string, groupId: number) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      classId: true,
      class: { select: { id: true, supervisorId: true } },
    },
  });
  if (!group) return false;
  if (role === "admin") return true;
  if (role === "student") {
    const student = await prisma.student.findUnique({
      where: { id: userId },
      select: { classId: true },
    });
    return student?.classId === group.classId;
  }
  if (role === "teacher") {
    const teacher = await prisma.teacher.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!teacher) return false;
    const lesson = await prisma.lesson.findFirst({
      where: { teacherId: userId, classId: group.classId },
      select: { id: true },
    });
    return Boolean(lesson) || group.class.supervisorId === userId;
  }
  return false;
}

export const getGroupMessages = async (groupId: number) => {
  try {
    const { userId } = auth();
    if (!userId) return [];
    const role = await getRole();
    if (!role || !(await canAccessGroup(userId, role, groupId))) return [];

    return prisma.groupMessage.findMany({
      where: { groupId },
      orderBy: { createdAt: "asc" },
    });
  } catch (err) {
    console.log(err);
    return [];
  }
};

export const sendGroupMessage = async (groupId: number, content: string) => {
  try {
    const { userId } = auth();
    if (!userId || !content?.trim()) return { success: false };
    const role = await getRole();
    if (!role || !(await canAccessGroup(userId, role, groupId))) {
      return { success: false };
    }

    let senderName = userId;
    if (role === "student") {
      const s = await prisma.student.findUnique({
        where: { id: userId },
        select: { name: true, surname: true },
      });
      if (s) senderName = `${s.name} ${s.surname}`;
    } else if (role === "teacher") {
      const t = await prisma.teacher.findUnique({
        where: { id: userId },
        select: { name: true, surname: true },
      });
      if (t) senderName = `${t.name} ${t.surname}`;
    } else if (role === "admin") {
      const a = await prisma.admin.findUnique({
        where: { id: userId },
        select: { username: true },
      });
      if (a) senderName = a.username;
    }

    const message = await prisma.groupMessage.create({
      data: {
        groupId,
        senderId: userId,
        senderName,
        senderRole: role,
        content: content.trim(),
      },
    });
    emitGroupMessage(message);
    return { success: true, message };
  } catch (err) {
    console.log(err);
    return { success: false };
  }
};

// === NOTIFICATION ACTIONS ===

export const getMyNotifications = async () => {
  try {
    const { userId } = auth();
    if (!userId) return [];

    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
  } catch (err) {
    console.log(err);
    return [];
  }
};

export const markAllNotificationsRead = async () => {
  try {
    const { userId } = auth();
    if (!userId) return { success: false };

    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { success: true };
  } catch (err) {
    console.log(err);
    return { success: false };
  }
};

// === RESULT ACTIONS ===

export const createResult = async (
  currentState: CurrentState,
  data: ResultSchema
) => {
  try {
    await prisma.result.create({
      data: {
        score: data.score,
        examId: data.examId || null,
        assignmentId: data.assignmentId || null,
        studentId: data.studentId,
      },
    });
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateResult = async (
  currentState: CurrentState,
  data: ResultSchema
) => {
  try {
    await prisma.result.update({
      where: { id: data.id },
      data: {
        score: data.score,
        examId: data.examId || null,
        assignmentId: data.assignmentId || null,
        studentId: data.studentId,
      },
    });
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteResult = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await prisma.result.delete({ where: { id: parseInt(id) } });
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

// === EVENT ACTIONS ===

export const createEvent = async (
  currentState: CurrentState,
  data: EventSchema
) => {
  try {
    await prisma.event.create({
      data: {
        title: data.title,
        description: data.description || "",
        startTime: data.startTime,
        endTime: data.endTime,
        classId: data.classId || null,
      },
    });
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateEvent = async (
  currentState: CurrentState,
  data: EventSchema
) => {
  try {
    await prisma.event.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description || "",
        startTime: data.startTime,
        endTime: data.endTime,
        classId: data.classId || null,
      },
    });
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteEvent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await prisma.event.delete({ where: { id: parseInt(id) } });
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

// === ANNOUNCEMENT ACTIONS ===

export const createAnnouncement = async (
  currentState: CurrentState,
  data: AnnouncementSchema
) => {
  try {
    await prisma.announcement.create({
      data: {
        title: data.title,
        description: data.description,
        date: data.date,
        classId: data.classId || null,
      },
    });

    if (data.classId) {
      notifyClass(data.classId, {
        title: "New announcement",
        message: data.description,
        type: "announcement",
        link: "/list/announcements",
      });
    } else {
      notifyEveryone({
        title: "New announcement",
        message: data.description,
        type: "announcement",
        link: "/list/announcements",
      });
    }

    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateAnnouncement = async (
  currentState: CurrentState,
  data: AnnouncementSchema
) => {
  try {
    await prisma.announcement.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description,
        date: data.date,
        classId: data.classId || null,
      },
    });
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteAnnouncement = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await prisma.announcement.delete({ where: { id: parseInt(id) } });
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

// === PARENT ACTIONS ===

export const createParent = async (
  currentState: CurrentState,
  data: ParentSchema
) => {
  try {
    if (!data.password) {
      return { success: false, error: true };
    }

    const user = await clerkClient.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      emailAddress: data.email ? [data.email] : [],
      publicMetadata: { role: "parent" },
    });

    try {
      await prisma.parent.create({
        data: {
          id: user.id,
          username: data.username,
          name: data.name,
          surname: data.surname,
          email: data.email || null,
          phone: data.phone,
          address: data.address,
        },
      });
    } catch (err) {
      await clerkClient.users.deleteUser(user.id);
      throw err;
    }

    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateParent = async (
  currentState: CurrentState,
  data: ParentSchema
) => {
  if (!data.id) return { success: false, error: true };
  try {
    await clerkClient.users.updateUser(data.id, {
      username: data.username,
      ...(data.password !== "" && { password: data.password }),
      firstName: data.name,
      lastName: data.surname,
    });

    await prisma.parent.update({
      where: { id: data.id },
      data: {
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone,
        address: data.address,
      },
    });
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteParent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await clerkClient.users.deleteUser(id);
    await prisma.parent.delete({ where: { id } });
    emitDataUpdated();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

// === ATTENDANCE ACTIONS ===

const toLocalDay = (date: Date | string) => {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export const markAttendance = async (
  currentState: CurrentState,
  data: {
    lessonId: number;
    date: string;
    records: { studentId: string; present: boolean }[];
  }
) => {
  try {
    const { userId } = auth();
    if (!userId) return { success: false, error: true };

    const day = toLocalDay(data.date);

    await prisma.$transaction([
      prisma.attendance.deleteMany({
        where: { lessonId: data.lessonId, date: day },
      }),
      prisma.attendance.createMany({
        data: data.records.map((r) => ({
          studentId: r.studentId,
          lessonId: data.lessonId,
          date: day,
          present: r.present,
        })),
      }),
    ]);

    emitDataUpdated({ type: "attendance" });
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const getAttendanceForLesson = async (lessonId: number, date: string) => {
  try {
    const day = toLocalDay(date);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);

    const records = await prisma.attendance.findMany({
      where: { lessonId, date: { gte: day, lt: next } },
      select: { studentId: true, present: true },
    });

    return records.reduce<Record<string, boolean>>(
      (acc, r) => ({ ...acc, [r.studentId]: r.present }),
      {}
    );
  } catch (err) {
    console.log(err);
    return {};
  }
};

export const deleteAttendance = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await prisma.attendance.delete({ where: { id: parseInt(id) } });
    emitDataUpdated({ type: "attendance" });
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

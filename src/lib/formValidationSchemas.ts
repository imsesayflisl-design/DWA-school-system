import { z } from "zod";

export const assignmentQuestionSchema = z.object({
  questionText: z.string().min(1, "Question text is required"),
  type: z.enum(["EASY_QUESTION", "OBJECTIVE"]),
  options: z.array(z.object({ label: z.string(), text: z.string() })).optional(),
  correctAnswer: z.string().optional(),
  points: z.coerce.number().min(1).default(1),
});

export type AssignmentQuestionSchema = z.infer<typeof assignmentQuestionSchema>;

export const createAssignmentSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.enum(["EASY_QUESTION", "OBJECTIVE"]),
  startDate: z.coerce.date({ message: "Start date is required" }),
  dueDate: z.coerce.date({ message: "Due date is required" }),
  lessonId: z.coerce.number({ message: "Lesson is required" }),
  questions: z.array(assignmentQuestionSchema).min(1, "At least one question is required"),
});

export type CreateAssignmentSchema = z.infer<typeof createAssignmentSchema>;

export const submitAssignmentSchema = z.object({
  assignmentId: z.coerce.number(),
  answers: z.array(z.object({
    questionId: z.coerce.number(),
    answer: z.string(),
  })),
});

export type SubmitAssignmentSchema = z.infer<typeof submitAssignmentSchema>;

export const subjectSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "Subject name is required!" }),
  teachers: z.array(z.string()), //teacher ids
});

export type SubjectSchema = z.infer<typeof subjectSchema>;

export const classSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "Subject name is required!" }),
  capacity: z.coerce.number().min(1, { message: "Capacity name is required!" }),
  gradeId: z.string().min(1, { message: "Grade name is required!" }),
  supervisorId: z.coerce.string().optional(),
});

export type ClassSchema = z.infer<typeof classSchema>;

export const teacherSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long!" })
    .max(20, { message: "Username must be at most 20 characters long!" })
    .regex(/^[a-zA-Z0-9_-]+$/, { message: "Username can only contain letters, numbers, hyphens (-) and underscores (_)!" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter!" })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter!" })
    .regex(/[0-9]/, { message: "Password must contain at least one number!" })
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, { message: "First name is required!" }),
  surname: z.string().min(1, { message: "Last name is required!" }),
  email: z
    .string()
    .email({ message: "Invalid email address!" })
    .optional()
    .or(z.literal("")),
  phone: z.string().optional(),
  address: z.string(),
  img: z.string().optional(),
  bloodType: z.string().min(1, { message: "Blood Type is required!" }),
  birthday: z.coerce.date({ message: "Birthday is required!" }),
  sex: z.enum(["MALE", "FEMALE"], { message: "Sex is required!" }),
  subjects: z.array(z.string()).optional(), // subject ids
});

export type TeacherSchema = z.infer<typeof teacherSchema>;

export const studentSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long!" })
    .max(20, { message: "Username must be at most 20 characters long!" })
    .regex(/^[a-zA-Z0-9_-]+$/, { message: "Username can only contain letters, numbers, hyphens (-) and underscores (_)!" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter!" })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter!" })
    .regex(/[0-9]/, { message: "Password must contain at least one number!" })
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, { message: "First name is required!" }),
  surname: z.string().min(1, { message: "Last name is required!" }),
  email: z
    .string()
    .email({ message: "Invalid email address!" })
    .optional()
    .or(z.literal("")),
  phone: z.string().optional(),
  address: z.string(),
  img: z.string().optional(),
  bloodType: z.string().min(1, { message: "Blood Type is required!" }),
  birthday: z.coerce.date({ message: "Birthday is required!" }),
  sex: z.enum(["MALE", "FEMALE"], { message: "Sex is required!" }),
  gradeId: z.string().min(1, { message: "Grade is required!" }),
  classId: z.string().min(1, { message: "Class is required!" }),
  parentId: z.string().optional(), // Make optional for signup (can be set later)
});

export type StudentSchema = z.infer<typeof studentSchema>;

export const createStudentSchema = studentSchema.extend({
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter!" })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter!" })
    .regex(/[0-9]/, { message: "Password must contain at least one number!" }),
  parentName: z.string().min(1, "Parent first name is required"),
  parentSurname: z.string().min(1, "Parent last name is required"),
  parentEmail: z.string().email().optional().or(z.literal("")),
  parentPhone: z.string().min(1, "Parent phone is required"),
  parentAddress: z.string().min(1, "Parent address is required"),
});

export type CreateStudentSchema = z.infer<typeof createStudentSchema>;

export const createTeacherSchema = teacherSchema.extend({
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter!" })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter!" })
    .regex(/[0-9]/, { message: "Password must contain at least one number!" }),
});

export type CreateTeacherSchema = z.infer<typeof createTeacherSchema>;

export const examSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title name is required!" }),
  startTime: z.coerce.date({ message: "Start time is required!" }),
  endTime: z.coerce.date({ message: "End time is required!" }),
  lessonId: z.coerce.number({ message: "Lesson is required!" }),
  fileUrl: z.string().optional(),
  link: z.string().optional(),
});

export type ExamSchema = z.infer<typeof examSchema>;

export const lessonSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "Lesson name is required!" }),
  day: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"], { message: "Day is required!" }),
  startTime: z.coerce.date({ message: "Start time is required!" }),
  endTime: z.coerce.date({ message: "End time is required!" }),
  subjectId: z.coerce.number({ message: "Subject is required!" }),
  classId: z.coerce.number({ message: "Class is required!" }),
  teacherId: z.string().min(1, { message: "Teacher is required!" }),
});

export type LessonSchema = z.infer<typeof lessonSchema>;

export const assignmentSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title is required!" }),
  description: z.string().optional(),
  type: z.enum(["EASY_QUESTION", "OBJECTIVE"]).optional(),
  startDate: z.coerce.date({ message: "Start date is required!" }),
  dueDate: z.coerce.date({ message: "Due date is required!" }),
  lessonId: z.coerce.number({ message: "Lesson is required!" }),
});

export type AssignmentSchema = z.infer<typeof assignmentSchema>;

export const resultSchema = z.object({
  id: z.coerce.number().optional(),
  score: z.coerce.number().min(0, { message: "Score must be at least 0" }).max(100, { message: "Score must be at most 100" }),
  examId: z.union([z.coerce.number(), z.literal("")]).optional().nullable().transform(v => v || null),
  assignmentId: z.union([z.coerce.number(), z.literal("")]).optional().nullable().transform(v => v || null),
  studentId: z.string().min(1, { message: "Student is required!" }),
});

export type ResultSchema = z.infer<typeof resultSchema>;

export const eventSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title is required!" }),
  description: z.string().optional(),
  startTime: z.coerce.date({ message: "Start time is required!" }),
  endTime: z.coerce.date({ message: "End time is required!" }),
  classId: z.union([z.coerce.number(), z.literal("")]).optional().nullable().transform(v => v || null),
});

export type EventSchema = z.infer<typeof eventSchema>;

export const announcementSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title is required!" }),
  description: z.string().min(1, { message: "Description is required!" }),
  date: z.coerce.date({ message: "Date is required!" }),
  classId: z.union([z.coerce.number(), z.literal("")]).optional().nullable().transform(v => v || null),
});

export type AnnouncementSchema = z.infer<typeof announcementSchema>;

export const parentSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long!" })
    .max(20, { message: "Username must be at most 20 characters long!" })
    .regex(/^[a-zA-Z0-9_-]+$/, { message: "Username can only contain letters, numbers, hyphens (-) and underscores (_)!" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long!" })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter!" })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter!" })
    .regex(/[0-9]/, { message: "Password must contain at least one number!" })
    .optional()
    .or(z.literal("")),
  name: z.string().min(1, { message: "First name is required!" }),
  surname: z.string().min(1, { message: "Last name is required!" }),
  email: z
    .string()
    .email({ message: "Invalid email address!" })
    .optional()
    .or(z.literal("")),
  phone: z.string().min(1, { message: "Phone is required!" }),
  address: z.string().min(1, { message: "Address is required!" }),
});

export type ParentSchema = z.infer<typeof parentSchema>;

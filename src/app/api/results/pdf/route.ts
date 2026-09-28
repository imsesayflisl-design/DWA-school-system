import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { getRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

const MARGIN = 48;

type Row = {
  subject: string;
  title: string;
  typeLabel: string;
  score: number;
  comment: string;
};

function clip(text: string, max: number) {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

export async function GET() {
  const { userId } = auth();
  const role = await getRole();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (role !== "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const student = await prisma.student.findUnique({
    where: { id: userId },
    include: { class: true, grade: true },
  });
  if (!student) {
    return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
  }

  const results = await prisma.result.findMany({
    where: { studentId: userId },
    orderBy: { id: "desc" },
    include: {
      exam: {
        include: {
          lesson: {
            include: {
              subject: true,
              teacher: { select: { name: true, surname: true } },
            },
          },
        },
      },
      assignment: {
        include: {
          lesson: {
            include: {
              subject: true,
              teacher: { select: { name: true, surname: true } },
            },
          },
        },
      },
    },
  });

  const rows: Row[] = results.map((r) => ({
    subject: r.exam?.lesson.subject.name || r.assignment?.lesson.subject.name || "N/A",
    title: r.exam?.title || r.assignment?.title || "Result",
    typeLabel: r.exam ? "Exam" : "Assignment",
    score: Math.min(Math.round(r.score), 100),
    comment: r.comment || "—",
  }));

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([595.28, 841.89]);
  let y = 800;

  const drawHeader = () => {
    page.drawText(new Date().toLocaleDateString("en-US"), {
      x: 595.28 - MARGIN - 60,
      y: 820,
      size: 8,
      font,
    });
    page.drawText("DIVINE WONDERS ACADEMY", { x: MARGIN, y: y, size: 16, font: bold });
    y -= 20;
    page.drawText(`${student.name} ${student.surname} - Result Report`, { x: MARGIN, y, size: 11, font });
    y -= 26;
    page.drawText(
      `Class: ${student.class.name}  |  Grade: ${student.grade.level}  |  Username: ${student.username}`,
      { x: MARGIN, y, size: 9, font }
    );
    y -= 22;
    page.drawRectangle({ x: MARGIN, y, width: 595.28 - MARGIN * 2, height: 0.6, color: rgb(0.75, 0.75, 0.75) });
    y -= 22;

    page.drawText("Subject", { x: MARGIN, y, size: 9, font: bold });
    page.drawText("Assessment", { x: MARGIN + 175, y, size: 9, font: bold });
    page.drawText("Type", { x: MARGIN + 340, y, size: 9, font: bold });
    page.drawText("Score", { x: MARGIN + 390, y, size: 9, font: bold });
    page.drawText("Comment", { x: MARGIN + 455, y, size: 9, font: bold });
    y -= 18;
  };

  drawHeader();

  if (rows.length === 0) {
    page.drawText("No results recorded yet.", { x: MARGIN, y, size: 10, font });
  }

  let total = 0;

  rows.forEach((row, i) => {
    total += row.score;

    if (y < 80) {
      page = doc.addPage([595.28, 841.89]);
      y = 800;
      drawHeader();
    }

    if (i % 2 === 1) {
      page.drawRectangle({ x: MARGIN - 4, y: y - 11, width: 595.28 - (MARGIN - 4) * 2, height: 18, color: rgb(0.965, 0.965, 0.99) });
    }

    page.drawText(clip(row.subject, 22), { x: MARGIN, y, size: 9, font });
    page.drawText(clip(row.title, 24), { x: MARGIN + 175, y, size: 9, font });
    page.drawText(row.typeLabel, { x: MARGIN + 340, y, size: 9, font });
    page.drawText(`${row.score}%`, { x: MARGIN + 390, y, size: 9, font: bold, color: rgb(0.2, 0.45, 0.85) });
    page.drawText(clip(row.comment, 26), { x: MARGIN + 455, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) });

    y -= 22;
  });

  y -= 8;
  page.drawText(
    `Average Score: ${rows.length ? Math.round(total / rows.length) : 0}%  (${rows.length} assessment${rows.length === 1 ? "" : "s"})`,
    { x: MARGIN, y, size: 10, font: bold, color: rgb(0.1, 0.1, 0.1) }
  );

  const bytes = await doc.save();
  const fileName = `${student.name}_${student.surname}_results.pdf`.replace(/[^a-zA-Z0-9_\-.]/g, "_");

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const grades = await prisma.grade.count();
  const classes = await prisma.class.count();
  const subjects = await prisma.subject.count();
  const admins = await prisma.admin.count();

  console.log(
    JSON.stringify({ grades, classes, subjects, admins }, null, 2)
  );

  if (grades === 0) {
    for (let i = 1; i <= 6; i++) {
      await prisma.grade.create({ data: { level: i } });
    }
    console.log("Created grades 1-6");
  }

  if (classes === 0) {
    for (let i = 1; i <= 6; i++) {
      await prisma.class.create({
        data: {
          name: `${i}A`,
          gradeId: i,
          capacity: 20,
        },
      });
    }
    console.log("Created classes 1A-6A");
  }

  if (subjects === 0) {
    const subjectData = [
      { name: "Mathematics" },
      { name: "Science" },
      { name: "English" },
      { name: "History" },
      { name: "Geography" },
      { name: "Physics" },
      { name: "Chemistry" },
      { name: "Biology" },
      { name: "Computer Science" },
      { name: "Art" },
    ];
    for (const subject of subjectData) {
      await prisma.subject.create({ data: subject });
    }
    console.log("Created subjects");
  }

  const final = {
    grades: await prisma.grade.count(),
    classes: await prisma.class.count(),
    subjects: await prisma.subject.count(),
    admins: await prisma.admin.count(),
  };
  console.log("Final:", JSON.stringify(final));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

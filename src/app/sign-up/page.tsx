import SignUpFlow from "@/components/SignUpFlow";
import prisma from "@/lib/prisma";

export default async function SignUpPage() {
  const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });

  return <SignUpFlow subjects={subjects} />;
}

const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const i = trimmed.indexOf("=");
    const key = trimmed.slice(0, i).trim();
    let value = trimmed.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv(".env");
loadEnv(".env.local");

const prisma = new PrismaClient();

async function createOrFindClerkAdmin(secretKey) {
  const response = await fetch("https://api.clerk.com/v1/users", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: "Admin",
      password: "Adm1nS3cur3P@ss!",
      first_name: "School",
      last_name: "Admin",
      email_address: ["admin@divinewonders.academy"],
      public_metadata: { role: "admin" },
      skip_password_checks: true,
    }),
  });

  const data = await response.json();
  if (response.ok) return data;

  const message = JSON.stringify(data).toLowerCase();
  if (response.status === 422 && message.includes("already")) {
    const listRes = await fetch(
      "https://api.clerk.com/v1/users?username=Admin&limit=1",
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );
    const list = await listRes.json();
    const existing = Array.isArray(list) ? list[0] : list?.[data]?.[0] || list?.[0];
    if (existing?.id) return existing;
  }

  throw new Error(`Clerk error (${response.status}): ${JSON.stringify(data)}`);
}

async function main() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY is missing");

  const existing = await prisma.admin.findFirst({
    where: { username: "Admin" },
  });
  if (existing) {
    console.log("Admin already in NeonDB:", existing.id);
    return;
  }

  console.log("Creating Admin in Clerk...");
  const clerkUser = await createOrFindClerkAdmin(secretKey);
  console.log("Clerk user id:", clerkUser.id);

  await prisma.admin.create({
    data: {
      id: clerkUser.id,
      username: "Admin",
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "ADMIN_PROVISIONED",
      userId: clerkUser.id,
      performedBy: "SYSTEM",
      metadata: { username: "Admin", method: "setup_script" },
    },
  });

  console.log("Admin synced to NeonDB");
  console.log("Username: Admin");
  console.log("Password: Adm1nS3cur3P@ss!");
}

main()
  .catch((e) => {
    console.error("Admin setup failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

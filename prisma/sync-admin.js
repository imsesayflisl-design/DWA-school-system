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
const ADMIN_ID = "user_3Gv2jyd30ZU2I1v8h1aWGlQDFMA";

async function withRetry(fn, attempts = 5) {
  let lastError;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${i}/${attempts} failed: ${error.message}`);
      await new Promise((r) => setTimeout(r, 4000 * i));
    }
  }
  throw lastError;
}

async function main() {
  const secretKey = process.env.CLERK_SECRET_KEY;

  // Confirm user exists in Clerk
  const res = await fetch(`https://api.clerk.com/v1/users/${ADMIN_ID}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const user = await res.json();
  if (!res.ok) {
    throw new Error(`Clerk lookup failed: ${JSON.stringify(user)}`);
  }
  console.log("Found Clerk user:", user.id, user.username);

  // Ensure role metadata
  await fetch(`https://api.clerk.com/v1/users/${ADMIN_ID}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ public_metadata: { role: "admin" } }),
  });

  await withRetry(async () => {
    await prisma.admin.upsert({
      where: { id: ADMIN_ID },
      update: { username: "Admin" },
      create: { id: ADMIN_ID, username: "Admin" },
    });

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_PROVISIONED",
        userId: ADMIN_ID,
        performedBy: "SYSTEM",
        metadata: { username: "Admin", method: "sync_script" },
      },
    });
  });

  const admin = await prisma.admin.findUnique({ where: { id: ADMIN_ID } });
  console.log("Synced to NeonDB:", admin);
  console.log("Login with Username: Admin / Password: Adm1nS3cur3P@ss!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

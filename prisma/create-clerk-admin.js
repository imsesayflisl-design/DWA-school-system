const fs = require("fs");

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

async function main() {
  console.log("Calling Clerk API...");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch("https://api.clerk.com/v1/users", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
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
    const text = await response.text();
    console.log("status:", response.status);
    console.log(text.slice(0, 800));
  } catch (error) {
    console.error("fetch failed:", error.name, error.message);
  } finally {
    clearTimeout(timer);
  }
}

main();

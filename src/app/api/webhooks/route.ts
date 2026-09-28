import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SECRET environment variable");
    return new Response("Server misconfiguration", { status: 500 });
  }

  // 1. Verify the webhook signature (CRITICAL for security)
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  // 2. Handle user.created event
  if (evt.type === "user.created") {
    const { id, username, email_addresses, public_metadata } = evt.data;

    const role = (public_metadata?.role as string) || "student";
    const email = email_addresses?.[0]?.email_address;
    const uname = username || email || id;

    try {
      switch (role) {
        case "admin":
          await prisma.admin.upsert({
            where: { id },
            update: { username: uname },
            create: { id, username: uname },
          });
          break;
        case "teacher":
          await prisma.teacher.upsert({
            where: { id },
            update: { username: uname },
            create: {
              id,
              username: uname,
              name: "",
              surname: "",
              address: "",
              bloodType: "",
              sex: "MALE",
              birthday: new Date(),
            },
          });
          break;
        case "parent":
          await prisma.parent.upsert({
            where: { id },
            update: { username: uname },
            create: {
              id,
              username: uname,
              name: "",
              surname: "",
              phone: "",
              address: "",
            },
          });
          break;
        case "student":
        default:
          // Student requires parent, class, grade — record will be created by admin
          console.log(`User ${id} registered with role '${role}'. Full profile to be completed by admin.`);
          break;
      }

      // 3. Log the registration in audit trail
      await prisma.auditLog.create({
        data: {
          action: "USER_CREATED",
          userId: id,
          performedBy: "SYSTEM",
          metadata: { role, username: uname },
        },
      });

      return new Response("User synced successfully", { status: 200 });
    } catch (error) {
      console.error("Error syncing user to database:", error);
      return new Response("Error syncing user", { status: 500 });
    }
  }

  // Handle user.updated event (role changes)
  if (evt.type === "user.updated") {
    const { id, public_metadata } = evt.data;
    const role = public_metadata?.role as string;

    if (role === "admin") {
      try {
        const existingAdmin = await prisma.admin.findUnique({ where: { id } });
        if (!existingAdmin) {
          await prisma.admin.create({
            data: { id, username: id },
          });
        }
      } catch (error) {
        console.error("Error handling user.updated for admin:", error);
      }
    }

    return new Response("User update processed", { status: 200 });
  }

  return new Response("Webhook received", { status: 200 });
}

import { NextRequest, NextResponse } from "next/server";
import { createClerkClient } from "@clerk/backend";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});
import prisma from "@/lib/prisma";

/**
 * POST /api/admin/provision
 *
 * Provisions an admin account. Protected by ADMIN_SETUP_SECRET.
 * This is the secure replacement for the old /setup page.
 *
 * Body: { clerkUserId: string, username: string, secret: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { clerkUserId, username, secret } = await req.json();

    // 1. Verify the setup secret
    const setupSecret = process.env.ADMIN_SETUP_SECRET;
    if (!setupSecret || !secret || secret !== setupSecret) {
      return NextResponse.json(
        { error: "Invalid or missing setup secret" },
        { status: 403 }
      );
    }

    if (!clerkUserId || !username) {
      return NextResponse.json(
        { error: "clerkUserId and username are required" },
        { status: 400 }
      );
    }

    // 2. Set the role in Clerk publicMetadata (server-side only, secure)
    await clerkClient.users.updateUser(clerkUserId, {
      publicMetadata: { role: "admin" },
    });

    // 3. Create or update the Admin record in NeonDB
    await prisma.admin.upsert({
      where: { id: clerkUserId },
      update: { username },
      create: { id: clerkUserId, username },
    });

    // 4. Audit log
    await prisma.auditLog.create({
      data: {
        action: "ADMIN_PROVISIONED",
        userId: clerkUserId,
        performedBy: "SYSTEM",
        metadata: { username, method: "secret_key" },
      },
    });

    return NextResponse.json(
      { success: true, message: `Admin '${username}' provisioned successfully` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin provisioning error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

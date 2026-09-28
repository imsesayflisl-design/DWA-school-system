import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/backend";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});
import prisma from "@/lib/prisma";

/**
 * POST /api/admin/assign-role
 *
 * Assigns a role to a user. Only callable by authenticated admins.
 *
 * Body: { targetUserId: string, role: string, username: string }
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verify the caller is an authenticated admin
    const { userId, sessionClaims } = auth();
    const callerRole = (sessionClaims?.metadata as { role?: string })?.role;

    if (!userId || callerRole !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admins can assign roles" },
        { status: 403 }
      );
    }

    const { targetUserId, role, username } = await req.json();

    if (!targetUserId || !role || !username) {
      return NextResponse.json(
        { error: "targetUserId, role, and username are required" },
        { status: 400 }
      );
    }

    const validRoles = ["admin", "teacher", "student", "parent"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    // 2. Update Clerk publicMetadata (server-side, secure)
    await clerkClient.users.updateUser(targetUserId, {
      publicMetadata: { role },
    });

    // 3. Create the DB record for the new role
    if (role === "admin") {
      await prisma.admin.upsert({
        where: { id: targetUserId },
        update: { username },
        create: { id: targetUserId, username },
      });
    }
    // Teacher/Student/Parent records are more complex (have required fields)
    // and should be created via the existing form-based server actions in actions.ts

    // 4. Audit log
    await prisma.auditLog.create({
      data: {
        action: "ROLE_CHANGED",
        userId: targetUserId,
        performedBy: userId,
        metadata: { newRole: role, username },
      },
    });

    return NextResponse.json(
      { success: true, message: `Role '${role}' assigned to user '${targetUserId}'` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Role assignment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

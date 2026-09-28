import { NextRequest, NextResponse } from "next/server";
import { createClerkClient } from "@clerk/backend";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});
import prisma from "@/lib/prisma";

/**
 * POST /api/setup-admin
 *
 * One-time admin account creation.
 * Now secured with ADMIN_SETUP_SECRET to prevent unauthorized access.
 * The /setup page sends the secret from a form field.
 */
export async function POST(req: NextRequest) {
  try {
    let secret: string | null = null;

    // Support both JSON body and no-body requests for backward compat
    try {
      const body = await req.json();
      secret = body?.secret || null;
    } catch {
      // No JSON body provided
    }

    // Verify the setup secret
    const setupSecret = process.env.ADMIN_SETUP_SECRET;
    if (!setupSecret || secret !== setupSecret) {
      return NextResponse.json(
        { message: "Invalid or missing setup secret", success: false },
        { status: 403 }
      );
    }

    // Check if admin already exists
    const existingAdmin = await prisma.admin.findFirst({
      where: { username: "Admin" },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { message: "Admin already exists", success: false },
        { status: 400 }
      );
    }

    // Create admin user in Clerk with publicMetadata (secure, server-only)
    let clerkUser;
    try {
      clerkUser = await clerkClient.users.createUser({
        username: "Admin",
        password: "Adm1nS3cur3P@ss!",
        firstName: "School",
        lastName: "Admin",
        emailAddress: ["admin@divinewonders.academy"],
        publicMetadata: { role: "admin" },
      });
    } catch (clerkError: any) {
      const code = clerkError?.errors?.[0]?.code;
      if (code === "form_identifier_exists") {
        const users = await clerkClient.users.getUserList({
          username: ["Admin"],
          limit: 1,
        });
        clerkUser = users.data?.[0] ?? (Array.isArray(users) ? users[0] : undefined);
        if (!clerkUser) throw clerkError;
        await clerkClient.users.updateUser(clerkUser.id, {
          publicMetadata: { role: "admin" },
        });
      } else {
        throw clerkError;
      }
    }

    try {
      // Create admin record in NeonDB
      await prisma.admin.create({
        data: {
          id: clerkUser.id,
          username: "Admin",
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: "ADMIN_PROVISIONED",
          userId: clerkUser.id,
          performedBy: "SYSTEM",
          metadata: { username: "Admin", method: "setup_page" },
        },
      });
    } catch (dbError) {
      // Roll back Clerk user if NeonDB write fails
      await clerkClient.users.deleteUser(clerkUser.id);
      throw dbError;
    }

    return NextResponse.json(
      {
        message: "Admin account created successfully",
        success: true,
        adminId: clerkUser.id,
        credentials: {
          username: "Admin",
          password: "Adm1nS3cur3P@ss!",
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Admin setup error:", error);

    if (error.errors?.[0]?.code === "form_username_invalid_character") {
      return NextResponse.json(
        { message: "Username contains invalid characters", success: false },
        { status: 400 }
      );
    }

    if (error.errors?.[0]?.message?.includes("already exists")) {
      return NextResponse.json(
        { message: "Admin already exists in Clerk", success: false },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Failed to create admin account", success: false },
      { status: 500 }
    );
  }
}

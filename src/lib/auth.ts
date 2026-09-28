import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "./prisma";
import { getRoleFromSession, type UserRole } from "./roles";

export type { UserRole };

/**
 * Get the current authenticated user's ID and role.
 * Falls back to currentUser() when session claims don't include role metadata.
 * Throws if not authenticated.
 */
export async function getCurrentUser() {
  const { userId, sessionClaims } = auth();

  if (!userId) {
    throw new Error("Unauthorized: No active session");
  }

  let role = getRoleFromSession(sessionClaims);

  if (!role) {
    const clerkUser = await currentUser();
    role = clerkUser?.publicMetadata?.role as UserRole | undefined;
  }

  return { userId, role };
}

/**
 * Fetch the full user profile from NeonDB based on their role.
 */
export async function getUserProfile(userId: string, role: UserRole) {
  switch (role) {
    case "admin":
      return prisma.admin.findUnique({ where: { id: userId } });
    case "teacher":
      return prisma.teacher.findUnique({
        where: { id: userId },
        include: { subjects: true, classes: true },
      });
    case "student":
      return prisma.student.findUnique({
        where: { id: userId },
        include: { class: true, grade: true, parent: true },
      });
    case "parent":
      return prisma.parent.findUnique({
        where: { id: userId },
        include: { students: true },
      });
    default:
      return null;
  }
}

/**
 * Resolve role from session claims, falling back to Clerk publicMetadata.
 */
export async function resolveUserRole(): Promise<UserRole | undefined> {
  const { sessionClaims } = auth();
  const roleFromSession = getRoleFromSession(sessionClaims);

  if (roleFromSession) return roleFromSession;

  const clerkUser = await currentUser();
  return clerkUser?.publicMetadata?.role as UserRole | undefined;
}

/**
 * Ensure the authenticated user has a matching profile in NeonDB.
 * Redirects to sign-in or profile-missing when appropriate.
 */
export async function requireDbProfile() {
  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const role = await resolveUserRole();

  if (!role) {
    redirect("/sign-in");
  }

  const profile = await getUserProfile(userId, role);

  if (!profile) {
    redirect("/profile-missing");
  }

  return { userId, role, profile };
}

/**
 * Assert that the current user has one of the required roles.
 * Throws if the role check fails.
 */
export async function requireRole(...allowedRoles: UserRole[]) {
  const { userId, role } = await getCurrentUser();

  if (!role || !allowedRoles.includes(role)) {
    throw new Error(`Forbidden: Role '${role}' not in [${allowedRoles.join(", ")}]`);
  }

  return { userId, role };
}

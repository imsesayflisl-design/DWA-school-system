import { auth, currentUser } from "@clerk/nextjs/server";

export type UserRole = "admin" | "teacher" | "student" | "parent";

/**
 * Extract role from Clerk session claims.
 * Requires Clerk Dashboard: Sessions → Customize session token →
 * { "metadata": "{{user.public_metadata}}" }
 */
export function getRoleFromSession(
  sessionClaims: Record<string, unknown> | null | undefined
): UserRole | undefined {
  return (sessionClaims?.metadata as { role?: string } | undefined)?.role as
    | UserRole
    | undefined;
}

/**
 * Get the current user's role with fallback to currentUser().
 * Use this in server components instead of manually extracting from sessionClaims.
 */
export async function getRole(): Promise<UserRole | undefined> {
  const { sessionClaims } = auth();
  const roleFromSession = getRoleFromSession(sessionClaims);
  if (roleFromSession) return roleFromSession;
  const user = await currentUser();
  return user?.publicMetadata?.role as UserRole | undefined;
}

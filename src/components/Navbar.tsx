import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";
import UserButtonClient from "@/components/UserButtonClient";
import { getUserProfile, resolveUserRole } from "@/lib/auth";

function getDisplayName(
  profile: Awaited<ReturnType<typeof getUserProfile>>,
  role: string
): string | null {
  if (!profile) return null;

  if (role === "admin" && "username" in profile) {
    return profile.username;
  }

  if ("name" in profile && "surname" in profile) {
    return `${profile.name} ${profile.surname}`;
  }

  return null;
}

const Navbar = async () => {
  const { userId } = auth();
  const role = await resolveUserRole();

  let displayName = "Unknown User";

  if (userId && role) {
    try {
      const profile = await getUserProfile(userId, role);
      const nameFromDb = getDisplayName(profile, role);
      if (nameFromDb) displayName = nameFromDb;
    } catch (error) {
      console.error("Navbar profile lookup failed", error);
    }
  }

  return (
    <div className="flex items-center justify-between p-4">
      {/* SEARCH BAR */}
      <div className="hidden md:flex items-center gap-2 text-xs rounded-full ring-[1.5px] ring-gray-300 px-2">
        <Image src="/search.png" alt="Search icon" width={14} height={14} />
        <input
          type="text"
          placeholder="Search..."
          className="w-[200px] p-2 bg-transparent outline-none"
        />
      </div>
      {/* ICONS AND USER */}
      <div className="flex items-center gap-6 justify-end w-full">
        <Link
          href="/messages"
          className="bg-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer"
          aria-label="Messages"
        >
          <Image src="/message.png" alt="Messages" width={20} height={20} />
        </Link>
        {userId && <NotificationBell userId={userId} />}
        <div className="flex flex-col">
          <span className="text-xs leading-3 font-medium">{displayName}</span>
          <span className="text-[10px] text-gray-500 text-right">{role ?? "guest"}</span>
        </div>
        <UserButtonClient />
      </div>
    </div>
  );
};

export default Navbar;

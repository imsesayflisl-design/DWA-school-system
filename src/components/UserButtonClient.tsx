"use client";

import { UserButton } from "@clerk/nextjs";
import { useSession } from "@clerk/nextjs";

export default function UserButtonClient() {
  const { isLoaded, isSignedIn } = useSession();

  if (!isLoaded || !isSignedIn) {
    return (
      <div
        className="w-7 h-7 rounded-full bg-gray-200 animate-pulse"
        aria-hidden="true"
      />
    );
  }

  return <UserButton />;
}
import { SignOutButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

export default function ProfileMissingPage() {
  return (
    <div className="min-h-screen bg-lamaSkyLight flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <div className="flex items-center justify-center mb-6">
          <Image src="/dwa-logo.png" alt="logo" width={48} height={48} />
        </div>
        <h1 className="text-2xl font-bold mb-2">Profile Not Found</h1>
        <p className="text-gray-500 mb-6">
          Your account is signed in, but no matching profile exists in the school
          database. Contact an administrator or complete registration.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/sign-up"
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md transition"
          >
            Go to Sign Up
          </Link>
          <SignOutButton>
            <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-md transition">
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}

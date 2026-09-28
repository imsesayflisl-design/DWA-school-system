"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function SetupPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState<boolean | null>(null);
  const [secret, setSecret] = useState("");

  const handleSetupAdmin = async () => {
    if (!secret.trim()) {
      setSuccess(false);
      setMessage("Please enter the setup secret key.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/setup-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: secret.trim() }),
      });

      const data = await response.json();
      setSuccess(data.success);
      setMessage(
        data.success
          ? `✓ Admin created! Username: Admin, Password: Adm1nS3cur3P@ss!`
          : data.message || "Failed to create admin"
      );
    } catch (error) {
      setSuccess(false);
      setMessage(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-lamaSkyLight flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="flex items-center justify-center mb-6">
          <Image src="/dwa-logo.png" alt="logo" width={48} height={48} />
        </div>
        <h1 className="text-2xl font-bold text-center mb-2">Divine Wonders Academy</h1>
        <p className="text-gray-500 text-center mb-8">One-time Setup</p>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="font-semibold text-blue-900 mb-2">Admin Setup</h2>
            <p className="text-sm text-blue-800 mb-4">
              Enter the setup secret key and click below to create the admin account.
            </p>
            <div className="mb-3">
              <label htmlFor="setup-secret" className="block text-xs text-blue-700 mb-1 font-medium">
                Setup Secret Key
              </label>
              <input
                id="setup-secret"
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Enter ADMIN_SETUP_SECRET"
                className="w-full p-2 rounded-md ring-1 ring-blue-300 text-sm focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <button
              onClick={handleSetupAdmin}
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-md transition"
            >
              {loading ? "Setting up..." : "Create Admin Account"}
            </button>
          </div>

          {message && (
            <div
              className={`rounded-lg p-4 text-sm ${
                success
                  ? "bg-green-50 border border-green-200 text-green-800"
                  : "bg-red-50 border border-red-200 text-red-800"
              }`}
            >
              {message}
            </div>
          )}

          {success && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-3">
                <strong>Admin Credentials:</strong>
              </p>
              <p className="text-sm text-gray-600 font-mono mb-2">
                Username: <span className="font-semibold">Admin</span>
              </p>
              <p className="text-sm text-gray-600 font-mono mb-4">
                Password: <span className="font-semibold">Adm1nS3cur3P@ss!</span>
              </p>
            </div>
          )}

          <Link
            href="/sign-in"
            className="block text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-md transition"
          >
            Go to Login
          </Link>
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          After setup, you can log in with your admin credentials
        </p>
      </div>
    </div>
  );
}

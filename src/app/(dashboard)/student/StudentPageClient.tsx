"use client";

import { usePolling } from "@/hooks/usePolling";
import { useRealtime } from "@/hooks/useRealtime";

export default function StudentPageClient({ userId }: { userId: string }) {
  usePolling(2000);
  useRealtime(userId);
  return null;
}
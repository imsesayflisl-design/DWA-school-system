"use client";

import { useRealtime } from "@/hooks/useRealtime";

/** Renders nothing; subscribes the page to realtime data updates. */
export default function RealtimeSync({ userId }: { userId: string }) {
  useRealtime(userId);
  return null;
}
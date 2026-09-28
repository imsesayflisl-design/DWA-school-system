"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "./useSocket";

/**
 * Connects to the socket and refreshes the current page whenever a
 * `data-updated` event is broadcast (e.g. a teacher adds an assignment,
 * an exam, a result, an announcement, or attendance is marked).
 * Optionally runs a custom callback instead of a hard refresh.
 */
export function useRealtime(userId: string | undefined, onUpdated?: () => void) {
  const router = useRouter();
  const { onDataUpdated } = useSocket(userId);

  const handle = useCallback(() => {
    if (onUpdated) onUpdated();
    else router.refresh();
  }, [onUpdated, router]);

  useEffect(() => {
    const cleanup = onDataUpdated(handle);
    return cleanup;
  }, [onDataUpdated, handle]);
}
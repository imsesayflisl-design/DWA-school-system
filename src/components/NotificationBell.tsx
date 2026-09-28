"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getMyNotifications,
  markAllNotificationsRead,
} from "@/lib/actions";
import { useSocket } from "@/hooks/useSocket";
import { useRouter } from "next/navigation";

type AppNotification = {
  id: number;
  userId: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  read: boolean;
  createdAt: Date;
};

const TYPE_ICONS: Record<string, { color: string; label: string }> = {
  announcement: { color: "bg-purple-500", label: "Megaphone" },
  assignment: { color: "bg-sky-500", label: "Assignment" },
  exam: { color: "bg-amber-500", label: "Exam" },
  grade: { color: "bg-emerald-500", label: "Grade" },
  info: { color: "bg-gray-400", label: "Info" },
};

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return "now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const { onNotification } = useSocket(userId);
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const items = await getMyNotifications();
    setNotifications(items as unknown as AppNotification[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const cleanup = onNotification?.((n: AppNotification) => {
      setNotifications((prev) =>
        prev.some((x) => x.id === n.id) ? prev : [n, ...prev].slice(0, 30)
      );
    });
    return () => cleanup?.();
  }, [onNotification]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  const toggleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      await markAllNotificationsRead();
    }
  };

  const openItem = (n: AppNotification) => {
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={toggleOpen}
        className="bg-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer relative"
        aria-label="Notifications"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#374151"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-3 -right-3 w-5 h-5 flex items-center justify-center bg-red-500 text-white text-xs rounded-full">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">
              Notifications
            </span>
            {unread > 0 && (
              <button
                onClick={async () => {
                  setNotifications((prev) =>
                    prev.map((n) => ({ ...n, read: true }))
                  );
                  await markAllNotificationsRead();
                }}
                className="text-xs text-blue-500 hover:text-blue-600"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center text-gray-400 py-10 text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => {
                const icon = TYPE_ICONS[n.type] ?? TYPE_ICONS.info;
                return (
                  <button
                    key={n.id}
                    onClick={() => openItem(n)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                      n.read ? "hover:bg-gray-50" : "bg-blue-50/60 hover:bg-blue-50"
                    }`}
                  >
                    <span
                      className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-white text-xs font-semibold ${icon.color}`}
                    >
                      {icon.label[0]}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-gray-900">
                        {n.title}
                      </span>
                      <span className="block text-xs text-gray-500 line-clamp-2">
                        {n.message}
                      </span>
                      <span className="block text-[11px] text-gray-400 mt-1">
                        {timeAgo(new Date(n.createdAt))}
                      </span>
                    </span>
                    {!n.read && (
                      <span className="w-2 h-2 shrink-0 rounded-full bg-red-500 mt-1.5" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

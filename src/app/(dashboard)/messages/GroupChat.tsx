"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getGroupMessages,
  sendGroupMessage as sendGroupMsgAction,
} from "@/lib/actions";
import { useSocket } from "@/hooks/useSocket";
import type { GroupSummary } from "./page";

type GroupMessage = {
  id: number;
  groupId: number;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  createdAt: Date;
};

type GroupWithUnread = GroupSummary & { unread: number };

const AVATAR_COLORS = [
  "bg-teal-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-indigo-500",
  "bg-rose-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-orange-500",
];

const SENDER_COLORS = [
  "text-teal-600",
  "text-indigo-600",
  "text-amber-600",
  "text-rose-600",
  "text-sky-600",
  "text-violet-600",
  "text-emerald-600",
  "text-orange-600",
];

const colorIndex = (name: string, palette: string[]) =>
  Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length;

const avatarColor = (name: string) =>
  AVATAR_COLORS[colorIndex(name, AVATAR_COLORS)];

const senderColor = (name: string) =>
  SENDER_COLORS[colorIndex(name, SENDER_COLORS)];

const formatTime = (date: Date) =>
  date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

const dayLabel = (date: Date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
};

const CHAT_BACKGROUND =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Ccircle cx='45' cy='50' r='16' fill='none' stroke='%23c9c4bd' stroke-opacity='.4' stroke-width='2'/%3E%3Cpath d='M150 55c12-14 30-7 27 9-2 11-16 16-25 7s-9-13-2-16z' fill='none' stroke='%23c9c4bd' stroke-opacity='.4' stroke-width='2'/%3E%3Cpath d='M60 150q20-26 45 0t45 0' fill='none' stroke='%23c9c4bd' stroke-opacity='.4' stroke-width='2'/%3E%3Ccircle cx='190' cy='185' r='7' fill='%23c9c4bd' fill-opacity='.25'/%3E%3Cpath d='M115 95l6 8-6 8' fill='none' stroke='%23c9c4bd' stroke-opacity='.4' stroke-width='2'/%3E%3C/svg%3E\")";

export default function GroupChat({
  groups,
  currentUserId,
  currentRole,
  currentUserName,
}: {
  groups: GroupSummary[];
  currentUserId: string;
  currentRole: string;
  currentUserName: string;
}) {
  const [groupList, setGroupList] = useState<GroupWithUnread[]>(() =>
    groups.map((g) => ({ ...g, unread: 0 }))
  );
  const [selectedChat, setSelectedChat] = useState<GroupWithUnread | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { onGroupMessage } = useSocket(currentUserId);

  useEffect(() => {
    setGroupList(groups.map((g) => ({ ...g, unread: 0 })));
  }, [groups]);

  const sortedGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? groupList.filter((g) => g.name.toLowerCase().includes(q))
      : groupList;
    return [...filtered].sort((a, b) => {
      const ta = a.lastMessage?.createdAt.getTime() ?? 0;
      const tb = b.lastMessage?.createdAt.getTime() ?? 0;
      return tb - ta;
    });
  }, [groupList, search]);

  useEffect(() => {
    if (!selectedChat) return;
    setMessages([]);
    const load = async () => {
      const msgs = await getGroupMessages(selectedChat.id);
      setMessages(msgs as unknown as GroupMessage[]);
    };
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [selectedChat]);

  useEffect(() => {
    const cleanup = onGroupMessage?.((msg: GroupMessage) => {
      const lastMessage = {
        senderName: msg.senderName,
        content: msg.content,
        createdAt: new Date(msg.createdAt),
      };
      setGroupList((prev) =>
        prev.map((g) => {
          if (g.id !== msg.groupId) return g;
          if (selectedChat?.id === msg.groupId) return { ...g, lastMessage };
          return { ...g, lastMessage, unread: g.unread + 1 };
        })
      );
      if (selectedChat?.id === msg.groupId) {
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
        );
      }
    });
    return () => cleanup?.();
  }, [onGroupMessage, selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectChat = (group: GroupWithUnread) => {
    setSelectedChat(group);
    setGroupList((prev) =>
      prev.map((g) => (g.id === group.id ? { ...g, unread: 0 } : g))
    );
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    const content = newMessage.trim();
    setNewMessage("");
    const result = await sendGroupMsgAction(selectedChat.id, content);
    if (!result.success) {
      setNewMessage(content);
    }
  };

  const rows = useMemo(() => {
    const grouped: (GroupMessage | { __date: Date })[] = [];
    let lastDay: string | null = null;
    for (const msg of messages) {
      const date = new Date(msg.createdAt);
      const day = date.toDateString();
      if (day !== lastDay) {
        grouped.push({ __date: date });
        lastDay = day;
      }
      grouped.push(msg);
    }
    return grouped;
  }, [messages]);

  return (
    <div className="flex flex-col md:flex-row w-full h-[calc(100vh-110px)] min-h-[420px] bg-white rounded-xl overflow-hidden border border-gray-200 shadow-lg">
      {/* SIDEBAR */}
      <aside
        className={`${
          selectedChat ? "hidden" : "flex"
        } md:flex flex-col w-full md:w-80 border-r border-gray-200 bg-white`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#f0f2f5]">
          <span className="text-lg font-bold text-[#111b21]">Chats</span>
          <div className="flex items-center gap-3 text-[#54656f]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
            </svg>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 bg-white">
          <div className="flex items-center gap-2 bg-[#f0f2f5] rounded-lg px-3 py-1.5">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#54656f"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search or start a new chat"
              className="flex-1 bg-transparent text-sm outline-none placeholder-[#8696a0]"
            />
          </div>
        </div>

        {/* Group list */}
        <div className="flex-1 overflow-y-auto">
          {sortedGroups.length === 0 ? (
            <div className="text-center text-gray-400 py-12 text-sm px-4">
              {search
                ? "No chats match your search."
                : "No group chats available yet."}
            </div>
          ) : (
            sortedGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => selectChat(group)}
                className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${
                  selectedChat?.id === group.id
                    ? "bg-[#f0f2f5]"
                    : "hover:bg-[#f5f6f6]"
                }`}
              >
                <div
                  className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold text-white ${avatarColor(
                    group.name
                  )}`}
                >
                  {group.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 border-b border-[#f0f2f5] pb-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-medium text-[#111b21] truncate">
                      {group.name}
                    </span>
                    <span
                      className="text-xs text-[#667781] ml-2 shrink-0"
                      suppressHydrationWarning
                    >
                      {group.lastMessage
                        ? new Date(group.lastMessage.createdAt).toDateString() ===
                          new Date().toDateString()
                          ? formatTime(new Date(group.lastMessage.createdAt))
                          : dayLabel(new Date(group.lastMessage.createdAt))
                        : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[13px] text-[#667781] truncate">
                      {group.lastMessage
                        ? `${group.lastMessage.senderName}: ${group.lastMessage.content}`
                        : "No messages yet"}
                    </span>
                    {group.unread > 0 && (
                      <span className="bg-[#25d366] text-white text-[11px] font-medium min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center ml-2 shrink-0">
                        {group.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* CHAT PANE */}
      <section
        className={`${
          selectedChat ? "flex" : "hidden"
        } md:flex flex-col flex-1 min-w-0`}
      >
        {selectedChat ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-3 py-2.5 bg-[#f0f2f5] border-b border-gray-200">
              <button
                onClick={() => setSelectedChat(null)}
                className="md:hidden text-[#54656f] shrink-0"
                aria-label="Back to chats"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                </svg>
              </button>
              <div
                className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold text-white ${avatarColor(
                  selectedChat.name
                )}`}
              >
                {selectedChat.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-medium text-[#111b21] truncate">
                  {selectedChat.name}
                </div>
                <div className="text-xs text-[#667781]">
                  {selectedChat.memberCount} members
                </div>
              </div>
              <div className="flex items-center gap-4 text-[#54656f]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" />
                </svg>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-4 py-6 space-y-1"
              style={{ backgroundColor: "#efeae2", backgroundImage: CHAT_BACKGROUND }}
            >
              {rows.length === 0 && (
                <div className="text-center text-[#667781] text-sm py-8">
                  This is the start of the group conversation
                </div>
              )}
              {rows.map((row, i) =>
                "__date" in row ? (
                  <div key={`date-${i}`} className="flex justify-center my-3">
                    <span
                      className="bg-white text-xs text-[#667781] rounded-full px-3 py-1 shadow-sm"
                      suppressHydrationWarning
                    >
                      {dayLabel(row.__date)}
                    </span>
                  </div>
                ) : (
                  <div
                    key={row.id}
                    className={`flex ${
                      row.senderId === currentUserId
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[75%] px-2.5 py-1.5 rounded-lg text-sm text-[#111b21] shadow-sm ${
                        row.senderId === currentUserId
                          ? "bg-[#d9fdd3] rounded-tr-none"
                          : "bg-white rounded-tl-none"
                      }`}
                    >
                      {row.senderId !== currentUserId && (
                        <div
                          className={`text-[13px] font-semibold mb-0.5 ${senderColor(
                            row.senderName
                          )}`}
                        >
                          {row.senderName}
                        </div>
                      )}
                      {row.content}
                      <div
                        className={`flex items-center gap-1 justify-end mt-0.5 text-[11px] ${
                          row.senderId === currentUserId
                            ? "text-[#53bdeb]"
                            : "text-[#8696a0]"
                        }`}
                        suppressHydrationWarning
                      >
                        {formatTime(new Date(row.createdAt))}
                      </div>
                    </div>
                  </div>
                )
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-[#f0f2f5]">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="#54656f"
                className="shrink-0 hidden sm:block"
              >
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
              </svg>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type a message"
                className="flex-1 bg-white rounded-lg px-4 py-2.5 text-sm outline-none placeholder-[#8696a0] shadow-sm"
              />
              <button
                onClick={handleSend}
                aria-label="Send message"
                className="w-11 h-11 shrink-0 rounded-full bg-[#008069] text-white flex items-center justify-center hover:bg-[#017561] active:scale-95 transition"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <svg width="180" height="180" viewBox="0 0 24 24" fill="#d9d4cc">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            </svg>
            <h2 className="text-3xl font-light text-[#41525d]">
              Divine Wonders Academy
            </h2>
            <p className="text-sm text-[#8696a0] max-w-md">
              Class group chats for real-time conversations. Select a class to
              join the conversation.
            </p>
            <div className="flex items-center gap-1.5 text-[#8696a0] text-xs mt-4">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
              </svg>
              Messages are secured by your account
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

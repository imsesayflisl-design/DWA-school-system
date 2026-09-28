"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export function useSocket(userId: string | undefined) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const newMessageHandlers = useRef<Set<(data: any) => void>>(new Set());
  const groupMessageHandlers = useRef<Set<(data: any) => void>>(new Set());
  const notificationHandlers = useRef<Set<(data: any) => void>>(new Set());
  const dataHandlers = useRef<Set<(data: any) => void>>(new Set());

  useEffect(() => {
    if (!userId) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";

    const socket = io(socketUrl, {
      query: { userId },
      path: "/api/socket",
      transports: ["websocket", "polling"],
    });

    const newHandlers = newMessageHandlers.current;
    const groupHandlers = groupMessageHandlers.current;
    const notificationHandlersRef = notificationHandlers.current;
    const dataHandlersRef = dataHandlers.current;

    socketRef.current = socket;
    setSocket(socket);

    socket.on("new-message", (data) => {
      newHandlers.forEach((cb) => cb(data));
    });

    socket.on("group-message", (data) => {
      groupHandlers.forEach((cb) => cb(data));
    });

    socket.on("notification", (data) => {
      notificationHandlersRef.forEach((cb) => cb(data));
    });

    socket.on("data-updated", (data) => {
      dataHandlersRef.forEach((cb) => cb(data));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocket(null);
      newHandlers.clear();
      groupHandlers.clear();
      notificationHandlersRef.clear();
      dataHandlersRef.clear();
    };
  }, [userId]);

  const sendMessage = useCallback((receiverId: string, content: string) => {
    socketRef.current?.emit("send-message", { receiverId, content });
  }, []);

  const onNewMessage = useCallback((handler: (data: any) => void) => {
    newMessageHandlers.current.add(handler);
    return () => {
      newMessageHandlers.current.delete(handler);
    };
  }, []);

  const onGroupMessage = useCallback((handler: (data: any) => void) => {
    groupMessageHandlers.current.add(handler);
    return () => {
      groupMessageHandlers.current.delete(handler);
    };
  }, []);

  const onNotification = useCallback((handler: (data: any) => void) => {
    notificationHandlers.current.add(handler);
    return () => {
      notificationHandlers.current.delete(handler);
    };
  }, []);

  const onDataUpdated = useCallback((handler: (data: any) => void) => {
    dataHandlers.current.add(handler);
    return () => {
      dataHandlers.current.delete(handler);
    };
  }, []);

  return { socket, sendMessage, onNewMessage, onGroupMessage, onNotification, onDataUpdated };
}
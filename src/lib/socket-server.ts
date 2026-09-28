import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";

const SOCKET_PATH = "/api/socket";

declare global {
  // eslint-disable-next-line no-var
  var __io: SocketIOServer | undefined;
}

export function installSocketServer(httpServer?: HttpServer): SocketIOServer {
  if (!global.__io) {
    global.__io = new SocketIOServer(httpServer, {
      path: SOCKET_PATH,
      cors: { origin: "*" },
      transports: ["websocket", "polling"],
    });

    global.__io.on("connection", (socket) => {
      const userId = String(socket.handshake.query.userId || "");
      socket.data.userId = userId;
      if (userId) socket.join(`user:${userId}`);

      socket.on("send-message", (payload: { receiverId: string; content: string }) => {
        const { receiverId, content } = payload || {};
        if (!userId || !receiverId || !content) return;

        const message = {
          senderId: userId,
          receiverId,
          content,
          createdAt: new Date().toISOString(),
        };

        global.__io?.to(`user:${receiverId}`).emit("new-message", message);
        global.__io?.to(`user:${userId}`).emit("new-message", { ...message, fromSelf: true });
      });
    });
  }
  return global.__io;
}

export function getSocketServer(): SocketIOServer | null {
  return global.__io ?? null;
}

/** Broadcast a server-side change so connected dashboards refresh. */
export function emitDataUpdated(payload?: Record<string, unknown>) {
  global.__io?.emit("data-updated", { type: "data-updated", ...payload });
}

/** Notify a user's connected clients about a new message. */
export function emitNewMessage(message: {
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: Date;
  senderRole?: string;
}) {
  const m = {
    ...message,
    createdAt: message.createdAt?.toISOString?.() ?? message.createdAt,
  };
  global.__io
    ?.to(`user:${message.receiverId}`)
    .emit("new-message", m);
}

/** Broadcast a new group message to all connected clients. */
export function emitGroupMessage(message: {
  id: number;
  groupId: number;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  createdAt: Date;
}) {
  const m = {
    ...message,
    createdAt: message.createdAt?.toISOString?.() ?? message.createdAt,
  };
  global.__io?.emit("group-message", m);
}

/** Push a real-time notification to a specific user's connected clients. */
export function emitNotification(
  userId: string,
  notification: {
    id: number;
    userId: string;
    title: string;
    message: string;
    type: string;
    link: string | null;
    read: boolean;
    createdAt: Date;
  }
) {
  const n = {
    ...notification,
    createdAt: notification.createdAt?.toISOString?.() ?? notification.createdAt,
  };
  global.__io?.to(`user:${userId}`).emit("notification", n);
}
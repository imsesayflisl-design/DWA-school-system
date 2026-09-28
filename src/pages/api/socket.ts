import type { NextApiRequest, NextApiResponse } from "next";
import { installSocketServer } from "@/lib/socket-server";

export default function SocketHandler(req: NextApiRequest, res: NextApiResponse) {
  const httpServer = (res.socket as any)?.server;
  if (httpServer && !global.__io) {
    installSocketServer(httpServer);
  }
  res.end();
}
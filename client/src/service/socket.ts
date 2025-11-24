import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL;

if (!SOCKET_URL) {
  throw new Error("VITE_API_BASE_URL is not defined in environment variables");
}

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  withCredentials: true,
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 10,
});

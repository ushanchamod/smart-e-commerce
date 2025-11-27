import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    const SOCKET_URL = import.meta.env.VITE_API_BASE_URL;
    const token = localStorage.getItem("token");

    socket = io(SOCKET_URL, {
      autoConnect: true,
      withCredentials: true,
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
    });
  }
  return socket;
};

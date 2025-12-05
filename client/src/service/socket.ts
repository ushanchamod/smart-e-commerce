import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    const SOCKET_URL = import.meta.env.VITE_API_BASE_URL;
    const token = localStorage.getItem("token");

    socket = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
    });

    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`Reconnection attempt ${attemptNumber}`);
    });

    socket.on("reconnect_failed", () => {
      console.error("Socket reconnection failed after all attempts");
    });
  }
  return socket;
};

export const reconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  const newSocket = getSocket();
  newSocket.connect();
  return newSocket;
};

export const resetSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    localStorage.removeItem("chat_session_id");
  }
};

export const updateSocketAuth = () => {
  if (socket) {
    const token = localStorage.getItem("token");
    socket.auth = { token };
    if (socket.connected) {
      socket.disconnect();
      socket.connect();
    }
  }
};

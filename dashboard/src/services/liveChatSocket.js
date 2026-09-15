import { io } from "socket.io-client";
import axiosInstance from "../config/axiosConfig";

let socket = null;

export const getLiveChatSocket = () => {
  const token = localStorage.getItem("bearerToken");

  if (socket?.connected) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  socket = io(axiosInstance.defaults.baseURL, {
    auth: { token },
    transports: ["websocket", "polling"],
    withCredentials: true,
    autoConnect: true,
  });

  return socket;
};

export const disconnectLiveChatSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

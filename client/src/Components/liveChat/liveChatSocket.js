import { io } from "socket.io-client";
import api from "../axios/axios";

const AUTH_STORAGE_KEY = "betting_app_auth_v1";
let socket = null;

const getStoredToken = () => {
  try {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    return saved ? JSON.parse(saved)?.token : null;
  } catch {
    return null;
  }
};

export const getLiveChatSocket = (token) => {
  const authToken = token || getStoredToken();

  if (!authToken) {
    return null;
  }

  if (socket?.connected && socket.auth?.token === authToken) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  socket = io(api.defaults.baseURL, {
    auth: { token: authToken },
    transports: ["websocket", "polling"],
    withCredentials: false,
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

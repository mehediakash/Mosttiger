import axios from "axios";
import store from "../store";
import { logout } from "../store/authSlice";

// const API_BASE = "https://server.mosttiger.com";
const API_BASE = "http://localhost:5000" || "";
const AUTH_STORAGE_KEY = "betting_app_auth_v1";
// const API_BASE =
//   "https://node-api-server-123-f5gsegd3ahcqhtgs.southeastasia-01.azurewebsites.net";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
});

const inFlightGet = new Map();
const memoryGetCache = new Map();

const serializeParams = (params) => {
  if (!params || typeof params !== "object") return "";
  return Object.keys(params)
    .sort()
    .map((key) => `${key}=${String(params[key])}`)
    .join("&");
};

const buildGetCacheKey = (url, config = {}) => {
  const paramsKey = serializeParams(config.params);
  return `${url}?${paramsKey}`;
};

export const cachedGet = async (url, config = {}, options = { ttl: 45000 }) => {
  const ttl = options?.ttl ?? 45000;
  const key = options?.key || buildGetCacheKey(url, config);
  const now = Date.now();

  const cached = memoryGetCache.get(key);
  if (cached && now - cached.ts < ttl) {
    return cached.response;
  }

  const inFlight = inFlightGet.get(key);
  if (inFlight) return inFlight;

  const request = api
    .get(url, config)
    .then((response) => {
      memoryGetCache.set(key, { response, ts: Date.now() });
      return response;
    })
    .finally(() => {
      inFlightGet.delete(key);
    });

  inFlightGet.set(key, request);
  return request;
};

// attach token
api.interceptors.request.use((config) => {
  try {
    const state = store.getState();
    let token = state.auth?.token;

    if (!token) {
      const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
      token = savedAuth ? JSON.parse(savedAuth)?.token : null;
    }

    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    // ignore
  }
  return config;
});

// response interceptor to catch 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      const url = err.config?.url || "";
      if (url.includes("/api/payments/verify")) {
        return Promise.reject(err);
      }

      // dispatch logout to clear storage
      try {
        store.dispatch(logout());
      } catch {
        // ignore logout dispatch errors
      }
    }
    return Promise.reject(err);
  },
);

export default api;

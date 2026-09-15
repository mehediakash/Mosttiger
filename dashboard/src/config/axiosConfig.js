import axios from "axios";

// const baseURL =  'https://node-api-server-123-f5gsegd3ahcqhtgs.southeastasia-01.azurewebsites.net';
// const baseURL = "https://gaming.kinobazar.com";
const baseURL = "https://server.mosttiger.com";
// const baseURL = "http://localhost:5000";

const axiosInstance = axios.create({
  baseURL,
  timeout: 10000,
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("bearerToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("bearerToken");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;

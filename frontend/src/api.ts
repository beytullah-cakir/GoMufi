import axios from "axios";

// API URL'ini environment variable'dan al
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// API URL'ini global olarak export et (diğer componentlerde kullanmak için)
export const getApiBaseUrl = () => API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem("token");

//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }

//   return config;
// });

export default api;

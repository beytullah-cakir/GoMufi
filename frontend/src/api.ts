import axios from "axios";

// API URL'ini environment variable'dan al
const API_BASE_URL = import.meta.env.VITE_API_URL;

// API URL'ini global olarak export et (diğer componentlerde kullanmak için)
export const getApiBaseUrl = () => API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Eğer token süresi dolduysa / geçersizse anasayfaya veya giriş paneline at
      const msg = error.response.data?.detail || "";
      if (msg.toLowerCase().includes("token expired") || msg.toLowerCase().includes("not authenticated")) {
        // Prevent infinite reload loops or double-alerts
        if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
          console.warn("[Auth] Token expired, redirecting to login...");
          alert("Oturum süreniz doldu (Token Expired). Lütfen tekrar giriş yapın.");
          window.location.href = "/";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

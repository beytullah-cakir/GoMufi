import axios from "axios";

// API URL'ini environment variable'dan al
const API_BASE_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8000`;

// API URL'ini global olarak export et (diğer componentlerde kullanmak için)
export const getApiBaseUrl = () => API_BASE_URL;

// URL'deki ?token= parametresini otomatik olarak localStorage'a kaydet (OAuth dönüşleri için)
try {
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get('token');
  if (urlToken) {
    localStorage.setItem('access_token', urlToken);
  }
} catch {
  // ignore
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const msg: string = error.response.data?.detail || "";
      const isExpired =
        msg.toLowerCase().includes("token expired") ||
        msg.toLowerCase().includes("has expired") ||
        msg.toLowerCase().includes("not authenticated");

      if (
        isExpired &&
        window.location.pathname !== "/" &&
        window.location.pathname !== "/auth"
      ) {
        console.warn("[Auth] Token süresi doldu, giriş sayfasına yönlendiriliyor...");
        // Custom event — App veya herhangi bir bileşen bu event'i dinleyebilir
        window.dispatchEvent(new CustomEvent("auth:expired"));
        // Yönlendirmeyi artık App.tsx yapacak
      }
    }
    return Promise.reject(error);
  }
);

export default api;

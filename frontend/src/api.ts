import axios from "axios";

// API URL'ini environment variable'dan al
const API_BASE_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8000`;

// API URL'ini global olarak export et (diğer componentlerde kullanmak için)
export const getApiBaseUrl = () => API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

/**
 * VS Code paneli için Bearer token desteği.
 *
 * Site normalde kimliği httpOnly çerezle taşır ve bu KASITLIDIR (XSS'e karşı).
 * Ama oynatıcı VS Code webview'ünde bir iframe olarak çalıştığında tarayıcı
 * çerezleri orada yoktur; eklenti kendi cihaz token'ını köprüyle verir.
 * `withCredentials` açık kalıyor — tarayıcıdaki çerez akışı hiç değişmiyor,
 * bu yalnızca çerez YOKKEN devreye giren ek bir yol.
 */
let bearerToken: string | null = null;

export const setBearerToken = (token: string | null) => {
  bearerToken = token;
};

api.interceptors.request.use((config) => {
  if (bearerToken) {
    config.headers.Authorization = `Bearer ${bearerToken}`;
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

      // VS Code panelinde yönlendirecek bir "giriş sayfası" yok — token'ı eklenti
      // veriyor. Burada rota değiştirmek paneli boş bir sayfaya düşürürdü;
      // süresi dolan token'ı kullanıcıya panelin kendisi bildirir.
      if (
        isExpired &&
        !bearerToken &&
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

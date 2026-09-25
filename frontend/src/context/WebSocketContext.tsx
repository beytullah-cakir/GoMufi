import React, { createContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';

// Temel bir WebSocket mesaj tipi
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

type Listener = (message: WebSocketMessage) => void;

interface WebSocketContextProps {
  socket: WebSocket | null;
  isConnected: boolean;
  sendMessage: (message: WebSocketMessage) => void;
  lastMessage: WebSocketMessage | null;
  /**
   * Her mesajı kaçırmadan dinlemek için. `lastMessage` tek bir yuva: arka
   * arkaya gelen iki mesajdan ilki görülmeden üzerine yazılabiliyor. Mesaj
   * kutusu gibi hiçbir olayı atlamaması gereken yerler bunu kullanır.
   */
  subscribe: (listener: Listener) => () => void;
}

export const WebSocketContext = createContext<WebSocketContextProps | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const listenersRef = useRef<Set<Listener>>(new Set());

  const connect = useCallback(() => {
    // Kimlik sunucu tarafında httpOnly access_token cookie'sinden çözülür —
    // istemci artık kendi user_id'sini üretmez ve göndermez.
    // VITE_WS_URL ortam değişkeni kullanılabilir veya VITE_API_URL den türetilebilir.
    // http://localhost:8000 -> ws://localhost:8000
    const baseUrl = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8000`;
    const wsUrl = baseUrl.replace(/^http/, 'ws') + '/ws';

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setSocket(ws);

      // Ping atarak bağlantıyı test edebiliriz
      ws.send(JSON.stringify({ type: "ping" }));
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        setLastMessage(message);
        listenersRef.current.forEach((listener) => {
          try { listener(message); } catch (err) { console.error('WebSocket dinleyicisi hata verdi:', err); }
        });
      } catch (error) {
        console.error('WebSocket mesajı parse edilemedi:', error);
      }
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      setSocket(null);
      wsRef.current = null;

      // 1008 = sunucu kimliği doğrulayamadı (henüz giriş yapılmamış).
      // Bu durumda saniyede bir denemek yerine seyrek dene — giriş yapıldığında
      // cookie hazır olacağı için bir sonraki deneme başarılı olur.
      const retryDelay = event.code === 1008 ? 30000 : 3000;

      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, retryDelay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket bağlı değil, mesaj gönderilemedi:", message);
    }
  }, []);

  const subscribe = useCallback((listener: Listener) => {
    listenersRef.current.add(listener);
    return () => { listenersRef.current.delete(listener); };
  }, []);

  return (
    <WebSocketContext.Provider value={{ socket, isConnected, sendMessage, lastMessage, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
};

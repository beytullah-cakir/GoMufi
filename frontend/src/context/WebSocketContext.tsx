import React, { createContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';

// Temel bir WebSocket mesaj tipi
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface WebSocketContextProps {
  socket: WebSocket | null;
  isConnected: boolean;
  sendMessage: (message: WebSocketMessage) => void;
  lastMessage: WebSocketMessage | null;
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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    // Burada geçici olarak rastgele bir user_id kullanıyoruz.
    // İdeal senaryoda bu ID'yi kullanıcının auth session'ından (localStorage veya AuthContext) almalısınız.
    const userId = localStorage.getItem('user_id') || `user_${Math.random().toString(36).substring(7)}`;
    if (!localStorage.getItem('user_id')) {
        localStorage.setItem('user_id', userId);
    }
    
    // VITE_WS_URL ortam değişkeni kullanılabilir veya VITE_API_URL den türetilebilir.
    // http://localhost:8000 -> ws://localhost:8000
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
    const wsUrl = baseUrl.replace(/^http/, 'ws') + `/ws/${userId}`;
    
    console.log("WebSocket bağlantısı başlatılıyor...", wsUrl);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket bağlantısı kuruldu.');
      setIsConnected(true);
      setSocket(ws);
      
      // Ping atarak bağlantıyı test edebiliriz
      ws.send(JSON.stringify({ type: "ping" }));
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log('WebSocket mesajı alındı:', message);
        setLastMessage(message);
      } catch (error) {
        console.error('WebSocket mesajı parse edilemedi:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket bağlantısı kapandı. Tekrar bağlanılacak...');
      setIsConnected(false);
      setSocket(null);
      wsRef.current = null;
      
      // 3 saniye sonra tekrar bağlanmayı dene
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket hatası:', error);
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

  return (
    <WebSocketContext.Provider value={{ socket, isConnected, sendMessage, lastMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
};

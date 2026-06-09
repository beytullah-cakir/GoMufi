import { useContext, useEffect, useState } from 'react';
import { WebSocketContext } from '../context/WebSocketContext';
import type { WebSocketMessage } from '../context/WebSocketContext';

/**
 * Belirli olay tiplerini (eventType) kolayca dinlemek ve 
 * WebSocket üzerinden mesaj göndermek için kullanılacak React Hook'u.
 */
export const useWebSocket = (eventType?: string) => {
  const context = useContext(WebSocketContext);
  
  if (context === undefined) {
    throw new Error('useWebSocket hook must be used within a WebSocketProvider');
  }

  const { isConnected, sendMessage, lastMessage } = context;
  const [eventData, setEventData] = useState<WebSocketMessage | null>(null);

  useEffect(() => {
    // Eğer bir eventType belirtilmişse, sadece o type'a uyan mesajları state'e al.
    if (lastMessage) {
      if (!eventType || lastMessage.type === eventType) {
        setEventData(lastMessage);
      }
    }
  }, [lastMessage, eventType]);

  return {
    isConnected,
    sendMessage,
    eventData,       // Filtrelenmiş veya son gelen olay verisi
    lastMessage      // Ayrım yapmadan gelen son mesaj
  };
};

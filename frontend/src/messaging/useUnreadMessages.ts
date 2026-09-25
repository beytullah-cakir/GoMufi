import { useEffect, useState } from 'react';
import { useWebSocketEvent } from '../hooks/useWebSocket';
import { messagingApi } from './messagingApi';

/**
 * Menüdeki "Mesajlar" rozeti: okunmamış mesaj sayısı.
 * Yeni mesaj bildirimi gelince ve dakikada bir yeniden sorulur.
 */
export const useUnreadMessages = (enabled = true) => {
    const [count, setCount] = useState(0);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        if (!enabled) return;
        let alive = true;
        messagingApi.unread().then((n) => { if (alive) setCount(n); }).catch(() => undefined);
        return () => { alive = false; };
    }, [enabled, tick]);

    useEffect(() => {
        if (!enabled) return;
        const timer = setInterval(() => setTick((t) => t + 1), 60_000);
        return () => clearInterval(timer);
    }, [enabled]);

    useWebSocketEvent('message_new', () => setTick((t) => t + 1));

    return enabled ? count : 0;
};

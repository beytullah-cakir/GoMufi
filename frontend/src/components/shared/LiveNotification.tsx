import React, { useEffect, useState } from "react";
import { useWebSocket } from "../../hooks/useWebSocket";
import { Bell } from "lucide-react";

export const LiveNotification: React.FC = () => {
  const { eventData, isConnected } = useWebSocket("notification");
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (eventData) {
      // Yeni gelen bildirimi listeye ekle
      const newNotification = {
        id: Date.now(),
        message: eventData.message,
        title: eventData.title || "Yeni Bildirim",
      };
      
      setNotifications((prev) => [newNotification, ...prev]);

      // 5 saniye sonra bildirimi ekrandan kaldır
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== newNotification.id));
      }, 5000);
    }
  }, [eventData]);

  return (
    <div className="fixed bottom-8 right-8 z-[9999] flex flex-col gap-3 pointer-events-none">
      {/* Bildirim Kartları */}
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className="bg-white border-2 border-sky-100 border-b-4 rounded-2xl p-4 shadow-xl flex items-start gap-3 w-80 animate-in slide-in-from-right-8 fade-in duration-300 pointer-events-auto"
        >
          <div className="bg-sky-100 text-sky-500 p-2 rounded-xl mt-1">
            <Bell size={20} />
          </div>
          <div>
            <h4 className="font-black text-gray-800">{notif.title}</h4>
            <p className="text-sm font-medium text-gray-500 leading-tight mt-0.5">{notif.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

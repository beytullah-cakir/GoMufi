import React from "react";
import { Bell } from "lucide-react";

export const LiveNotification: React.FC = () => {
  // WebSocket kaldırıldı; bildirimler artık gösterilmiyor.
  return (
    <div className="fixed bottom-8 right-8 z-[9999] flex flex-col gap-3 pointer-events-none">
    </div>
  );
};

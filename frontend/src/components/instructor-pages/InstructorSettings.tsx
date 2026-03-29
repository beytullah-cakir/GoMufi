import React from "react";
import { User, X, Plus, Check, Search } from "lucide-react";
import { useState } from "react";
import api from "../../api";
interface InstructorSettingsProps {
  userData?: any;
  availableTags?: string[];
}

const InstructorSettings: React.FC<InstructorSettingsProps> = () => {
  const [activeTab, setActiveTab] = useState("Bildirimler");

  return (
    <div className="space-y-6 animate-fade-in-down max-w-4xl">
      <h2 className="text-xl font-black text-gray-800">Hesap Ayarları</h2>

      <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="flex border-b border-gray-100">
          <button 
            onClick={() => setActiveTab("Bildirimler")}
            className={`flex-1 py-4 text-center font-bold transition-all ${activeTab === "Bildirimler" ? "text-sky-600 border-b-2 border-sky-500 bg-sky-50" : "text-gray-400 hover:bg-gray-50"}`}
          >
            Bildirimler
          </button>
          <button 
            onClick={() => setActiveTab("Güvenlik")}
            className={`flex-1 py-4 text-center font-bold transition-all ${activeTab === "Güvenlik" ? "text-sky-600 border-b-2 border-sky-500 bg-sky-50" : "text-gray-400 hover:bg-gray-50"}`}
          >
            Güvenlik
          </button>
        </div>

        <div className="p-8 space-y-8 min-h-[400px]">
          {activeTab === "Bildirimler" && (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Check size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Bildirim Ayarları</h3>
              <p className="text-gray-500 max-w-xs mx-auto">Bildirim tercihlerinizi buradan yönetebilirsiniz.</p>
              <div className="mt-8 p-6 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 text-gray-400 font-bold">
                Henüz yapılandırılabilir bildirim ayarı bulunmuyor.
              </div>
            </div>
          )}
          
          {activeTab === "Güvenlik" && (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <X size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Güvenlik Ayarları</h3>
              <p className="text-gray-500 max-w-xs mx-auto">Şifre değiştirme ve hesap güvenliği işlemleri.</p>
              <div className="mt-8 p-6 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 text-gray-400 font-bold">
                Şifre sıfırlama özelliği yakında eklenecektir.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstructorSettings;

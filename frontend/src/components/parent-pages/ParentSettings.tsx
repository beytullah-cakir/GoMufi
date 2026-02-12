import React from "react";
import {
  User,
  Lock,
  Bell,
  Moon,
  Languages,
  HelpCircle,
  LogOut,
} from "lucide-react";
import api from "../../api";

interface ParentSettingsProps {
  userData?: any;
  onRefresh?: () => void;
}

const ParentSettings: React.FC<ParentSettingsProps> = ({
  userData,
  onRefresh,
}) => {
  const initials =
    (userData?.first_name?.[0] || "") + (userData?.last_name?.[0] || "");
  const fullName = userData?.first_name
    ? `${userData.first_name} ${userData.last_name || ""}`
    : "Sayın Veli";
  const email = userData?.email || "E-posta belirtilmemiş";

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed", error);
      window.location.href = "/";
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-gray-800 mb-2">Ayarlar</h2>
        <p className="text-gray-500 font-medium">
          Hesap tercihlerinizi kişiselleştirin.
        </p>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        {/* Profile Section */}
        <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center text-3xl font-black text-purple-600 border-4 border-white shadow-lg">
            {initials || "V"}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl font-black text-gray-800">{fullName}</h3>
            <p className="text-gray-400 font-medium">{email}</p>
          </div>
          <button className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors">
            Profili Düzenle
          </button>
        </div>

        {/* Settings List */}
        <div className="divide-y divide-gray-50">
          <div className="p-6 hover:bg-gray-50 transition-colors cursor-pointer group flex items-center gap-6">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <User className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-800 text-lg">
                Hesap Bilgileri
              </h4>
              <p className="text-gray-400 text-sm font-medium">
                Ad, soyad ve iletişim bilgileri
              </p>
            </div>
          </div>

          <div className="p-6 hover:bg-gray-50 transition-colors cursor-pointer group flex items-center gap-6">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Lock className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-800 text-lg">
                Şifre ve Güvenlik
              </h4>
              <p className="text-gray-400 text-sm font-medium">
                Şifre değiştirme ve 2FA
              </p>
            </div>
          </div>

          <div className="p-6 hover:bg-gray-50 transition-colors cursor-pointer group flex items-center gap-6">
            <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Bell className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-800 text-lg">Bildirimler</h4>
              <p className="text-gray-400 text-sm font-medium">
                E-posta ve uygulama bildirimleri
              </p>
            </div>
          </div>

          <div className="p-6 hover:bg-gray-50 transition-colors cursor-pointer group flex items-center gap-6">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Languages className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-800 text-lg">Dil ve Bölge</h4>
              <p className="text-gray-400 text-sm font-medium">Türkçe (TR)</p>
            </div>
          </div>

          <div className="p-8 bg-purple-50/50 border-t border-purple-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h4 className="font-black text-purple-900 text-lg mb-1">
                Ebeveyn Kodu
              </h4>
              <p className="text-purple-600/70 text-sm font-bold">
                Çocuğunuzun hesabını bağlamak için bu kodu paylaşın.
              </p>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="flex-1 md:flex-none bg-white px-6 py-4 rounded-2xl border-2 border-purple-200 font-black text-2xl text-purple-600 tracking-widest text-center shadow-inner">
                {userData?.parent_code || "YÜKLENİYOR"}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(userData?.parent_code || "");
                  alert("Kod kopyalandı!");
                }}
                className="p-4 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 active:scale-95 transition-all shadow-lg shadow-purple-200"
              >
                Kopyala
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all group">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="font-bold text-gray-800">Yardım Merkezi</div>
            <div className="text-xs text-gray-400 font-medium">
              SSS ve İletişim
            </div>
          </div>
        </button>

        <button
          onClick={handleLogout}
          className="p-6 bg-red-50 rounded-2xl border border-red-100 shadow-sm flex items-center gap-4 hover:bg-red-100 transition-all group"
        >
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-red-500 shadow-sm">
            <LogOut className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="font-bold text-red-600">Çıkış Yap</div>
            <div className="text-xs text-red-400 font-medium">
              Hesaptan güvenle ayrıl
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default ParentSettings;

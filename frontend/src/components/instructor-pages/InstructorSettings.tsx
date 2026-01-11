import React from "react";
import { User } from "lucide-react";
import { useState } from "react";
import api from "../../api";
interface InstructorSettingsProps {
  userData?: any;
}

const InstructorSettings: React.FC<InstructorSettingsProps> = ({
  userData,
}) => {
  const [firstname, setFirstname] = useState(userData?.first_name || "");
  const [lastname, setLastname] = useState(userData?.last_name || "");
  const [email, setEmail] = useState(userData?.email || "");
  const [bio, setBio] = useState(userData?.bio || "");
  const [department, setDepartment] = useState(userData?.department || "");
  const [isLoading, setIsLoading] = useState(!userData);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await api.put("/profile/update", {
        first_name: firstname,
        last_name: lastname,
        bio: bio,
        department: department,
      });
      alert("Profil başarıyla güncellendi!");
      window.location.reload();
    } catch (error) {
      console.error("Profile update failed", error);
      alert("Hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-down max-w-4xl">
      <h2 className="text-xl font-black text-gray-800">Hesap Ayarları</h2>

      <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="flex border-b border-gray-100">
          <button className="flex-1 py-4 text-center font-bold text-sky-600 border-b-2 border-sky-500 bg-sky-50">
            Profil
          </button>
          <button className="flex-1 py-4 text-center font-bold text-gray-400 hover:bg-gray-50">
            Bildirimler
          </button>
          <button className="flex-1 py-4 text-center font-bold text-gray-400 hover:bg-gray-50">
            Güvenlik
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Public Profile */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <User size={20} className="text-sky-500" />
              Genel Bilgiler
            </h3>

            <div className="flex items-start gap-8">
              <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0 cursor-pointer hover:border-sky-500 hover:text-sky-500 transition-colors">
                <span className="text-xs font-bold text-gray-400">
                  Fotoğraf Yükle
                </span>
              </div>
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Ad
                    </label>
                    <input
                      type="text"
                      value={firstname}
                      onChange={(e) => setFirstname(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Soyad
                    </label>
                    <input
                      type="text"
                      value={lastname}
                      onChange={(e) => setLastname(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    E-posta Adresi
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-2 font-bold text-gray-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Unvan
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Hakkımda
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full h-32 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-200 resize-none"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className={`bg-sky-500 hover:bg-sky-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-sky-200 transition-transform active:scale-95 flex items-center gap-2 ${
                isSubmitting ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Güncelleniyor...</span>
                </>
              ) : (
                "Değişiklikleri Kaydet"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorSettings;

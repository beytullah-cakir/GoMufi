import React, { useState, useEffect } from "react";
import api from "../../api";
import { User, Mail, Award, BookOpen, Clock, Settings, Edit, Zap, X, Check, Plus } from "lucide-react";
import techData from "../../data/technologies.json";

interface InstructorProfileProps {
  userData: any;
  setUserData: (data: any) => void;
}

const InstructorProfile: React.FC<InstructorProfileProps> = ({ userData, setUserData }) => {
  const [profileData, setProfileData] = useState<any>(userData);
  const [isLoading, setIsLoading] = useState(!userData);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    bio: "",
    expertises: [] as string[]
  });

  useEffect(() => {
    if (userData) {
      setProfileData(userData);
      setEditForm({
        first_name: userData.first_name || "",
        last_name: userData.last_name || "",
        bio: userData.bio || "",
        expertises: userData.expertises ? userData.expertises.split(",").filter(Boolean).map((t: string) => t.trim()) : []
      });
      setIsLoading(false);
    } else {
      const fetchProfile = async () => {
        try {
          const response = await api.get("/profile");
          setProfileData(response.data);
          setUserData(response.data);
          setEditForm({
            first_name: response.data.first_name || "",
            last_name: response.data.last_name || "",
            bio: response.data.bio || "",
            expertises: response.data.expertises ? response.data.expertises.split(",").filter(Boolean).map((t: string) => t.trim()) : []
          });
        } catch (err) {
          console.error("Profile fetch error:", err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchProfile();
    }
  }, [userData, setUserData]);

  const toggleTag = (tag: string) => {
    if (editForm.expertises.includes(tag)) {
      setEditForm({ ...editForm, expertises: editForm.expertises.filter(t => t !== tag) });
    } else {
      setEditForm({ ...editForm, expertises: [...editForm.expertises, tag] });
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await api.put("/profile/update", {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        bio: editForm.bio,
        expertises: editForm.expertises.join(", "),
      });
      // Refresh
      const response = await api.get("/profile");
      setProfileData(response.data);
      setUserData(response.data); // Update global state
      setIsEditing(false);
    } catch (error) {
      console.error("Profile update failed", error);
      alert("Güncelleme sırasında bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const expertises = profileData?.expertises ? profileData.expertises.split(', ') : [];

  return (
    <div className="p-8 max-w-5xl mx-auto font-display">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tight">Eğitmen Profili</h1>
          <p className="text-gray-500 font-bold mt-1">Bilgilerini yönet ve uzmanlığını göster.</p>
        </div>
        <button 
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-100 border-b-4 rounded-2xl font-black text-gray-600 hover:bg-gray-50 transition-all active:border-b-2 active:translate-y-[2px]"
        >
          <Edit size={20} />
          PROFİLİ DÜZENLE
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: HERO CARD */}
        <div className="lg:col-span-1">
          <div className="bg-white border-2 border-gray-100 border-b-8 rounded-[2.5rem] p-8 shadow-sm flex flex-col items-center text-center">
            <div className="w-32 h-32 bg-cyan-50 rounded-3xl border-4 border-cyan-500 flex items-center justify-center text-5xl mb-6 shadow-lg shadow-cyan-100 transform -rotate-3 hover:rotate-0 transition-transform cursor-pointer">
              👨‍🏫
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-1">
              {profileData?.first_name} {profileData?.last_name}
            </h2>
            <div className="bg-cyan-100 text-cyan-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-4">
              KIDEMLİ EĞİTMEN
            </div>
            
            <div className="w-full space-y-3 mt-4 pt-6 border-t border-gray-50 text-left">
              <div className="flex items-center gap-3 text-gray-500">
                <Mail size={18} className="text-cyan-400" />
                <span className="text-sm font-bold">{profileData?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-500">
                <Clock size={18} className="text-cyan-400" />
                <span className="text-sm font-bold">Mart 2026'dan beri</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: DETAILS */}
        <div className="lg:col-span-2 space-y-6">
          {/* EXPERTISES */}
          <div className="bg-white border-2 border-gray-100 border-b-4 rounded-3xl p-8 shadow-sm">
            <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-500 rounded-xl">
                <Zap size={22} fill="currentColor" />
              </div>
              Uzmanlık Alanlarım
            </h3>
            <div className="flex flex-wrap gap-3">
              {expertises.length > 0 ? (
                expertises.map((tag: string) => {
                  const tech = techData.languages.find((t: any) => t.label.toLowerCase() === tag.trim().toLowerCase());
                  return (
                    <span 
                      key={tag} 
                      className="px-4 py-2 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-600 hover:border-cyan-200 hover:bg-cyan-50 transition-colors cursor-default flex items-center gap-1.5"
                    >
                      {tech && <span>{tech.emoji}</span>}
                      <span>{tag}</span>
                    </span>
                  );
                })
              ) : (
                <span className="text-gray-400 font-bold italic">Henüz uzmanlık alanı eklenmemiş.</span>
              )}
            </div>
          </div>

          {/* BIO */}
          <div className="bg-white border-2 border-gray-100 border-b-4 rounded-3xl p-8 shadow-sm">
            <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-50 rounded-xl">
                <User size={22} className="text-indigo-500" />
              </div>
              Hakkımda
            </h3>
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <p className="text-gray-600 font-medium leading-relaxed italic">
                "{profileData?.bio || "Henüz biyografi eklenmemiş. Profilinizi düzenleyerek kendinizi tanıtabilirsiniz."}"
              </p>
            </div>
          </div>

          {/* BADGES / ACHIEVEMENTS */}
          {profileData?.achievements && profileData.achievements.length > 0 && (
            <div className="bg-white border-2 border-gray-100 border-b-4 rounded-3xl p-8 shadow-sm">
              <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-50 rounded-xl">
                  <Award size={22} className="text-emerald-500" />
                </div>
                Eğitmen Başarımları
              </h3>
              <div className="grid grid-cols-2 gap-4 text-left">
                {profileData.achievements.map((ach: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 group hover:bg-white hover:shadow-md transition-all">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-2xl shadow-sm rotate-3 group-hover:rotate-0 transition-transform">
                      🏅
                    </div>
                    <div>
                      <h4 className="font-black text-gray-800 text-sm">{ach.title}</h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">{ach.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* EDIT MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in" onClick={() => !isSubmitting && setIsEditing(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-zoom-in max-h-[90vh] flex flex-col">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-2xl font-black text-gray-800">Profili Düzenle</h3>
                <p className="text-sm text-gray-500 font-medium mt-1">Bilgilerini ve uzmanlıklarını güncelle.</p>
              </div>
              <button onClick={() => !isSubmitting && setIsEditing(false)} className="p-2 hover:bg-gray-100 rounded-2xl text-gray-400 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Ad</label>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({...editForm, first_name: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Soyad</label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({...editForm, last_name: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Uzmanlık Alanları</label>
                <div className="flex flex-wrap gap-2 p-4 bg-gray-50 border border-gray-200 rounded-2xl min-h-[100px]">
                  {techData.languages.map((tech) => {
                    const tag = tech.label;
                    const isSelected = editForm.expertises.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2 flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-cyan-500 text-white border-cyan-600 shadow-md"
                            : "bg-white text-gray-500 border-gray-200 hover:border-cyan-200"
                        }`}
                      >
                        <span>{tech.emoji}</span>
                        <span>{tag}</span>
                        {isSelected && <X size={12} className="ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Hakkımda</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                  className="w-full h-32 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-200 resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 sticky bottom-0">
              <button
                onClick={() => setIsEditing(false)}
                disabled={isSubmitting}
                className="px-6 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-200 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className={`bg-sky-500 hover:bg-sky-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-sky-200 transition-transform active:scale-95 flex items-center gap-2 ${
                  isSubmitting ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {isSubmitting ? "GÜNCELLENİYOR..." : "KAYDET"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorProfile;

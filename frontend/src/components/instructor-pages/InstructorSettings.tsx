import React from "react";
import { User, X, Plus, Check, Search } from "lucide-react";
import { useState } from "react";
import api from "../../api";
interface InstructorSettingsProps {
  userData?: any;
  availableTags?: string[];
}

const InstructorSettings: React.FC<InstructorSettingsProps> = ({
  userData,
  availableTags: globalAvailableTags = [],
}) => {
  const [firstname, setFirstname] = useState(userData?.first_name || "");
  const [lastname, setLastname] = useState(userData?.last_name || "");
  const [email, setEmail] = useState(userData?.email || "");
  const [bio, setBio] = useState(userData?.bio || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(
    userData?.expertises ? userData.expertises.split(",").filter(Boolean) : [],
  );
  const [availableTags, setAvailableTags] =
    useState<string[]>(globalAvailableTags);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Update local state when userData prop (from useAuth) loads
  React.useEffect(() => {
    if (userData) {
      setFirstname(userData.first_name || "");
      setLastname(userData.last_name || "");
      setEmail(userData.email || "");
      setBio(userData.bio || "");
      if (userData.expertises) {
        setSelectedTags(userData.expertises.split(",").filter(Boolean));
      }
    }
  }, [userData]);

  React.useEffect(() => {
    if (globalAvailableTags.length > 0) {
      setAvailableTags(globalAvailableTags);
      setIsLoading(false);
      return;
    }
    const fetchTags = async () => {
      try {
        const response = await api.get("/profile/tags");
        if (Array.isArray(response.data)) {
          setAvailableTags(response.data.map((t: any) => t.name));
        }
      } catch (error) {
        console.error("Tags could not be loaded", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTags();
  }, []);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await api.put("/profile/update", {
        first_name: firstname,
        last_name: lastname,
        bio: bio,
        expertises: selectedTags.join(","),
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
              <div className="flex-1 space-y-6">
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
                  <label className="block text-xs font-bold text-gray-500 mb-2">
                    Uzmanlık Alanları
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <div
                        key={tag}
                        className="group relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-sky-500 text-white shadow-md shadow-sky-100 transition-all hover:pr-10"
                      >
                        {tag}
                        <button
                          onClick={() => toggleTag(tag)}
                          className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/20 rounded-lg"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 border-dashed border-gray-200 text-gray-400 hover:border-sky-500 hover:text-sky-500 transition-all"
                    >
                      <Plus size={16} />
                      Uzmanlık Ekle
                    </button>
                  </div>
                </div>

                {/* Tag Selection Modal */}
                {isModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                      className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in"
                      onClick={() => setIsModalOpen(false)}
                    />

                    {/* Modal Content */}
                    <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-zoom-in">
                      <div className="p-8 border-b border-gray-100">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h3 className="text-2xl font-black text-gray-800">
                              Uzmanlık Alanı Ekle
                            </h3>
                            <p className="text-sm text-gray-500 font-medium">
                              Uzman olduğun alanları seçerek profilini
                              güçlendir.
                            </p>
                          </div>
                          <button
                            onClick={() => setIsModalOpen(false)}
                            className="p-2 hover:bg-gray-100 rounded-2xl text-gray-400 transition-colors"
                          >
                            <X size={24} />
                          </button>
                        </div>

                        <div className="relative">
                          <Search
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                            size={18}
                          />
                          <input
                            type="text"
                            placeholder="Uzmanlık alanı ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-sky-100 transition-all font-bold text-gray-800"
                          />
                        </div>
                      </div>

                      <div className="p-8 max-h-[400px] overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-2 gap-3">
                          {availableTags
                            .filter((tag) =>
                              tag
                                .toLowerCase()
                                .includes(searchQuery.toLowerCase()),
                            )
                            .map((tag) => {
                              const isSelected = selectedTags.includes(tag);
                              return (
                                <button
                                  key={tag}
                                  onClick={() => toggleTag(tag)}
                                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                                    isSelected
                                      ? "border-sky-500 bg-sky-50 text-sky-700"
                                      : "border-gray-100 bg-white text-gray-600 hover:border-sky-200"
                                  }`}
                                >
                                  <span className="font-bold text-sm">
                                    {tag}
                                  </span>
                                  {isSelected ? (
                                    <div className="bg-sky-500 text-white rounded-full p-1">
                                      <Check size={12} />
                                    </div>
                                  ) : (
                                    <Plus size={16} className="text-gray-300" />
                                  )}
                                </button>
                              );
                            })}
                        </div>

                        {availableTags.filter((tag) =>
                          tag.toLowerCase().includes(searchQuery.toLowerCase()),
                        ).length === 0 && (
                          <div className="text-center py-12">
                            <p className="text-gray-400 font-medium italic">
                              Aramanıza uygun bir uzmanlık bulunamadı.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="p-8 bt-gray-100 bg-gray-50 flex justify-end">
                        <button
                          onClick={() => setIsModalOpen(false)}
                          className="bg-gray-900 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-gray-200 active:scale-95 transition-all"
                        >
                          Tamam
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Hakkımda
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Deneyimlerinizden ve uzmanlıklarınızdan bahsedin..."
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

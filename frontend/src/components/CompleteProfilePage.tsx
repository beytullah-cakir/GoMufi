import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

const CompleteProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form fields
  const [nickname, setNickname] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [department, setDepartment] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get("/profile");
        setRole(response.data.role);
        // Pre-fill if exists
        if (response.data.role === "student") {
          setNickname(response.data.nickname || "");
          setGradeLevel(
            response.data.grade_level !== "Unknown"
              ? response.data.grade_level
              : ""
          );
          setEducationLevel(
            response.data.education_level !== "Unknown"
              ? response.data.education_level
              : ""
          );
        } else if (response.data.role === "teacher") {
          setDepartment(
            response.data.department !== "General"
              ? response.data.department
              : ""
          );
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        // navigate('/'); // Redirect if fails?
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put("/profile/update", {
        nickname,
        grade_level: gradeLevel,
        education_level: educationLevel,
        department,
      });
      navigate("/");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Profil güncellenirken bir hata oluştu.");
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Yükleniyor...
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md">
        <h2 className="text-3xl font-black text-gray-800 mb-6 text-center">
          Profilini Tamamla
        </h2>
        <p className="text-gray-500 mb-6 text-center">
          Devam etmek için lütfen eksik bilgileri doldur.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {role === "student" && (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Kullanıcı Adı
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 font-bold text-gray-700"
                  placeholder="Takma Adın"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Eğitim Seviyesi
                </label>
                <select
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 font-bold text-gray-700"
                  required
                >
                  <option value="" disabled>
                    Seçiniz
                  </option>
                  <option value="ilkokul">İlkokul</option>
                  <option value="ortaokul">Ortaokul</option>
                  <option value="lise">Lise</option>
                  <option value="universite">Üniversite</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Sınıf
                </label>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 font-bold text-gray-700"
                  required
                >
                  <option value="" disabled>
                    Seçiniz
                  </option>
                  {[...Array(12)].map((_, i) => (
                    <option key={i} value={`${i + 1}. Sınıf`}>
                      {i + 1}. Sınıf
                    </option>
                  ))}
                  <option value="hazirlik">Hazırlık</option>
                  <option value="mezun">Mezun</option>
                </select>
              </div>
            </>
          )}

          {role === "teacher" && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Branş / Bölüm
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 font-bold text-gray-700"
                placeholder="Örn: Matematik"
                required
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full py-4 mt-4 rounded-xl font-black text-white text-lg shadow-lg active:scale-95 transition-all bg-gray-900 hover:bg-gray-800"
          >
            Tamamla ve Başla
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfilePage;

import React, { useState } from "react";
import { Music, Star, Award, ChevronRight, ArrowLeft } from "lucide-react";
import api, { getApiBaseUrl } from "../api";
import LogoText from "../assets/sprites/GoMufiLogo_Final.png";
import Paw from "../assets/sprites/Paw.png";
import MufiMascot from "../assets/sprites/MufiMascot.png";
import { useNavigate } from "react-router-dom";

interface AuthPageProps {
  onLogin: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [role, setRole] = useState<"student" | "teacher" | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const navigate = useNavigate();

  // Common fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Student specific
  const [nickname, setNickname] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [educationLevel, setEducationLevel] = useState("");

  // Instructor specific
  const [department, setDepartment] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role || isLoading) return;

    const basePath = role === "student" ? "/student" : "/teacher";
    setIsLoading(true);

    try {
      if (isLogin) {
        await api.post(`${basePath}/login`, { email, password });
        onLogin();
        navigate("/");
      } else {
        const registerData =
          role === "student"
            ? {
                first_name: firstName,
                last_name: lastName,
                email: email,
                password: password,
                nickname: nickname,
                grade_level: gradeLevel,
                education_level: educationLevel,
              }
            : {
                first_name: firstName,
                last_name: lastName,
                email: email,
                password: password,
                department: department,
              };

        await api.post(`${basePath}/register`, registerData);
        setIsLogin(true);
        // Clear fields after successful registration
        setEmail("");
        setPassword("");
        setFirstName("");
        setLastName("");
        setNickname("");
        setDepartment("");
        setGradeLevel("");
        setEducationLevel("");
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      const errorMessage =
        err.response?.data?.detail || "Bir hata oluştu. Lütfen tekrar deneyin.";
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleSelect = (selectedRole: "student" | "teacher") => {
    setRole(selectedRole);
    setIsLogin(true);
  };

  const getInputClass = () => `
    w-full px-6 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl text-gray-800 font-bold 
    focus:outline-none focus:bg-white focus:ring-4 transition-all duration-300 placeholder-gray-400 text-base 
    focus:border-opacity-0 ${
      role === "student" ? "focus:ring-green-100" : "focus:ring-cyan-100"
    }
  `;

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col items-center justify-center p-4 relative overflow-hidden font-display selection:bg-green-200">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60rem] h-[60rem] bg-[#23c55e]/10 rounded-full mix-blend-multiply filter blur-[120px] opacity-100 animate-blob"></div>
        <div className="absolute top-[-10%] right-[-20%] w-[50rem] h-[50rem] bg-sky-400/10 rounded-full mix-blend-multiply filter blur-[120px] opacity-100 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[60rem] h-[60rem] bg-amber-300/10 rounded-full mix-blend-multiply filter blur-[120px] opacity-100 animate-blob animation-delay-4000"></div>
      </div>

      {/* Floating Icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[15%] left-[10%] animate-float opacity-20 text-[#23c55e] transform -rotate-12 blur-[1px]">
          <Music className="w-16 h-16" strokeWidth={1} />
        </div>
        <div className="absolute bottom-[25%] left-[15%] animate-float animation-delay-2000 opacity-20 text-yellow-600 transform rotate-12 blur-[1px]">
          <Star className="w-12 h-12 fill-current" />
        </div>
        <div className="absolute top-[20%] right-[10%] animate-float animation-delay-4000 opacity-20 transform rotate-12 blur-[1px]">
          <img src={Paw} alt="Paw" className="w-20 h-20 opacity-40 grayscale" />
        </div>
        <div className="absolute bottom-[15%] right-[20%] animate-float animation-delay-1000 opacity-20 text-purple-500 transform -rotate-12 blur-[1px]">
          <Award className="w-16 h-16" strokeWidth={1.5} />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-6xl flex flex-col md:flex-row items-center justify-center gap-10 md:gap-32">
        {/* Mascot Section */}
        <div
          className={`flex flex-col items-center transition-all duration-700 ease-out z-20 ${
            role ? "scale-90 md:scale-100" : "scale-100"
          }`}
        >
          <div className="relative group cursor-pointer perspective-1000">
            <div className="absolute inset-0 bg-white/40 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

            <img
              src={MufiMascot}
              alt="Mufi Mascot"
              className={`w-48 md:w-72 lg:w-96 object-contain drop-shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] 
                ${
                  isPasswordFocused
                    ? "scale-105"
                    : "animate-wave hover:scale-105"
                }`}
              style={{ filter: "drop-shadow(0 25px 50px rgba(0,0,0,0.25))" }}
            />

            {/* Speech Bubble */}
            <div
              className={`absolute -top-4 -right-12 transition-all duration-500 transform ${
                isPasswordFocused
                  ? "opacity-0 scale-75 translate-y-4"
                  : "opacity-100 rotate-6 animate-float animation-delay-1000"
              }`}
            >
              <div className="bg-white/90 backdrop-blur-md px-8 py-4 rounded-3xl rounded-bl-sm shadow-xl border border-white/50">
                <p className="font-extrabold text-gray-800 whitespace-nowrap text-sm md:text-lg tracking-tight">
                  {!role
                    ? "Karakterini Seç! 👉"
                    : role === "student"
                    ? "Hazır mısın? 🔥"
                    : "Hoşgeldiniz Hocam ✨"}
                </p>
              </div>
            </div>

            {/* Privacy Mode Bubble */}
            <div
              className={`absolute top-0 right-0 transition-all duration-500 transform ${
                !isPasswordFocused
                  ? "opacity-0 scale-75 translate-y-4 pointer-events-none"
                  : "opacity-100 -rotate-3"
              }`}
            >
              <div className="bg-gray-900/90 backdrop-blur-md px-6 py-3 rounded-2xl rounded-bl-none shadow-2xl border border-gray-700">
                <p className="font-bold text-white whitespace-nowrap text-sm">
                  🙈 Bakmıyorum!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Card */}
        <div className="w-full max-w-md perspective-1000">
          <div className="bg-white/70 backdrop-blur-xl rounded-[3rem] p-8 md:p-12 shadow-2xl relative border border-white/60 box-border transition-all duration-500 hover:shadow-purple-200/50 hover:bg-white/80">
            <div className="flex justify-center mb-10">
              <img
                src={LogoText}
                alt="GoMufi"
                className="h-32 object-contain opacity-90 drop-shadow-sm"
              />
            </div>

            {!role ? (
              <div className="animate-fade-in space-y-6">
                <div className="text-center">
                  <h2 className="text-4xl font-black text-gray-800 mb-3 tracking-tighter">
                    Karakterini Seç
                  </h2>
                  <p className="text-gray-500 font-medium text-base">
                    Yolculuğun nasıl başlayacak?
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-5">
                  <button
                    onClick={() => handleRoleSelect("student")}
                    className="group relative flex items-center p-5 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-lg hover:border-green-300 hover:scale-[1.02] transition-all duration-300"
                  >
                    <div className="w-16 h-16 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-green-100 transition-colors">
                      🎒
                    </div>
                    <div className="ml-5 text-left flex-1">
                      <h3 className="font-black text-gray-800 text-xl group-hover:text-green-600">
                        Öğrenci
                      </h3>
                      <p className="text-sm font-medium text-gray-400 group-hover:text-green-500/70">
                        Öğren, oyna, kazan.
                      </p>
                    </div>
                    <ChevronRight className="text-gray-200 group-hover:text-green-400 group-hover:translate-x-2 transition-all w-8 h-8" />
                  </button>

                  <button
                    onClick={() => handleRoleSelect("teacher")}
                    className="group relative flex items-center p-5 rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-lg hover:border-cyan-300 hover:scale-[1.02] transition-all duration-300"
                  >
                    <div className="w-16 h-16 bg-cyan-50 text-cyan-500 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-cyan-100 transition-colors">
                      👨‍🏫
                    </div>
                    <div className="ml-5 text-left flex-1">
                      <h3 className="font-black text-gray-800 text-xl group-hover:text-cyan-600">
                        Eğitmen
                      </h3>
                      <p className="text-sm font-medium text-gray-400 group-hover:text-cyan-500/70">
                        İçerik üret ve yönet.
                      </p>
                    </div>
                    <ChevronRight className="text-gray-200 group-hover:text-cyan-400 group-hover:translate-x-2 transition-all w-8 h-8" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="animate-fade-in">
                <div className="mb-8 relative pl-2">
                  <button
                    onClick={() => setRole(null)}
                    className="absolute -top-3 -left-4 p-3 hover:bg-gray-100/50 rounded-full text-gray-400 hover:text-gray-700 transition-colors group"
                    title="Geri Dön"
                  >
                    <ArrowLeft className="group-hover:-translate-x-1 transition-transform w-6 h-6" />
                  </button>
                  <div className="text-center pt-2">
                    <div
                      className={`inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-3 ${
                        role === "student"
                          ? "bg-green-100 text-green-600"
                          : "bg-cyan-100 text-cyan-600"
                      }`}
                    >
                      {role === "student" ? "Öğrenci Girişi" : "Eğitmen Paneli"}
                    </div>
                    <h2 className="text-3xl font-black text-gray-800 mb-1 tracking-tight">
                      {isLogin
                        ? role === "student"
                          ? "Tekrar Hoşgeldin!"
                          : "Hoşgeldiniz"
                        : "Hesap Oluştur"}
                    </h2>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <>
                      <div className="flex gap-4">
                        <div className="group flex-1">
                          <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className={getInputClass()}
                            placeholder="İsim"
                            required
                          />
                        </div>
                        <div className="group flex-1">
                          <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className={getInputClass()}
                            placeholder="Soyisim"
                            required
                          />
                        </div>
                      </div>

                      {role === "student" && (
                        <>
                          <div className="group">
                            <input
                              type="text"
                              value={nickname}
                              onChange={(e) => setNickname(e.target.value)}
                              className={getInputClass()}
                              placeholder="Kullanıcı Adı"
                              required
                            />
                          </div>
                          <div className="flex gap-4">
                            <div className="group flex-1">
                              <div className="relative">
                                <select
                                  value={educationLevel}
                                  onChange={(e) =>
                                    setEducationLevel(e.target.value)
                                  }
                                  className={`${getInputClass()} appearance-none cursor-pointer`}
                                  required
                                >
                                  <option value="" disabled>
                                    Okul Seviyesi
                                  </option>
                                  <option value="ilkokul">İlkokul</option>
                                  <option value="ortaokul">Ortaokul</option>
                                  <option value="lise">Lise</option>
                                  <option value="universite">Üniversite</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                                  <ChevronRight className="w-4 h-4 rotate-90" />
                                </div>
                              </div>
                            </div>
                            <div className="group flex-1">
                              <div className="relative">
                                <select
                                  value={gradeLevel}
                                  onChange={(e) =>
                                    setGradeLevel(e.target.value)
                                  }
                                  className={`${getInputClass()} appearance-none cursor-pointer`}
                                  required
                                >
                                  <option value="" disabled>
                                    Sınıf
                                  </option>
                                  {[...Array(12)].map((_, i) => (
                                    <option key={i} value={`${i + 1}. Sınıf`}>
                                      {i + 1}. Sınıf
                                    </option>
                                  ))}
                                  <option value="hazirlik">Hazırlık</option>
                                  <option value="mezun">Mezun</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                                  <ChevronRight className="w-4 h-4 rotate-90" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {role === "teacher" && (
                        <div className="group">
                          <input
                            type="text"
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            className={getInputClass()}
                            placeholder="Branş / Bölüm"
                            required
                          />
                        </div>
                      )}
                    </>
                  )}

                  <div className="group">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={getInputClass()}
                      placeholder="E-Posta"
                      required
                    />
                  </div>

                  <div className="group">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                      className={getInputClass()}
                      placeholder="Şifre"
                      required
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`w-full py-5 rounded-2xl font-black text-white text-xl shadow-xl active:scale-95 active:shadow-sm transition-all duration-200 tracking-wide flex items-center justify-center gap-3
                        ${
                          role === "student"
                            ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 shadow-green-200/50"
                            : "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 shadow-cyan-200/50"
                        } ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
                    >
                      {isLoading ? (
                        <>
                          <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>BEKLEYİN...</span>
                        </>
                      ) : isLogin ? (
                        "GİRİŞ YAP"
                      ) : (
                        "KAYIT OL"
                      )}
                    </button>
                  </div>

                  <div className="relative flex items-center justify-center my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative bg-white px-4 text-sm text-gray-500">
                      veya
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const targetRole = role;
                      window.location.href = `${getApiBaseUrl()}/auth/google/login?role=${targetRole}`;
                    }}
                    className="w-full py-4 px-6 rounded-2xl border-2 border-gray-100 bg-white text-gray-700 font-bold text-lg hover:bg-gray-50 hover:border-gray-200 active:scale-95 transition-all duration-200 flex items-center justify-center gap-3 shadow-sm"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Google ile {isLogin ? "Giriş Yap" : "Kayıt Ol"}
                  </button>
                </form>

                <div className="mt-8 text-center">
                  <p className="text-gray-400 font-bold text-sm">
                    {isLogin
                      ? "Henüz hesabın yok mu?"
                      : "Zaten hesabın var mı?"}
                    <button
                      onClick={() => setIsLogin(!isLogin)}
                      className={`ml-2 hover:underline transition-colors ${
                        role === "student" ? "text-green-600" : "text-cyan-600"
                      }`}
                    >
                      {isLogin ? "Hemen Oluştur" : "Giriş Yap"}
                    </button>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

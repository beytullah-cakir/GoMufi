import React, { useState } from "react";
import { Star, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";

import LogoText from "../assets/sprites/LogoText.png";
import Paw from "../assets/sprites/Paw.png";
import MufiMascot from "../assets/sprites/MufiMascot.png";
import api from "../api";

interface AuthPageProps {
  onLogin: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const navigate = useNavigate();

  const [role, setRole] = useState<"student" | "instructor" | null>(null);
  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  // 🔑 SUBMIT
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;

    const basePath = role === "student" ? "/student" : "/teacher";

    try {
      if (isLogin) {
        await api.post(`${basePath}/login`, { email, password });
        onLogin();
        navigate("/");
      } else {
        await api.post(`${basePath}/register`, {
          first_name: firstName,
          last_name: lastName,
          email,
          password,
        });
        setIsLogin(true);
      }
    } catch (err) {
      console.error("Auth error:", err);
    }
  };

  const inputClass = `
    w-full px-6 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl
    text-gray-800 font-bold focus:outline-none focus:bg-white focus:ring-4
    transition-all placeholder-gray-400
    ${role === "student" ? "focus:ring-green-100" : "focus:ring-cyan-100"}
  `;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4 relative overflow-hidden">

      {/* BACKGROUND ICONS */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-[25%] left-[15%] opacity-20">
          <Star className="w-12 h-12 fill-current text-yellow-600" />
        </div>
        <div className="absolute top-[20%] right-[10%] opacity-20">
          <img src={Paw} alt="paw" className="w-20 opacity-40 grayscale" />
        </div>
        <div className="absolute bottom-[15%] right-[20%] opacity-20">
          <Award className="w-16 h-16 text-purple-500" />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-6xl flex gap-20 items-center justify-center">

        {/* MASCOT */}
        <div className="hidden md:block">
          <img
            src={MufiMascot}
            alt="Mascot"
            className={`w-80 transition-all ${
              isPasswordFocused ? "rotate-180 opacity-70" : ""
            }`}
          />
        </div>

        {/* CARD */}
        <div className="bg-white/70 backdrop-blur-xl rounded-[3rem] p-10 shadow-2xl w-full max-w-md">

          <img src={LogoText} alt="logo" className="h-28 mx-auto mb-8" />

          {!role ? (
            <>
              <button
                onClick={() => setRole("student")}
                className="w-full mb-4 py-4 rounded-2xl bg-green-500 text-white font-black"
              >
                🎒 Öğrenci
              </button>

              <button
                onClick={() => setRole("instructor")}
                className="w-full py-4 rounded-2xl bg-cyan-500 text-white font-black"
              >
                👨‍🏫 Eğitmen
              </button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-black text-center mb-6">
                {isLogin ? "Giriş Yap" : "Kayıt Ol"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">

                {!isLogin && (
                  <>
                    <input
                      className={inputClass}
                      placeholder="İsim"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                    <input
                      className={inputClass}
                      placeholder="Soyisim"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </>
                )}

                <input
                  className={inputClass}
                  placeholder="E-posta"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <input
                  type="password"
                  className={inputClass}
                  placeholder="Şifre"
                  value={password}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button
                  type="submit"
                  className={`w-full py-4 rounded-2xl text-white font-black ${
                    role === "student"
                      ? "bg-green-500"
                      : "bg-cyan-500"
                  }`}
                >
                  {isLogin ? "GİRİŞ YAP" : "KAYIT OL"}
                </button>
              </form>

              <p className="text-center mt-6 text-sm">
                {isLogin ? "Hesabın yok mu?" : "Zaten hesabın var mı?"}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="ml-2 font-bold underline"
                >
                  {isLogin ? "Kayıt Ol" : "Giriş Yap"}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

import React, { useState } from "react";
import { LogOut, ChevronLeft, ChevronRight, Backpack, Presentation, Users, ShieldCheck, Menu, X } from 'lucide-react';
import posthog from "posthog-js";
import api from "../api";

// Import sprites
import MufiLogo from "../assets/sprites/MufiLogo.png";
import GoMufiLogo_Final from "../assets/sprites/GoMufiLogo_Final.png";
import FireIcon from "../assets/sprites/Fire.png";

export interface SidebarItem {
  label: string;
  id: string;
  icon: React.ElementType;
  badgeCount?: number;
  /** Menü grubu başlığı; aynı gruptaki ardışık öğeler tek başlık altında. */
  section?: string;
}

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  isCollapsed: boolean;
  onClick: () => void;
  badgeCount?: number;
  themeColor: "sky" | "purple";
}

const NavItem: React.FC<NavItemProps> = ({
  icon: Icon,
  label,
  isActive,
  isCollapsed,
  onClick,
  badgeCount,
  themeColor,
}) => {
  const activeClass =
    themeColor === "purple"
      ? "bg-purple-100 border-purple-400 border-b-purple-400 text-purple-500"
      : "bg-sky-100 border-sky-400 border-b-sky-400 text-sky-500";

  const iconColorClass = isActive
    ? themeColor === "purple"
      ? "text-purple-500"
      : "text-sky-500"
    : "text-gray-400 group-hover:text-gray-600";

  return (
    <button
      type="button"
      onClick={onClick}
      data-nav={label}
      className={`flex items-center gap-4 mb-2 rounded-2xl cursor-pointer transition-all duration-75 group relative border-2 border-b-4 select-none
      ${
        isActive
          ? `${activeClass} translate-y-0`
          : "bg-transparent border-transparent border-b-transparent text-gray-400 hover:bg-gray-50 hover:text-gray-600 hover:border-gray-200 hover:border-b-gray-200 active:border-b-transparent active:translate-y-[4px] active:border-b-[0px] active:duration-0"
      }
      ${isCollapsed ? "justify-center w-12 h-12 px-0 py-0 mx-auto" : "w-full px-5 py-3.5"}
      `}
      title={isCollapsed ? label : undefined}
    >
      <div
        className={`flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${
          isCollapsed ? "" : "w-6 h-6"
        } ${isActive ? "scale-110" : "group-hover:scale-110"}`}
      >
        <Icon className={`w-5 h-5 ${iconColorClass}`} strokeWidth={isActive ? 3 : 2.5} />
      </div>

      {!isCollapsed && (
        <span className="font-black tracking-wider uppercase font-sans text-sm whitespace-nowrap">
          {label}
        </span>
      )}

      {/* Badge rendering */}
      {badgeCount !== undefined && badgeCount > 0 && (
        <>
          {!isCollapsed ? (
            <span className="ml-auto bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce shadow-sm shrink-0">
              {badgeCount}
            </span>
          ) : (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce shadow-sm z-30 animate-[pulse_1.5s_infinite]">
              {badgeCount}
            </span>
          )}
        </>
      )}
    </button>
  );
};

interface SidebarProps {
  role: "student" | "instructor" | "parent" | "admin";
  activePage: string;
  onNavigate: (id: string) => void;
  items: SidebarItem[];
  userData?: any;
}

const Sidebar: React.FC<SidebarProps> = ({
  role,
  activePage,
  onNavigate,
  items,
  userData,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const themeColor = role === "parent" ? "purple" : "sky";

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      // Paylaşımlı cihazda kimliğin bir sonraki kullanıcıya karışmaması için sıfırla
      try { posthog?.reset(); } catch { /* posthog init edilmemiş olabilir */ }
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("gomufi_lesson_builder_draft");
      window.location.href = "/";
    }
  };

  const getLogoBorderColor = () => {
    switch (role) {
      case "student":
        return "border-yellow-300";
      case "instructor":
        return "border-sky-300";
      case "parent":
        return "border-purple-300";
      case "admin":
        return "border-red-400 bg-red-50";
      default:
        return "border-gray-300";
    }
  };

  const getBadgeText = () => {
    switch (role) {
      case "student":
        return "Öğrenci";
      case "instructor":
        return "Eğitmen";
      case "parent":
        return "Ebeveyn";
      case "admin":
        return "Yönetici";
      default:
        return "";
    }
  };

  const getBadgeClass = () => {
    if (role === "admin") {
      return "text-red-500 bg-red-50";
    }
    return themeColor === "purple"
      ? "text-purple-500 bg-purple-100"
      : "text-sky-500 bg-sky-100";
  };

  return (
    <>
    <MobileNav
      role={role}
      activePage={activePage}
      onNavigate={onNavigate}
      items={items}
      userData={userData}
      onLogout={handleLogout}
    />
    <div
      className={`relative h-screen bg-white border-r-2 border-gray-200 hidden md:flex flex-col transition-all duration-300 ease-in-out z-[100] shrink-0 box-border ${
        isCollapsed ? "w-24" : "w-64"
      }`}
    >
      {/* Logo Area */}
      <div
        className={`p-6 mb-2 flex flex-col relative cursor-pointer select-none`}
      >
        <div 
          className="flex items-center gap-3 hover:scale-105 transition-transform duration-300"
          onClick={() => {
            if (role === "admin" || userData?.role === "admin") {
              setIsAdminMenuOpen(!isAdminMenuOpen);
            } else {
              onNavigate(role === "student" ? "Ana Sayfa" : "Dashboard");
            }
          }}
        >
          <div
            className={`flex-shrink-0 bg-white rounded-2xl flex items-center justify-center border-b-4 shadow-sm transition-all duration-300 overflow-hidden ${getLogoBorderColor()}`}
            style={{
              width: isCollapsed ? "56px" : "72px",
              height: isCollapsed ? "56px" : "72px",
            }}
          >
            <img
              src={MufiLogo}
              alt="GoMufi Logo"
              className="w-full h-full object-contain scale-110"
            />
          </div>
          {!isCollapsed && (
            <div className="ml-1 flex flex-col justify-center">
              <img
                src={GoMufiLogo_Final}
                alt="GoMufi"
                className="h-16 object-contain -ml-2"
              />
              <span
                className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md self-start -mt-3 flex items-center gap-1 ${getBadgeClass()}`}
              >
                {getBadgeText()} {(role === "admin" || userData?.role === "admin") && <span className="text-[8px] animate-pulse">▼</span>}
              </span>
            </div>
          )}
        </div>

        {/* Floating Admin ComboBox / Panel Selector */}
        {isAdminMenuOpen && (role === "admin" || userData?.role === "admin") && (
          <div className="absolute top-[85px] left-4 right-4 bg-white border-2 border-gray-200 rounded-[1.5rem] shadow-2xl z-[9999] py-3 animate-in zoom-in-95 duration-100 font-sans border-b-4">
            <span className="block px-4 py-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">
              PANEL SEÇİMİ
            </span>
            {PANELS.map(panel => (
              <button
                key={panel.path}
                type="button"
                onClick={() => {
                  setIsAdminMenuOpen(false);
                  window.location.href = panel.path;
                }}
                className={`w-full text-left px-4 py-2.5 font-black text-[11px] uppercase tracking-wider transition-all duration-75 flex items-center gap-2
                  ${window.location.pathname.startsWith(panel.path)
                    ? "bg-sky-100 text-sky-600 border-l-4 border-sky-400"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                  }`}
              >
                <panel.Icon size={14} className="shrink-0" /> {panel.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <div className="flex-1 px-4 overflow-y-auto no-scrollbar mt-4">
        {items.map((item, index) => (
          <React.Fragment key={item.id}>
          {item.section && item.section !== items[index - 1]?.section && (
            isCollapsed
              ? <div className="h-px bg-gray-100 mx-2 my-3" />
              : <p className="px-3 mt-4 mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">{item.section}</p>
          )}
          <NavItem
            icon={item.icon}
            label={item.label}
            isActive={activePage === item.id}
            isCollapsed={isCollapsed}
            onClick={() => onNavigate(item.id)}
            badgeCount={item.badgeCount}
            themeColor={themeColor}
          />
          </React.Fragment>
        ))}
      </div>

      {/* Bottom section with stats and logout */}
      <div className="mt-auto shrink-0 flex flex-col pt-4">
        {/* Öğrenci: seviye, XP ve seri tek kartta (eskiden yalnızca "🔥 0") */}
        {role === "student" && (
          <div className="px-4 mb-4">
            {isCollapsed ? (
              <div className="p-2 bg-orange-50 border-2 border-orange-100 rounded-2xl flex flex-col items-center gap-1" title={`${userData?.streak ?? 0} günlük seri`}>
                <img src={FireIcon} alt="" className="w-6 h-6" />
                <span className="text-xs font-black text-orange-500">{userData?.streak ?? 0}</span>
              </div>
            ) : (
              <div className="p-3 bg-white border-2 border-slate-200 border-b-4 rounded-2xl">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl bg-amber-400 text-amber-950 font-black flex items-center justify-center shrink-0 border-b-4 border-amber-600" title="Seviye">
                    {userData?.progression?.level ?? 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-xs font-black text-slate-700">
                      <span>{(userData?.xp ?? 0).toLocaleString("tr-TR")} XP</span>
                      <span className="flex items-center gap-0.5 text-orange-500" title="Günlük seri">
                        <img src={FireIcon} alt="" className="w-4 h-4" />{userData?.streak ?? 0}
                      </span>
                    </div>
                    <div className="h-2 mt-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.max(4, Math.min(100, userData?.progression?.progress_pct ?? 0))}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LOGOUT BUTTON */}
        <div className="px-4 pb-8">
          <button
            type="button"
            onClick={handleLogout}
            className={`w-full group relative flex cursor-pointer items-center rounded-2xl border-2 border-transparent bg-red-50 py-3 transition-all duration-75 hover:border-red-200 hover:border-b-[4px] hover:bg-red-100 active:translate-y-[4px] active:border-b-[0px]
            ${isCollapsed ? "justify-center w-12 h-12 px-0 mx-auto" : "px-4"}`}
            title={isCollapsed ? "Çıkış Yap" : undefined}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center text-red-500">
              <LogOut size={22} strokeWidth={2.5} />
            </div>
            {!isCollapsed && (
              <span className="ml-4 font-sans text-sm font-black uppercase tracking-wider text-red-500">
                Çıkış Yap
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Collapse Toggle Button */}
      <div className="absolute -right-5 top-1/2 transform -translate-y-1/2 z-[150]">
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="relative bg-gray-300 text-white w-10 h-16 rounded-xl border-b-4 border-gray-400 flex items-center justify-center shadow-sm hover:bg-gray-400 hover:border-gray-500 active:border-b-[2px] active:translate-y-[2px] active:duration-0 transition-all duration-75 cursor-pointer"
        >
          {/* Invisible larger hit area to make it easier to click */}
          <div className="absolute -inset-4 z-0" />
          {isCollapsed ? (
            <ChevronRight size={22} strokeWidth={4} className="pointer-events-none relative z-10" />
          ) : (
            <ChevronLeft size={22} strokeWidth={4} className="pointer-events-none relative z-10" />
          )}
        </button>
      </div>
    </div>
    </>
  );
};

const PANELS = [
  { label: "Öğrenci Paneli", path: "/student", Icon: Backpack },
  { label: "Eğitmen Paneli", path: "/instructor", Icon: Presentation },
  { label: "Ebeveyn Paneli", path: "/parent", Icon: Users },
  { label: "Yönetici Paneli", path: "/admin", Icon: ShieldCheck },
];

/**
 * Telefon görünümü (md altı): yan menü yerine alt sekme çubuğu. İlk dört öğe
 * sekme olur; kalanlar, seri, panel seçimi ve çıkış "Menü" sayfasındadır.
 * Yerleşim kapsayıcısı telefonda flex-col olduğundan çubuk akışta en alta oturur.
 */
const MobileNav: React.FC<SidebarProps & { onLogout: () => void }> = ({
  role, activePage, onNavigate, items, userData, onLogout,
}) => {
  const [open, setOpen] = useState(false);
  const tabs = items.slice(0, 4);
  const rest = items.filter((i) => !tabs.includes(i));
  const restActive = rest.some((i) => i.id === activePage);
  const isAdmin = role === "admin" || userData?.role === "admin";
  const accent = role === "parent" ? "text-purple-600" : "text-sky-600";
  const accentBg = role === "parent" ? "bg-purple-100" : "bg-sky-100";

  const go = (id: string) => { setOpen(false); onNavigate(id); };

  return (
    <nav className="md:hidden order-last shrink-0 relative z-[100] bg-white border-t-2 border-gray-200 pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {tabs.map((item) => {
          const active = item.id === activePage;
          return (
            <button key={item.id} type="button" onClick={() => go(item.id)} data-nav={item.label}
                    className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 pt-2 pb-1.5 relative ${active ? accent : "text-gray-400"}`}>
              <span className={`w-12 h-7 rounded-full flex items-center justify-center ${active ? accentBg : ""}`}>
                <item.icon size={20} strokeWidth={active ? 2.75 : 2.25} />
              </span>
              <span className="text-[11px] font-black truncate max-w-full px-1">{item.label}</span>
              {!!item.badgeCount && (
                <span className="absolute top-1 left-1/2 ml-2 bg-red-500 text-white text-[10px] font-black min-w-4 h-4 px-1 rounded-full flex items-center justify-center">{item.badgeCount}</span>
              )}
            </button>
          );
        })}
        <button type="button" onClick={() => setOpen(true)}
                className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 pt-2 pb-1.5 ${restActive ? accent : "text-gray-400"}`}>
          <span className={`w-12 h-7 rounded-full flex items-center justify-center ${restActive ? accentBg : ""}`}><Menu size={20} /></span>
          <span className="text-[11px] font-black">Menü</span>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end" role="dialog" aria-modal="true" aria-label="Menü">
          <button type="button" aria-label="Kapat" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-t-3xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-1 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <img src={MufiLogo} alt="" className="w-9 h-9 object-contain" />
                <span className="font-black text-gray-800">{userData?.first_name || "GoMufi"}</span>
                {role === "student" && (
                  <span className="flex items-center gap-1 text-sm font-black text-orange-500" title="Günlük seri">
                    <img src={FireIcon} alt="" className="w-5 h-5" /> {userData?.streak ?? 0} gün
                  </span>
                )}
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Kapat" className="p-2 rounded-xl text-gray-400 hover:bg-gray-100"><X size={20} /></button>
            </div>
            {rest.map((item) => (
              <button key={item.id} type="button" onClick={() => go(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-black ${item.id === activePage ? `${accentBg} ${accent}` : "text-gray-600 hover:bg-gray-50"}`}>
                <item.icon size={20} /> {item.label}
                {!!item.badgeCount && <span className="ml-auto bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">{item.badgeCount}</span>}
              </button>
            ))}
            {isAdmin && (
              <div className="pt-2 mt-2 border-t border-gray-100">
                <p className="px-4 py-1 text-[11px] font-black uppercase tracking-widest text-gray-400">Panel seçimi</p>
                {PANELS.map((p) => (
                  <button key={p.path} type="button" onClick={() => { window.location.href = p.path; }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50">
                    <p.Icon size={18} /> {p.label}
                  </button>
                ))}
              </div>
            )}
            <button type="button" onClick={onLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 mt-2 rounded-2xl text-sm font-black text-red-500 bg-red-50">
              <LogOut size={20} /> Çıkış Yap
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Sidebar;

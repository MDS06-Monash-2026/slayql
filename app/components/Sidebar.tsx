'use client';

import { Home, Database, Trophy, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';

type Tab = 'prompt' | 'data' | 'sota';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, collapsed, onToggle }: SidebarProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [logoutStep, setLogoutStep] = useState<'idle' | 'confirm' | 'goodbye'>('idle');

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const menuItems = [
    { id: 'prompt', label: 'Text to SQL', icon: Home },
    { id: 'data', label: 'Explore', icon: Database },
    { id: 'sota', label: 'SOTA', icon: Trophy },
  ] as const;

  const username = 'Kian Lok';
  const role = 'Admin User';
  const initial = username.charAt(0).toUpperCase();

  const handleLogoutClick = () => setLogoutStep('confirm');

  const confirmLogout = () => {
    setLogoutStep('goodbye');
    setTimeout(() => {
      localStorage.removeItem('slayyyql_loggedIn');
      localStorage.removeItem('welcomeDone');
      window.location.href = '/';
    }, 2500);
  };

  const cancelLogout = () => setLogoutStep('idle');

  // ---------- Logout Overlay (responsive) ----------
  const LogoutOverlay = () => {
    if (logoutStep === 'idle') return null;

    return (
      <div className="fixed inset-0 z-[9999] bg-[#060b14]/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-8">
        <div className={`flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8 transition-all duration-700 ${logoutStep === 'goodbye' ? 'animate-pulse scale-110' : 'scale-100'}`}>
          <img src="/logo.png" alt="Logo" className="h-14 sm:h-20 w-auto drop-shadow-[0_0_20px_rgba(34,211,238,0.6)]" />
          <img src="/logo-text.png" alt="SlayyyQL" className="h-8 sm:h-12 w-auto drop-shadow-[0_0_15px_rgba(244,114,182,0.5)] hidden sm:block" />
        </div>

        {logoutStep === 'confirm' && (
          <div className="flex flex-col items-center p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-[#0a101d]/80 border border-cyan-900/50 shadow-[0_0_40px_rgba(34,211,238,0.1)] backdrop-blur-md max-w-xs sm:max-w-sm w-full mx-4">
            <h2 className="text-lg sm:text-2xl font-bold text-white mb-2 tracking-wide text-center">Disconnect Session?</h2>
            <p className="text-xs sm:text-sm text-white/50 mb-6 sm:mb-8 text-center">Are you sure you want to log out of SlayQL?</p>

            <div className="flex w-full gap-3 sm:gap-4">
              <button
                onClick={cancelLogout}
                className="flex-1 py-2.5 sm:py-3 rounded-xl font-semibold text-white/60 bg-white/5 hover:bg-white/10 hover:text-white transition-all border border-white/10 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 py-2.5 sm:py-3 rounded-xl font-bold text-red-50 bg-red-500/80 hover:bg-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all border border-red-400/50 text-sm"
              >
                Confirm
              </button>
            </div>
          </div>
        )}

        {logoutStep === 'goodbye' && (
          <div className="flex flex-col items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative text-center">
              <span className="text-2xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-fuchsia-500 to-cyan-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] px-2 sm:px-4">
                Thank you for using SlayQL
              </span>
              <div className="absolute inset-0 blur-2xl bg-gradient-to-r from-red-500/40 via-fuchsia-500/40 to-cyan-500/40 -z-10" />
            </div>

            <div className="flex gap-3 items-center">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500 animate-bounce shadow-[0_0_10px_rgba(239,68,68,0.8)]" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-fuchsia-500 animate-bounce shadow-[0_0_10px_rgba(217,70,239,0.8)]" style={{ animationDelay: '200ms' }} />
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-cyan-500 animate-bounce shadow-[0_0_10px_rgba(34,211,238,0.8)]" style={{ animationDelay: '400ms' }} />
            </div>
          </div>
        )}
      </div>
    );
  };

  // ---------- MOBILE BOTTOM NAV (enhanced) ----------
  if (isMobile) {
    return (
      <>
        <LogoutOverlay />
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-1 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-[#0a101d]/95 backdrop-blur-2xl border-t border-cyan-900/30 shadow-[0_-10px_30px_rgba(34,211,238,0.05)]">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-2xl transition-all duration-300 min-w-0 flex-1 max-w-[80px] ${
                  isActive ? '-translate-y-0.5' : ''
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 to-transparent rounded-2xl border border-cyan-500/20" />
                )}
                <div className={`relative z-10 transition-all duration-300 ${
                  isActive
                    ? 'text-cyan-400 drop-shadow-[0_0_10px_#22d3ee] scale-110'
                    : 'text-white/40 group-hover:text-white/80'
                }`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className={`relative z-10 text-[9px] sm:text-[10px] font-semibold tracking-wider mt-0.5 transition-colors ${
                  isActive ? 'text-cyan-400' : 'text-white/30'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Mobile logout button (compact) */}
          {/* <button
            onClick={handleLogoutClick}
            className="relative flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-2xl transition-all duration-300 text-red-500/60 hover:text-red-400"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[9px] font-semibold tracking-wider">Exit</span>
          </button> */}
        </div>
      </>
    );
  }

  // ---------- DESKTOP SIDEBAR (unchanged, already responsive) ----------
  return (
    <>
      <LogoutOverlay />
      <div
        className={`relative h-full flex flex-col bg-[#0a101d]/80 backdrop-blur-3xl border-r border-cyan-900/30 shadow-[5px_0_30px_rgba(0,0,0,0.5)] z-20 transition-all duration-400 ease-in-out ${
          collapsed ? 'w-[72px]' : 'w-[240px]'
        }`}
      >
        {/* Toggle button */}
        <button
          onClick={onToggle}
          className="absolute -right-3.5 top-20 w-7 h-7 rounded-full bg-[#060b14] border border-cyan-500/30 flex items-center justify-center hover:bg-cyan-900/40 hover:border-cyan-400 transition-all z-30 shadow-[0_0_15px_rgba(34,211,238,0.15)] group"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          )}
        </button>

        {/* User Profile */}
        <div className={`px-4 pt-8 transition-all duration-400 ${collapsed ? 'pb-4' : 'pb-6'}`}>
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : 'p-2 rounded-2xl bg-white/[0.02] border border-white/[0.05] shadow-inner'}`}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-[#060b14] border border-cyan-500/40 shadow-[0_0_15px_rgba(34,211,238,0.2)] shrink-0 group hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all">
              <span className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 to-fuchsia-400">
                {initial}
              </span>
            </div>
            {!collapsed && (
              <div className="flex flex-col justify-center overflow-hidden">
                <div className="font-bold tracking-wide text-sm text-white/95 truncate">{username}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/60 font-mono mt-0.5 truncate">{role}</div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-3 py-4 overflow-y-auto">
          {!collapsed && (
            <div className="text-[10px] font-bold tracking-[0.25em] text-white/20 mb-4 px-3">NAVIGATION</div>
          )}
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group relative ${
                    collapsed ? 'justify-center' : ''
                  } ${
                    isActive
                      ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.1)]'
                      : 'border border-transparent text-white/40 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className={`w-5 h-5 relative z-10 transition-all duration-300 ${
                    isActive ? 'drop-shadow-[0_0_8px_#22d3ee] scale-110' : 'group-hover:scale-110'
                  }`} />
                  {!collapsed && (
                    <span className={`font-semibold text-sm relative z-10 tracking-wide transition-colors ${
                      isActive ? 'text-white' : ''
                    }`}>
                      {item.label}
                    </span>
                  )}
                  {isActive && !collapsed && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Logout */}
        {/* <div className="p-4 mt-auto">
          <button
            onClick={handleLogoutClick}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group ${
              collapsed ? 'justify-center px-0' : ''
            } text-red-500 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:border-red-400 hover:text-red-400 hover:shadow-[0_0_20px_rgba(239,68,68,0.25)]`}
            title="Logout"
          >
            <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            {!collapsed && (
              <span className="text-sm font-bold tracking-widest uppercase transition-colors">Logout</span>
            )}
          </button>
        </div> */}
      </div>
    </>
  );
}

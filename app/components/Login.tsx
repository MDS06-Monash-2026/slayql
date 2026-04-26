'use client';

import { useState } from 'react';
import CanvasParticles from './CanvasParticles';

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [userId, setUserId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validUserId = process.env.NEXT_PUBLIC_USER_ID;
  const validPasscode = process.env.NEXT_PUBLIC_PASSCODE;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!userId.trim() || !passcode.trim()) {
      setError('Please fill in both fields.');
      return;
    }

    if (userId !== validUserId || passcode !== validPasscode) {
      setError('Invalid credentials. Access denied.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      onLogin();
      setLoading(false);
    }, 1500); // slightly longer for better UX
  };

  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden relative bg-gradient-to-b from-[#0f172a] via-[#060b14] to-[#03050a]">
      {/* Background animations (same as before, kept for atmosphere) */}
      <style>{`
        @keyframes scroll-grid {
          0% { background-position: 0 0; }
          100% { background-position: 40px 40px; }
        }
        @keyframes float-orb-1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(50px,50px)} }
        @keyframes float-orb-2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-40px,-20px)} }
        @keyframes sweep-scanline {
          0%{transform:translateY(-100%);opacity:0}
          10%{opacity:1}
          90%{opacity:1}
          100%{transform:translateY(100vh);opacity:0}
        }
        .animate-scroll-grid{animation:scroll-grid 3s linear infinite}
        .animate-orb-1{animation:float-orb-1 12s ease-in-out infinite}
        .animate-orb-2{animation:float-orb-2 10s ease-in-out infinite}
        .animate-scanline{animation:sweep-scanline 4s ease-in-out infinite}
      `}</style>

      {/* Background layers */}
      <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[120px] animate-orb-1 mix-blend-screen" />
      <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-fuchsia-600/15 rounded-full blur-[120px] animate-orb-2 mix-blend-screen" />
      <div className="absolute top-[30%] left-[40%] w-[30%] h-[30%] bg-blue-600/10 rounded-full blur-[100px] animate-pulse" />
      <CanvasParticles />
      <div
        className="absolute inset-0 opacity-20 animate-scroll-grid"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(34,211,238,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(34,211,238,0.12) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
        }}
      />
      <div className="absolute inset-0 w-full h-[15vh] bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent animate-scanline mix-blend-overlay" />
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md px-4 py-8">
        <div className="backdrop-blur-xl bg-black/40 rounded-3xl border border-white/10 shadow-2xl shadow-cyan-500/20 p-8 md:p-10">
          {/* Logo section */}
          <div className="flex flex-col items-center gap-5 mb-10">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-400/20 blur-3xl rounded-full w-32 h-32 -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2" />
              <img src="/logo.png" alt="Logo" className="h-28 w-auto drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]" />
            </div>
            <img src="/logo-text.png" alt="SlayyQL" className="h-12 w-auto drop-shadow-[0_0_12px_rgba(244,114,182,0.4)]" />
          </div>

          {/* Error display */}
          {error && (
            <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-red-900/20 border border-red-500/30 rounded-xl text-red-300 text-sm font-mono animate-[fadeIn_0.3s_ease-out]">
              <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* User ID field */}
            <div className="relative">
              <label htmlFor="userId" className="block text-xs text-zinc-400 tracking-widest mb-2 uppercase">
                User ID
              </label>
<input
  id="userId"
  type="text"
  placeholder="Enter your user ID"
  value={userId}
  onChange={(e) => {
    setUserId(e.target.value);
    setError(null);               // ← clear error on edit
  }}
  className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all duration-300 tracking-wide"
  autoComplete="username"
  required
/>
            </div>

            {/* Passcode field */}
            <div className="relative">
              <label htmlFor="passcode" className="block text-xs text-zinc-400 tracking-widest mb-2 uppercase">
                Passcode
              </label>
              <input
  id="passcode"
  type="password"
  placeholder="Enter your passcode"
  value={passcode}
  onChange={(e) => {
    setPasscode(e.target.value);
    setError(null);               // ← clear error on edit
  }}
  className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all duration-300 tracking-wide"
  autoComplete="current-password"
  required
/>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full py-3.5 bg-gradient-to-r from-cyan-500 to-pink-500 rounded-xl font-semibold text-black tracking-widest uppercase text-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-cyan-500/30 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-black" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Authenticating...
                </span>
              ) : (
                'Initialize Session'
              )}
            </button>
          </form>

          {/* Help text */}
          <p className="mt-8 text-center text-xs text-zinc-600 tracking-widest">
            Secure connection · End-to-end encrypted
          </p>
        </div>
      </div>
    </div>
  );
}

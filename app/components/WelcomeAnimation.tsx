'use client';

import { useEffect, useState } from 'react';
import CanvasParticles from './CanvasParticles'; // Adjust path if needed

export default function WelcomeAnimation({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [typedText, setTypedText] = useState('');
  
  const fullTitle = "An Agentic Approach for Text-2-SQL problem";

  useEffect(() => {
    if (step === 3) {
      let i = 0;
      const typingInterval = setInterval(() => {
        if (i < fullTitle.length) {
          setTypedText(fullTitle.slice(0, i + 1));
          i++;
        } else {
          clearInterval(typingInterval);
          setTimeout(onComplete, 900);
        }
      }, 70);

      return () => clearInterval(typingInterval);
    }
  }, [step, onComplete, fullTitle]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (step < 3) {
        setStep(s => s + 1);
      }
    }, 950);

    return () => clearTimeout(timer);
  }, [step]);

  const messages = [
    "NEURAL INTERFACE ONLINE",
    "SYNCHRONIZING WITH QUANTUM CORE",
    "LOADING SOTA TEXT-TO-SQL MODEL",
    "INITIALIZING AGENTIC FRAMEWORK"
  ];

  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0f172a] via-[#060b14] to-[#03050a]">
      
      {/* Custom Embedded Styles for Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scroll-grid {
          0% { background-position: 0px 0px; }
          100% { background-position: 40px 40px; }
        }
        @keyframes float-orb-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(50px, 50px) scale(1.2); }
        }
        @keyframes float-orb-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-50px, -30px) scale(1.1); }
        }
        @keyframes sweep-scanline {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes slide-stripes {
          0% { transform: translateX(0); }
          100% { transform: translateX(-32px); }
        }
        @keyframes glitch-text {
          0%, 90%, 100% { transform: translate(0); text-shadow: none; }
          92% { transform: translate(-2px, 1px); text-shadow: 2px 0 #f472b6, -2px 0 #22d3ee; }
          94% { transform: translate(2px, -1px); text-shadow: -2px 0 #f472b6, 2px 0 #22d3ee; }
          96% { transform: translate(-1px, -2px); text-shadow: 2px 0 #f472b6, -2px 0 #22d3ee; }
          98% { transform: translate(1px, 2px); text-shadow: -2px 0 #f472b6, 2px 0 #22d3ee; }
        }
        
        .animate-scroll-grid { animation: scroll-grid 3s linear infinite; }
        .animate-orb-1 { animation: float-orb-1 12s ease-in-out infinite; }
        .animate-orb-2 { animation: float-orb-2 10s ease-in-out infinite; }
        .animate-scanline { animation: sweep-scanline 4s ease-in-out infinite; }
        .animate-stripes { animation: slide-stripes 1s linear infinite; }
        .animate-glitch { animation: glitch-text 4s infinite alternate; }
      `}} />

      {/* --- ANIMATED BACKGROUND LAYERS --- */}
      
      {/* Deep Space/Neon Glowing Orbs */}
      <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[120px] animate-orb-1 mix-blend-screen pointer-events-none"></div>
      <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-fuchsia-600/15 rounded-full blur-[120px] animate-orb-2 mix-blend-screen pointer-events-none"></div>
      <div className="absolute top-[30%] left-[40%] w-[30%] h-[30%] bg-blue-600/10 rounded-full blur-[100px] animate-pulse pointer-events-none"></div>

      {/* Performant Canvas Particles Layer */}
      <CanvasParticles />

      {/* Moving Cyberpunk Grid */}
      <div 
        className="absolute inset-0 opacity-20 animate-scroll-grid pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(34, 211, 238, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(34, 211, 238, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
        }}
      ></div>

      {/* Sweeping Vertical Scanline */}
      <div className="absolute inset-0 w-full h-[15vh] bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent animate-scanline pointer-events-none mix-blend-overlay"></div>
      
      {/* Fine Static Noise Overlay for Texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>

      {/* --- FOREGROUND CONTENT --- */}
      <div className="text-center relative z-10 w-full max-w-4xl px-6">
        
        {/* Enlarged Logo Container with Pulse Ring */}
        <div className="flex flex-col items-center gap-8 mb-16 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 border border-cyan-500/30 rounded-full animate-ping opacity-50"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-cyan-400/20 blur-3xl rounded-full"></div>
          
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="h-48 w-auto opacity-95 drop-shadow-[0_0_25px_rgba(34,211,238,0.6)] transition-all duration-1000 hover:scale-105"
          />
          <img 
            src="/logo-text.png" 
            alt="Logo Text" 
            className="h-24 w-auto opacity-95 drop-shadow-[0_0_20px_rgba(244,114,182,0.5)] transition-all duration-1000"
          />
        </div>

        {/* Status Message Text */}
        <div className="text-xl md:text-2xl font-light tracking-[0.2em] text-cyan-300 mb-8 h-10 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)] animate-glitch">
          {messages[step]}
        </div>

        {/* Typewriter Animation */}
        <div className="h-[2.5rem] mb-12">
          {step === 3 && (
            <div className="text-lg md:text-xl font-light tracking-wide text-white/90 font-mono drop-shadow-md">
              {typedText}
              <span className="animate-pulse text-cyan-400 ml-1">▋</span>
            </div>
          )}
        </div>

        {/* HUD Progress Bar */}
        <div className="max-w-md mx-auto flex flex-col gap-2">
          <div className="flex justify-between items-end px-1 font-mono text-xs text-cyan-400/80 uppercase tracking-widest">
            <span>System Load</span>
            <span className="text-cyan-300 font-bold">{((step + 1) / 4) * 100}%</span>
          </div>

          <div className="relative w-full h-3 bg-black/40 border border-cyan-900/60 rounded-sm overflow-hidden shadow-[0_0_15px_rgba(34,211,238,0.15)] backdrop-blur-sm p-[1px]">
            <div 
              className="absolute inset-0 opacity-20 w-[200%] animate-stripes"
              style={{
                backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 8px, #22d3ee 8px, #22d3ee 16px)'
              }}
            />
            <div 
              className="relative h-full bg-gradient-to-r from-cyan-900 via-cyan-500 to-cyan-300 transition-all duration-700 ease-out"
              style={{ width: `${((step + 1) / 4) * 100}%` }}
            >
              <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-white blur-[1px] shadow-[0_0_10px_#fff]"></div>
            </div>
          </div>
          
          <div className="flex justify-between items-center px-1 mt-1 opacity-50">
            <div className="w-4 h-[1px] bg-cyan-500"></div>
            <div className="w-full mx-2 h-[1px] bg-cyan-900/40 border-t border-dashed border-cyan-800/30"></div>
            <div className="w-4 h-[1px] bg-cyan-500"></div>
          </div>
        </div>

      </div>
    </div>
  );
}

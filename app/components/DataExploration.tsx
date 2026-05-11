'use client';

import { Database, Snowflake, Cloud, Settings2, Info, Lock, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BenchmarkExploration() {
  const router = useRouter();

  const [environments] = useState([
    { 
      id: "spider2-lite",
      name: "Spider 2.0 Lite", 
      type: "Hybrid Environment",
      description: "A diverse, multi-dialect benchmark encompassing cloud public data, enterprise warehouses, and local databases.",
      dialects: ["BigQuery", "Snowflake", "SQLite"], 
      icon: Cloud,
      color: "from-fuchsia-500 to-cyan-500",
      glow: "rgba(217,70,239,0.4)",
      status: "Ready",
      isAvailable: true
    },
    { 
      id: "bird",
      name: "BIRD Benchmark", 
      type: "Local Environment",
      description: "Large-scale, complex cross-domain datasets designed to bridge the gap between academic research and real-world database queries.",
      dialects: ["SQLite"], 
      icon: Database,
      color: "from-cyan-400 to-blue-600",
      glow: "rgba(34,211,238,0.4)",
      status: "Ready",
      isAvailable: true
    },
    { 
      id: "spider2-snow",
      name: "Spider 2.0 Snow", 
      type: "Cloud Data Warehouse",
      description: "Enterprise-grade Text-to-SQL environment executing complex queries directly against a live Snowflake warehouse.",
      dialects: ["Snowflake SQL"], 
      icon: Snowflake,
      color: "from-slate-700 to-slate-900",
      glow: "rgba(239,68,68,0)",
      status: "Coming Soon",
      isAvailable: false
    }
  ]);

  return (
    <div className="relative h-full w-full p-4 md:p-8 overflow-y-auto overflow-x-hidden bg-[#060b14] text-white pb-24">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-0 w-[50%] h-[50%] rounded-full bg-cyan-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[50%] h-[50%] rounded-full bg-fuchsia-900/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto mt-2 md:mt-4">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-10 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 text-[10px] font-mono tracking-widest rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.15)]">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              EXPLORE DATASETS
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.2)]">
              Environment Selection
            </h1>
            <p className="text-white/50 mt-2 text-sm max-w-xl">
              Choose a benchmark environment to begin your Text-to-SQL evaluation and explore schema structures.
            </p>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid gap-4">
          {environments.map((env) => {
            const Icon = env.icon;
            return (
              <div
                key={env.id}
                onClick={() => {
                  if (env.isAvailable && env.id === 'spider2-lite') {
                    router.push('/?tab=data&explore=spider2-lite');
                  }
                  if (env.isAvailable && env.id === 'bird') {
                    router.push('/?tab=data&explore=bird');
                  }
                }}
                className={`relative group rounded-3xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between transition-all duration-500 overflow-hidden ${
                  env.isAvailable 
                    ? 'bg-[#0a101d]/60 backdrop-blur-xl border border-cyan-900/40 hover:border-cyan-400/60 cursor-pointer hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:-translate-y-1' 
                    : 'bg-[#0a101d]/20 border border-red-900/20 cursor-not-allowed'
                }`}
              >
                {/* Active Card Hover Gradient Background */}
                {env.isAvailable && (
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: `radial-gradient(circle at 80% 50%, ${env.glow}, transparent 50%)` }}
                  />
                )}

                {/* Locked overlay */}
                {!env.isAvailable && (
                  <div className="absolute inset-0 z-30 bg-red-950/40 backdrop-blur-[2px] flex flex-col items-center justify-center">
                    <div className="flex items-center gap-3 bg-[#060b14]/90 px-6 py-3 rounded-2xl border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.25)]">
                      <Lock className="w-5 h-5 text-red-500" />
                      <span className="text-red-500 font-bold tracking-widest uppercase text-sm">{env.status}</span>
                    </div>
                  </div>
                )}

                {/* Left Section: Icon & Main Info */}
                <div className="relative z-10 flex items-start md:items-center gap-5 flex-1">
                  <div className={`shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${env.color} flex items-center justify-center shadow-lg relative ${!env.isAvailable && 'opacity-30 grayscale'}`}>
                    <div className="absolute inset-[1px] bg-[#060b14] rounded-2xl z-0" />
                    <Icon className="w-6 h-6 relative z-10 text-white" />
                    {env.isAvailable && (
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl z-10 pointer-events-none" />
                    )}
                  </div>
                  
                  <div className={`flex-1 ${!env.isAvailable && 'opacity-30 blur-[1px]'}`}>
                    <div className="flex flex-wrap items-center gap-3 mb-1">
                      <h2 className="font-bold text-lg md:text-xl tracking-wide text-white">
                        {env.name}
                      </h2>
                      <span className="px-2 py-1 rounded-md text-[9px] font-bold tracking-wider uppercase border bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
                        {env.type}
                      </span>
                    </div>
                    
                    <p className="text-xs md:text-sm max-w-xl leading-relaxed mb-3 text-white/60 break-words">
                      {env.description}
                    </p>
                    
                    {/* Dialect Tags */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[9px] text-white/30 font-bold tracking-widest uppercase mr-1">Engines:</span>
                      {env.dialects.map(dialect => (
                        <span key={dialect} className="px-2 py-1 rounded-md text-[10px] font-mono bg-white/[0.03] text-white/70 border border-white/10">
                          {dialect}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Right Section: Status & Action — responsive min-width */}
                <div className="relative z-10 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t border-white/5 md:border-t-0 pt-4 md:pt-0 mt-4 md:mt-0 min-w-0 md:min-w-[140px]">
                  {env.isAvailable && (
                    <>
                      <div className="flex items-center gap-2 mb-0 md:mb-3">
                        <div className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">{env.status}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button className="p-2 rounded-xl bg-white/[0.02] border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-colors" title="View Schema">
                          <Info className="w-4 h-4" />
                        </button>
                        <button className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white px-4 py-2 rounded-xl transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)] font-semibold text-xs md:text-sm">
                          Launch
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
                
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

'use client';

import { Database, Cloud, Sparkles, Crosshair, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function SOTAComparison() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Automatically calculate the overall score based on available data
  const getOverall = (scores: { spider: number | null, bird: number | null } | null) => {
    if (!scores) return null;
    const { spider, bird } = scores;
    if (spider !== null && bird !== null) return (spider + bird) / 2;
    if (spider !== null) return spider;
    if (bird !== null) return bird;
    return null;
  };

  // Sorted: Our Model -> Replicated -> Undergoing
  const leaderboard = [
    { 
      id: "slayql",
      rank: 1,
      model: "SlayQL", 
      type: "Our Model",
      status: "development",
      proposed: { spider: 75, bird: 90.0 },
      replicated: null, 
    },
    { 
      id: "autolink",
      rank: 2, 
      model: "AutoLink", 
      type: "Paper Baseline",
      status: "replicated",
      proposed: { spider: 52.28, bird: 68.7 },
      replicated: { spider: 45.33, bird: null }, 
    },
    { 
      id: "mcts",
      rank: 3, 
      model: "MCTS-SQL", 
      type: "Paper Baseline",
      status: "undergoing",
      proposed: { spider: null, bird: 72.91 },
      replicated: null,
    },
    { 
      id: "retrysql",
      rank: 4, 
      model: "RetrySQL", 
      type: "Paper Baseline",
      status: "undergoing",
      proposed: { spider: null, bird: 58.70 },
      replicated: null,
    },
    { 
      id: "reforce",
      rank: 5, 
      model: "ReFoRCE", 
      type: "Paper Baseline",
      status: "undergoing",
      proposed: { spider: 55.21, bird: null },
      replicated: null,
    },
  ];

  // Helper to render the comparison bars
  const MetricBar = ({ 
    color, 
    proposedScore, 
    replicatedScore, 
    status 
  }: { 
    color: 'cyan' | 'fuchsia', 
    proposedScore: number | null, 
    replicatedScore: number | null, 
    status: string 
  }) => {
    // If the paper didn't evaluate this dataset, show a fallback
    if (proposedScore === null && replicatedScore === null) {
      return (
        <div className="w-full flex items-center justify-center h-10 rounded-lg border border-white/5 bg-white/[0.02] border-dashed">
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Not Evaluated</span>
        </div>
      );
    }

    const isDev = status === 'development';
    const isUnverified = status === 'undergoing' || (status === 'replicated' && replicatedScore === null);
    
    const showAsGhost = isDev || isUnverified;
    const activeScore = replicatedScore ?? proposedScore ?? 0;
    
    const fillColor = color === 'cyan' 
      ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]' 
      : 'bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.5)]';
      
    const ghostColor = color === 'cyan' ? 'bg-cyan-900/40' : 'bg-fuchsia-900/40';
    const ghostStripes = 'bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.05)_4px,rgba(255,255,255,0.05)_8px)]';

    return (
      <div className="w-full flex flex-col gap-1.5">
        <div className="flex justify-between items-end">
          <div className="flex items-center gap-2">
            <span className={`font-mono text-sm font-bold ${showAsGhost ? 'text-white/40' : (color === 'cyan' ? 'text-cyan-400' : 'text-fuchsia-400')}`}>
              {activeScore.toFixed(1)}%
            </span>
            {isUnverified && proposedScore !== null && <span className="text-[9px] font-mono uppercase tracking-widest text-amber-500/70">(Not Replicated)</span>}
            {isDev && <span className="text-[9px] font-mono uppercase tracking-widest text-cyan-500/70">(Projected)</span>}
          </div>
          {proposedScore !== null && (
            <span className="text-[10px] font-mono text-white/40 tracking-widest">
              PROP: <span className="text-white/70">{proposedScore.toFixed(1)}%</span>
            </span>
          )}
        </div>
        
        <div className="relative w-full h-2.5 bg-[#060b14] rounded-full overflow-hidden border border-white/5 shadow-inner">
          <div 
            className={`absolute top-0 bottom-0 left-0 rounded-full transition-all duration-1000 ease-out ${showAsGhost ? ghostColor : fillColor}`}
            style={{ width: mounted ? `${activeScore}%` : '0%' }}
          >
            {showAsGhost && <div className={`absolute inset-0 ${ghostStripes}`} />}
          </div>

          {proposedScore !== null && (
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] z-10 transition-all duration-1000 ease-out"
              style={{ left: mounted ? `calc(${proposedScore}% - 1px)` : '0%' }}
              title={`Paper Proposed: ${proposedScore}%`}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative h-full w-full p-4 md:p-8 overflow-y-auto overflow-x-hidden bg-[#060b14] text-white pb-24 custom-scrollbar">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-1/4 w-[50%] h-[30%] rounded-full bg-cyan-900/20 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-[40%] h-[40%] rounded-full bg-fuchsia-900/10 blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto">
        
        {/* --- Header & Legend --- */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end mb-10 gap-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 text-[10px] font-mono tracking-widest rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
              <Crosshair className="w-3 h-3 animate-[spin_3s_linear_infinite]" />
              REPLICATION TRACKER
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-100 to-cyan-500 drop-shadow-[0_0_20px_rgba(34,211,238,0.2)]">
              Model Evaluation
            </h1>
            <p className="text-white/50 mt-3 text-sm max-w-2xl leading-relaxed">
              Tracking our replication efforts of SOTA papers against our proprietary model. Execution Accuracy (EX) is validated strictly across <span className="text-cyan-400 font-semibold">Spider 2.0-Lite</span> and <span className="text-fuchsia-400 font-semibold">BIRD</span> datasets.
            </p>
          </div>

          {/* Graph Legend */}
          <div className="flex flex-col gap-3 p-4 rounded-2xl bg-[#0a101d]/80 border border-white/5 backdrop-blur-md shrink-0">
            <span className="text-[9px] font-bold tracking-[0.2em] text-white/30 uppercase">Chart Legend</span>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                <span className="text-xs font-mono text-white/60 tracking-wider">SPIDER EX</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.5)]" />
                <span className="text-xs font-mono text-white/60 tracking-wider">BIRD EX</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-0.5 h-3.5 bg-white shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
                <span className="text-xs font-mono text-white/60 tracking-wider">PAPER PROPOSED</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- Leaderboard Grid Header (Desktop only) --- */}
        <div className="hidden lg:grid grid-cols-12 gap-8 px-8 py-4 mb-2 text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase border-b border-white/5">
          <div className="col-span-4">Architecture</div>
          <div className="col-span-3">Spider 2.0-Lite (EX)</div>
          <div className="col-span-3">BIRD Benchmark (EX)</div>
          <div className="col-span-2 text-right">Overall Avg</div>
        </div>

        {/* --- Leaderboard Cards --- */}
        <div className="space-y-4">
          {leaderboard.map((item) => {
            const isDev = item.status === 'development';
            const isReplicated = item.status === 'replicated';
            const isUndergoing = item.status === 'undergoing';
            
            // It is partial if the proposed paper had a score, but our replication failed to evaluate it yet
            const isPartial = isReplicated && (
              (item.proposed.spider !== null && item.replicated?.spider === null) || 
              (item.proposed.bird !== null && item.replicated?.bird === null)
            );
            
            const proposedOverall = getOverall(item.proposed);
            const replicatedOverall = item.replicated ? getOverall(item.replicated) : null;
            const activeOverall = isUndergoing ? proposedOverall : (replicatedOverall !== null ? replicatedOverall : proposedOverall);
            
            return (
              <div 
                key={item.id} 
                className={`relative group grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center p-6 rounded-3xl transition-all duration-500 overflow-hidden backdrop-blur-xl ${
                  isDev 
                    ? 'bg-gradient-to-r from-cyan-950/40 via-[#0a101d]/90 to-fuchsia-950/40 border border-cyan-500/40 shadow-[0_0_30px_rgba(34,211,238,0.1)]' 
                    : isReplicated 
                      ? 'bg-[#0a101d]/80 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]'
                      : 'bg-[#0a101d]/40 border border-white/5 opacity-80 hover:opacity-100 grayscale hover:grayscale-0'
                }`}
              >
                {/* 1. Model Info (Col 1-4) */}
                <div className="col-span-1 lg:col-span-4 flex flex-col justify-center relative z-10">
                  <div className="flex items-center gap-4 mb-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold border ${
                      isDev ? 'bg-cyan-500/20 text-cyan-400 border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.4)]' 
                      : isReplicated ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-white/5 text-white/40 border-white/10'
                    }`}>
                      #{item.rank}
                    </div>
                    <div>
                      <h3 className={`font-bold text-lg tracking-wide flex items-center gap-2 ${isUndergoing ? 'text-white/60' : 'text-white'}`}>
                        {item.model}
                      </h3>
                      <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">
                        {item.type}
                      </span>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="ml-14 flex items-center">
                    {isDev && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse">
                        <Sparkles className="w-2.5 h-2.5" /> Est. Projection
                      </span>
                    )}
                    {isReplicated && !isPartial && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Replicated
                      </span>
                    )}
                    {isPartial && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <AlertCircle className="w-2.5 h-2.5" /> Partial Replication
                      </span>
                    )}
                    {isUndergoing && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase bg-amber-500/10 text-amber-500/70 border border-amber-500/20">
                        <Clock className="w-2.5 h-2.5" /> Undergoing
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Spider 2.0-Lite Metric (Col 5-7) */}
                <div className="col-span-1 lg:col-span-3 relative z-10 w-full">
                  <div className="lg:hidden mb-2">
                    <span className="text-[10px] font-bold text-white/40 tracking-wider uppercase flex items-center gap-1.5"><Cloud className="w-3 h-3"/> Spider 2.0-Lite</span>
                  </div>
                  <MetricBar 
                    color="cyan" 
                    proposedScore={item.proposed.spider} 
                    replicatedScore={item.replicated?.spider ?? null} 
                    status={item.status} 
                  />
                </div>

                {/* 3. BIRD Metric (Col 8-10) */}
                <div className="col-span-1 lg:col-span-3 relative z-10 w-full">
                  <div className="lg:hidden mb-2">
                    <span className="text-[10px] font-bold text-white/40 tracking-wider uppercase flex items-center gap-1.5"><Database className="w-3 h-3"/> BIRD EX</span>
                  </div>
                  <MetricBar 
                    color="fuchsia" 
                    proposedScore={item.proposed.bird} 
                    replicatedScore={item.replicated?.bird ?? null} 
                    status={item.status} 
                  />
                </div>

                {/* 4. Overall (Col 11-12) */}
                <div className="col-span-1 lg:col-span-2 relative z-10 flex flex-col lg:items-end justify-center border-t border-white/5 lg:border-t-0 pt-4 lg:pt-0 mt-2 lg:mt-0">
                  <span className="text-[10px] font-bold text-white/40 tracking-wider uppercase lg:hidden mb-2">Overall Score</span>
                  
                  {activeOverall !== null ? (
                    <span className={`text-2xl lg:text-3xl font-black tracking-tight ${
                      isDev ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]' 
                      : isReplicated ? 'text-emerald-400' 
                      : 'text-white/40'
                    }`}>
                      {activeOverall.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-white/40 font-mono text-xl">N/A</span>
                  )}
                  
                  {isReplicated && proposedOverall !== null && (
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest mt-1">
                      Proposed: {proposedOverall.toFixed(1)}%
                    </span>
                  )}
                  {isDev && (
                    <span className="text-[10px] font-mono text-cyan-400/80 uppercase tracking-widest mt-1">
                      Projected Leader
                    </span>
                  )}
                </div>

              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent rounded-full" />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">
            Validation conducted internally • Replicated scores may vary slightly from proposed paper claims due to hardware & strictness constraints
          </span>
        </div>
      </div>
      
      {/* Scrollbar styling */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34, 211, 238, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34, 211, 238, 0.4); }
      `}} />
    </div>
  );
}

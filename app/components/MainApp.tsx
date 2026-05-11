'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import PromptArea from './PromptArea';
import DataExploration from './DataExploration';
import SOTAComparison from './SOTAComparison';
import DataUpload from './DataUpload';
import BirdPage from '../bird/page';
import Spider2LitePage from '../spider2lite/page';

type Tab = 'prompt' | 'data' | 'sota' | 'upload';

const datasets = [
  { id: 'Spider2.0-Lite', name: 'Spider2.0-Lite' },
  { id: 'Spider2.0-Snow', name: 'Spider2.0-Snow' },
  { id: 'BIRD', name: 'BIRD' },
];

const frameworks = ['AutoLink', 'ReFoRCE'] as const;

const availableModels = [
  { id: 'deepseek', name: 'DeepSeek V4 Flash' },
  { id: 'gemini', name: 'Gemini 3.1 Flash' },
  { id: 'claude', name: 'Claude 4 Opus' },
  { id: 'retrysql', name: 'RetrySQL' },
  { id: 'openai', name: 'GPT-4.1-mini' },
];

export default function MainApp() {
  const [activeTab, setActiveTab] = useState<Tab>('prompt');
  const [selectedFramework, setSelectedFramework] = useState('AutoLink');
  const [selectedModel, setSelectedModel] = useState('deepseek');
  const [selectedDataset, setSelectedDataset] = useState('Spider2.0-Lite');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false); // NEW: mobile sidebar toggle

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const exploreParam = searchParams.get('explore');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'data') {
      setActiveTab('data');
    } else if (tabParam === 'sota') {
      setActiveTab('sota');
    } else if (tabParam === 'upload') {
      setActiveTab('upload');
    } else {
      setActiveTab('prompt');
    }
    // close mobile sidebar on route change
    setSidebarMobileOpen(false);
  }, [searchParams]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'prompt') {
      params.delete('tab');
      params.delete('explore');
    } else {
      params.set('tab', tab);
      if (tab !== 'data') params.delete('explore');
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    // close mobile sidebar after selection
    setSidebarMobileOpen(false);
  };

  const handleBackToEnvironments = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'data');
    params.delete('explore');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div
      className="flex h-screen overflow-hidden bg-[#060b14] relative"
      style={{ ['--sidebar-w' as string]: sidebarCollapsed ? '72px' : '240px' } as React.CSSProperties}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/10 via-violet-900/10 to-fuchsia-900/10 animate-gradient-shift pointer-events-none" />

      {/* DESKTOP SIDEBAR (hidden on mobile) */}
      <div className="hidden md:flex">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* MOBILE SIDEBAR OVERLAY */}
      {sidebarMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarMobileOpen(false)}
          />
          {/* sidebar panel */}
          <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[80vw]">
            <Sidebar
              activeTab={activeTab}
              setActiveTab={handleTabChange}
              collapsed={false}
              onToggle={() => setSidebarMobileOpen(false)} // close on toggle
            />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col relative z-10 min-w-0">
        {/* HEADER */}
        <div className="h-16 sm:h-16 border-b border-white/5 bg-[#060b14]/70 backdrop-blur-2xl flex items-center px-4 sm:px-6 justify-between z-30 shadow-lg">
          {/* Left: Hamburger + Logo */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {/* Hamburger button for mobile */}
            <button
              className="md:hidden p-2 text-cyan-400 hover:text-cyan-300 focus:outline-none"
              onClick={() => setSidebarMobileOpen(true)}
              aria-label="Open sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center gap-2 shrink-0">
              <img src="/logo.png" alt="Logo" className="h-7 sm:h-8 w-auto drop-shadow-[0_0_12px_rgba(34,211,238,0.5)]" />
              <img src="/logo-text.png" alt="SlayyyQL" className="h-4 sm:h-5 w-auto drop-shadow-[0_0_10px_rgba(244,114,182,0.4)] hidden sm:block" />
            </div>
            <div className="px-2 py-0.5 sm:px-3 sm:py-1 text-[9px] sm:text-[10px] font-mono tracking-widest rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.15)] whitespace-nowrap">
              v1.0.0
            </div>
          </div>

          {/* Right: Dataset selector (only on prompt tab) – shown on desktop only, moved to row below on mobile */}
          {activeTab === 'prompt' && (
            <div className="hidden sm:flex items-center gap-4 sm:gap-6">
              <div className="relative group">
                <select
                  value={selectedDataset}
                  onChange={(e) => setSelectedDataset(e.target.value)}
                  className="appearance-none bg-[#0a101d]/80 border border-cyan-900/50 rounded-full pl-3 sm:pl-4 pr-8 sm:pr-10 py-1 sm:py-1.5 text-xs sm:text-sm font-mono text-cyan-100 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all shadow-[0_0_15px_rgba(34,211,238,0.05)] cursor-pointer hover:border-cyan-500"
                >
                  {datasets.map(ds => (
                    <option key={ds.id} value={ds.id} className="bg-[#0f172a] text-cyan-100">
                      {ds.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 pointer-events-none text-cyan-500">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Empty spacer to keep layout balanced if no selection shown on mobile */}
          <div className="sm:hidden" />
        </div>

        {/* MOBILE DATASET SELECTOR ROW (visible only when prompt tab is active on mobile) */}
        {activeTab === 'prompt' && (
          <div className="sm:hidden px-4 py-2 border-b border-white/5 bg-[#060b14]/50">
            <div className="relative group w-full">
              <select
                value={selectedDataset}
                onChange={(e) => setSelectedDataset(e.target.value)}
                className="appearance-none w-full bg-[#0a101d]/80 border border-cyan-900/50 rounded-full pl-4 pr-10 py-1.5 text-sm font-mono text-cyan-100 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all shadow-[0_0_15px_rgba(34,211,238,0.05)] cursor-pointer hover:border-cyan-500"
              >
                {datasets.map(ds => (
                  <option key={ds.id} value={ds.id} className="bg-[#0f172a] text-cyan-100">
                    {ds.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-cyan-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-auto relative">
          {activeTab === 'data' && exploreParam && (
            <div className="px-4 sm:px-6 py-2 border-b border-white/5 bg-[#060b14]/55 backdrop-blur-md">
              <button
                onClick={handleBackToEnvironments}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-mono hover:bg-cyan-500/20 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Back to environments
              </button>
            </div>
          )}

          {activeTab === 'prompt' && (
            <PromptArea
              selectedFramework={selectedFramework}
              selectedModel={selectedModel}
              selectedDataset={selectedDataset}
              frameworks={frameworks}
              models={availableModels}
              datasets={datasets}
              onFrameworkChange={setSelectedFramework}
              onModelChange={setSelectedModel}
              onDatasetChange={setSelectedDataset}
              username="Kian Lok"
              useMockup={true}
            />
          )}
          {activeTab === 'data' && (
            exploreParam === 'bird' ? (
              <BirdPage embedded />
            ) : exploreParam === 'spider2-lite' ? (
              <Spider2LitePage embedded />
            ) : (
              <DataExploration />
            )
          )}
          {activeTab === 'sota' && <SOTAComparison />}
          {activeTab === 'upload' && <DataUpload />}
        </div>
      </div>
    </div>
  );
}

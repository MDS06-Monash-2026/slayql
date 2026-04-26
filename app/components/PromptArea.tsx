'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, ArrowRight, ChevronDown, Zap, User } from 'lucide-react';
import LLMResponseCard from './LLMResponseCard';
import ThinkingAnimation from './ThinkingAnimation';

interface DatasetOption {
  id: string;
  name: string;
}

interface PromptAreaProps {
  selectedFramework: string;
  selectedModel: string;
  selectedDataset: string;
  frameworks: readonly string[];
  models: { id: string; name: string }[];
  datasets?: DatasetOption[];            // optional
  onFrameworkChange: (fw: string) => void;
  onModelChange: (model: string) => void;
  onDatasetChange?: (ds: string) => void; // new callback
  username?: string;
  useMockup?: boolean;
}

interface ChatMessage {
  id: number;
  prompt: string;
  sql: string | null;
  thinkingDone?: boolean;
}

export default function PromptArea({
  selectedFramework,
  selectedModel,
  selectedDataset,
  frameworks,
  models,
  datasets = [],
  onFrameworkChange,
  onModelChange,
  onDatasetChange,
  username = 'Kian Lok',
  useMockup = true,
}: PromptAreaProps) {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFrameworkPicker, setShowFrameworkPicker] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showDatasetPicker, setShowDatasetPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const frameworkRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const datasetRef = useRef<HTMLDivElement>(null);

  const userInitial = username.charAt(0).toUpperCase();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (frameworkRef.current && !frameworkRef.current.contains(e.target as Node))
        setShowFrameworkPicker(false);
      if (modelRef.current && !modelRef.current.contains(e.target as Node))
        setShowModelPicker(false);
      if (datasetRef.current && !datasetRef.current.contains(e.target as Node))
        setShowDatasetPicker(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGenerate = () => {
    if (!prompt.trim() || isGenerating) return;
    const newMessageId = Date.now();
    setMessages((prev) => [...prev, { id: newMessageId, prompt, sql: null, thinkingDone: false }]);
    setPrompt('');
    setIsGenerating(true);

    if (!useMockup) {
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === newMessageId ? { ...msg, sql: 'SELECT * FROM orders LIMIT 10;', thinkingDone: true } : msg
          )
        );
        setIsGenerating(false);
      }, 1800);
    }
  };

  const handleThinkingComplete = (msgId: number) => {
    const mockSQL = `SELECT c.category_name, SUM(oi.quantity * oi.unit_price) AS total_revenue
FROM categories c
JOIN products p ON c.category_id = p.category_id
JOIN order_items oi ON p.product_id = oi.product_id
JOIN orders o ON oi.order_id = o.order_id
WHERE o.order_date BETWEEN '2025-02-01' AND '2025-02-28'
GROUP BY c.category_name
ORDER BY total_revenue DESC;`;

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === msgId
          ? { ...msg, sql: mockSQL, thinkingDone: true }
          : msg
      )
    );
    setIsGenerating(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Conversation */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 custom-scrollbar">
        <div className="w-full max-w-4xl mx-auto flex flex-col min-h-full py-6">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-90 animate-in fade-in duration-1000 my-auto pb-16">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400/20 via-violet-500/20 to-fuchsia-500/20 blur-2xl absolute inset-0 animate-pulse-slow" />
                <Sparkles className="w-12 h-12 text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 to-fuchsia-400 relative z-10" />
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 mb-4 tracking-tight">
                Query your data naturally
              </h2>
              <p className="text-white/40 text-base">
                Using dataset{' '}
                <span className="text-cyan-400 font-mono text-xs bg-white/5 px-2 py-0.5 rounded-md">
                  {selectedDataset}
                </span>
                {useMockup && (
                  <span className="ml-2 text-xs text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-md">
                    Demo Mode
                  </span>
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-10 pb-6 mt-auto">
              {messages.map((msg) => (
                <div key={msg.id} className="flex flex-col gap-5">
                  {/* User message */}
                  <div className="flex items-start gap-4 ml-auto max-w-[85%] animate-in slide-in-from-bottom-2 fade-in duration-500">
                    <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-[2rem] rounded-tr-md px-5 py-3 text-white/90 leading-relaxed shadow-lg text-sm">
                      {msg.prompt}
                    </div>
                    <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-inner">
                      <span className="font-bold text-sm text-white">{userInitial}</span>
                    </div>
                  </div>

                  {/* LLM response */}
                  <div className="flex items-start gap-4 max-w-[95%]">
                    <div className="w-9 h-9 shrink-0 rounded-full bg-[#0a101d]/80 border border-white/10 flex items-center justify-center shadow-[0_0_12px_rgba(34,211,238,0.25)]">
                      <img
                        src="/logo.png"
                        alt="SlayyyQL"
                        className="w-6 h-6 object-contain drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]"
                      />
                    </div>
                    <div className="flex-1 mt-0.5">
                      {useMockup && msg.sql === null && !msg.thinkingDone ? (
                        <ThinkingAnimation onComplete={() => handleThinkingComplete(msg.id)} speed={700} />
                      ) : msg.sql === null ? (
                        <div className="flex items-center gap-2 text-cyan-400 text-sm font-medium px-2 py-1 animate-pulse">
                          <Zap className="w-4 h-4" />
                          Generating...
                        </div>
                      ) : (
                        <LLMResponseCard
                          data={{
                            reasoning: `1. Parse request\n2. Generate SQL using ${selectedFramework} with model ${selectedModel}\n3. Optimize query`,
                            sql: msg.sql,
                            columns: [
                              { name: 'category_name', type: 'VARCHAR' },
                              { name: 'total_revenue', type: 'DECIMAL' },
                            ],
                            rows: [
                              { category_name: 'Electronics', total_revenue: 45890.50 },
                              { category_name: 'Clothing', total_revenue: 32105.75 },
                              { category_name: 'Home & Garden', total_revenue: 19870.20 },
                              { category_name: 'Books', total_revenue: 12450.90 },
                              { category_name: 'Sports', total_revenue: 11230.45 },
                            ],
                          }}
                          index={msg.id}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="w-full max-w-4xl mx-auto p-4 md:p-6 shrink-0 relative z-10 pt-0">
        <div className="absolute -top-8 left-0 right-0 h-8 bg-gradient-to-t from-[#060b14] to-transparent pointer-events-none" />

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-fuchsia-500/20 rounded-[2rem] blur-xl opacity-40 group-focus-within:opacity-75 transition duration-1000"></div>

          <div className="relative bg-[#0a101d]/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl flex flex-col transition-all duration-300 group-focus-within:border-white/20 group-focus-within:bg-[#0a101d]/90">
            {/* Framework + Model + Dataset selectors */}
            <div className="px-4 pt-2 pb-1 flex items-center gap-2 border-b border-white/5">
              {/* Dataset */}
              <div className="relative" ref={datasetRef}>
                <button
                  onClick={() => setShowDatasetPicker(!showDatasetPicker)}
                  className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
                  </svg>
                  {selectedDataset}
                  <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                </button>
                {showDatasetPicker && (
                  <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#0a101d]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-xl z-50 max-h-72 overflow-y-auto custom-scrollbar">
                    {datasets.length === 0 ? (
                      <div className="px-4 py-2 text-xs text-white/40">No datasets</div>
                    ) : (
                      datasets.map((ds) => (
                        <button
                          key={ds.id}
                          onClick={() => {
                            if (onDatasetChange) onDatasetChange(ds.id);
                            setShowDatasetPicker(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 rounded-xl text-xs transition-all ${
                            selectedDataset === ds.id ? 'bg-emerald-500/10 text-emerald-400' : 'text-white/70 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          {ds.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Framework */}
              <div className="relative" ref={frameworkRef}>
                <button
                  onClick={() => setShowFrameworkPicker(!showFrameworkPicker)}
                  className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
                >
                  <Zap className="w-3 h-3" />
                  {selectedFramework}
                  <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                </button>
                {showFrameworkPicker && (
                  <div className="absolute bottom-full left-0 mb-2 w-48 bg-[#0a101d]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-xl z-50 max-h-72 overflow-y-auto custom-scrollbar">
                    {frameworks.map((fw) => (
                      <button
                        key={fw}
                        onClick={() => { onFrameworkChange(fw); setShowFrameworkPicker(false); }}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-xs transition-all ${
                          selectedFramework === fw ? 'bg-cyan-500/10 text-cyan-400' : 'text-white/70 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {fw}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Model */}
              <div className="relative" ref={modelRef}>
                <button
                  onClick={() => setShowModelPicker(!showModelPicker)}
                  className="flex items-center gap-1.5 text-[11px] font-mono text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20 hover:bg-violet-500/20 transition-all"
                >
                  {models.find(m => m.id === selectedModel)?.name ?? 'Model'}
                  <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                </button>
                {showModelPicker && (
                  <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#0a101d]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-xl z-50 max-h-72 overflow-y-auto custom-scrollbar">
                    {models.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { onModelChange(m.id); setShowModelPicker(false); }}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-xs transition-all ${
                          selectedModel === m.id ? 'bg-violet-500/10 text-violet-400' : 'text-white/70 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Textarea */}
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your query in natural language..."
              className="w-full bg-transparent border-none p-4 pb-1 text-base text-white/90 placeholder:text-white/30 resize-none max-h-[160px] min-h-[48px] focus:outline-none focus:ring-0 font-sans custom-scrollbar"
              rows={1}
            />

            <div className="flex justify-end items-center p-3 pt-1">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className={`p-2.5 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isGenerating || !prompt.trim()
                    ? 'bg-white/5 text-white/20 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500 text-white shadow-[0_0_16px_rgba(139,92,246,0.4)] hover:scale-105 hover:shadow-[0_0_24px_rgba(139,92,246,0.6)]'
                }`}
              >
                {isGenerating ? (
                  <Sparkles className="w-4 h-4 animate-spin-slow" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-3">
          <p className="text-[10px] text-white/30">
            SlayQL can make mistakes. Verify important queries before executing on production.
          </p>
        </div>
      </div>
    </div>
  );
}

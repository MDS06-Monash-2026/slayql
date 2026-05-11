'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, ArrowRight, ChevronDown, Zap, Search, Database, Table2, Loader2, Key, Type as TypeIcon, History } from 'lucide-react';
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
  datasets?: DatasetOption[];
  onFrameworkChange: (fw: string) => void;
  onModelChange: (model: string) => void;
  onDatasetChange?: (ds: string) => void;
  username?: string;
  useMockup?: boolean;
}

interface ChatMessage {
  id: number;
  prompt: string;
  sql: string | null;
  thinkingDone?: boolean;
}

interface RecentQueryItem {
  id: string;
  text: string;
  timestamp: number;
  sql?: string;
}

interface SchemaTable {
  name: string;
  columns: string[];
  totalRows?: number;
  sampleRows?: unknown[][];
}

interface SchemaDatabase {
  id: string;
  name: string;
  engine?: string;
  tables: SchemaTable[];
}

interface BirdTable {
  name: string;
  columns?: string[];
  totalRows?: number;
  sampleRows?: unknown[][];
}

interface BirdDatabase {
  name: string;
  tables?: BirdTable[];
}

interface SpiderTable {
  name: string;
  columns?: string[];
  totalRows?: number;
}

interface SpiderDatabase {
  engine?: string;
  name: string;
  tables?: SpiderTable[];
}

function normalizeBird(raw: BirdDatabase[]): SchemaDatabase[] {
  return raw
    .map((db) => ({
      id: `bird:${db.name}`,
      name: db.name,
      engine: 'sqlite',
      tables: (db.tables ?? []).map((t) => ({
        name: t.name,
        columns: t.columns ?? [],
        totalRows: t.totalRows,
        sampleRows: t.sampleRows ?? [],
      })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeSpider(raw: SpiderDatabase[], selectedDataset: string): SchemaDatabase[] {
  const normalizedDataset = selectedDataset.toLowerCase();
  const filtered = raw.filter((db) => {
    if (normalizedDataset.includes('snow')) return db.engine === 'snowflake';
    return true;
  });

  return filtered
    .map((db) => ({
      id: `spider:${db.engine ?? 'unknown'}:${db.name}`,
      name: db.name,
      engine: db.engine ?? 'unknown',
      tables: (db.tables ?? []).map((t) => ({
        name: t.name,
        columns: t.columns ?? [],
        totalRows: t.totalRows,
        sampleRows: [],
      })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function inferTypeFromSamples(rows: unknown[][] | undefined, colIdx: number): string {
  if (!rows || rows.length === 0) return 'UNKNOWN';
  const values = rows.map((r) => r?.[colIdx]).filter((v) => v !== null && v !== undefined);
  if (values.length === 0) return 'UNKNOWN';

  const isAllBool = values.every((v) => typeof v === 'boolean');
  if (isAllBool) return 'BOOLEAN';

  const isAllNumber = values.every((v) => typeof v === 'number');
  if (isAllNumber) return values.some((v) => !Number.isInteger(v as number)) ? 'REAL' : 'INTEGER';

  const asString = values.map((v) => String(v));
  const isDateLike = asString.every((s) => /^\d{4}-\d{2}-\d{2}/.test(s));
  if (isDateLike) return 'DATE';

  return 'TEXT';
}

function isLikelyPrimaryKey(tableName: string, columnName: string, colIdx: number): boolean {
  const c = columnName.toLowerCase();
  const t = tableName.toLowerCase();
  if (c === 'id' || c === `${t}_id`) return true;
  if (c.endsWith('_id') && colIdx === 0) return true;
  return false;
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
  const RECENT_QUERIES_KEY = 'slayql.recentQueries';
  const RECENT_QUERY_LIMIT = 8;

  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [recentQueries, setRecentQueries] = useState<RecentQueryItem[]>([]);
  const [expandedRecentId, setExpandedRecentId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [showFrameworkPicker, setShowFrameworkPicker] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showDatasetPicker, setShowDatasetPicker] = useState(false);

  const [schemaDatabases, setSchemaDatabases] = useState<SchemaDatabase[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [schemaSearch, setSchemaSearch] = useState('');
  const [schemaCollapsed, setSchemaCollapsed] = useState(false);
  const [expandedSchemaDb, setExpandedSchemaDb] = useState<string | null>(null);
  const [selectedSchemaTableKey, setSelectedSchemaTableKey] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;
  const frameworkRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const datasetRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const userInitial = username.charAt(0).toUpperCase();

  const quickPrompts = [
    'Show total revenue by product category for February 2025.',
    'List the top 10 customers by total spend in the last 30 days.',
    'Find products with no sales in the past quarter and their inventory count.',
    'Compare daily order volume week-over-week for the last 8 weeks.',
  ] as const;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(RECENT_QUERIES_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const sanitized = parsed
        .filter((q): q is RecentQueryItem => {
          if (typeof q !== 'object' || q === null) return false;
          const item = q as Partial<RecentQueryItem>;
          return typeof item.id === 'string' && typeof item.text === 'string' && typeof item.timestamp === 'number' && item.text.trim().length > 0;
        })
        .slice(0, RECENT_QUERY_LIMIT);
      setRecentQueries(sanitized);
    } catch {
      // ignore malformed local storage value
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (frameworkRef.current && !frameworkRef.current.contains(e.target as Node)) setShowFrameworkPicker(false);
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setShowModelPicker(false);
      if (datasetRef.current && !datasetRef.current.contains(e.target as Node)) setShowDatasetPicker(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadSchema = async () => {
      setSchemaLoading(true);
      setSchemaError(null);
      setSchemaSearch('');
      setSelectedSchemaTableKey(null);
      try {
        let normalized: SchemaDatabase[] = [];
        if (selectedDataset.toLowerCase().includes('bird')) {
          const res = await fetch('/data/bird-exploration.json');
          if (!res.ok) throw new Error(`Failed to load BIRD schema (${res.status})`);
          const json = (await res.json()) as BirdDatabase[];
          normalized = normalizeBird(json);
        } else if (selectedDataset.toLowerCase().includes('spider')) {
          const res = await fetch('/data/spider2-lite-index.json');
          if (!res.ok) throw new Error(`Failed to load Spider schema (${res.status})`);
          const json = (await res.json()) as SpiderDatabase[];
          normalized = normalizeSpider(json, selectedDataset);
        }

        if (!cancelled) {
          setSchemaDatabases(normalized);
          setExpandedSchemaDb(normalized[0]?.id ?? null);
        }
      } catch (e) {
        if (!cancelled) {
          setSchemaDatabases([]);
          setExpandedSchemaDb(null);
          setSchemaError(e instanceof Error ? e.message : 'Failed to load schema');
        }
      } finally {
        if (!cancelled) setSchemaLoading(false);
      }
    };

    void loadSchema();
    return () => {
      cancelled = true;
    };
  }, [selectedDataset]);

  const filteredSchemaDatabases = useMemo(() => {
    const keyword = schemaSearch.trim().toLowerCase();
    if (!keyword) return schemaDatabases;

    const result: SchemaDatabase[] = [];
    for (const db of schemaDatabases) {
      const dbMatch = db.name.toLowerCase().includes(keyword) || (db.engine ?? '').toLowerCase().includes(keyword);
      if (dbMatch) {
        result.push(db);
        continue;
      }

      const matchingTables = db.tables.filter((t) => {
        if (t.name.toLowerCase().includes(keyword)) return true;
        return t.columns.some((c) => c.toLowerCase().includes(keyword));
      });

      if (matchingTables.length > 0) {
        result.push({ ...db, tables: matchingTables });
      }
    }
    return result;
  }, [schemaDatabases, schemaSearch]);

  const handleGenerate = () => {
    if (!prompt.trim() || isGenerating) return;
    const queryText = prompt.trim();
    const newMessageId = Date.now();
    setMessages((prev) => [...prev, { id: newMessageId, prompt: queryText, sql: null, thinkingDone: false }]);

    setRecentQueries((prev) => {
      const nextItem: RecentQueryItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: queryText,
        timestamp: Date.now(),
      };
      const next = [nextItem, ...prev.filter((q) => q.text !== queryText)].slice(0, RECENT_QUERY_LIMIT);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(RECENT_QUERIES_KEY, JSON.stringify(next));
      }
      return next;
    });

    setPrompt('');
    setIsGenerating(true);

    if (!useMockup) {
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === newMessageId ? { ...msg, sql: 'SELECT * FROM orders LIMIT 10;', thinkingDone: true } : msg))
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

    setMessages((prev) => prev.map((msg) => (msg.id === msgId ? { ...msg, sql: mockSQL, thinkingDone: true } : msg)));

    const matchingPrompt = messagesRef.current.find((m) => m.id === msgId)?.prompt ?? '';
    if (matchingPrompt) {
      setRecentQueries((prev) => {
        const next = prev.map((q) => (q.text === matchingPrompt ? { ...q, sql: mockSQL } : q));
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(RECENT_QUERIES_KEY, JSON.stringify(next));
        }
        return next;
      });
    }

    setIsGenerating(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const applyQuickPrompt = (text: string) => {
    setPrompt(text);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const clearRecentQueries = () => {
    setRecentQueries([]);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(RECENT_QUERIES_KEY);
    }
  };

  return (
    <div className="h-full min-h-0 flex gap-4 p-3 md:p-4">
      {/* <aside
        className={`${
          schemaCollapsed ? 'w-12' : 'w-[320px]'
        } shrink-0 transition-all duration-300 bg-[#0a101d]/80 border border-white/10 rounded-3xl backdrop-blur-2xl overflow-hidden flex flex-col`}
      >
        <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
          {!schemaCollapsed && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-mono text-cyan-400/70">Schema Explorer</p>
              <p className="text-[11px] text-white/50">{selectedDataset}</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setSchemaCollapsed((v) => !v)}
            className="w-7 h-7 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white/60 flex items-center justify-center"
            title={schemaCollapsed ? 'Expand schema panel' : 'Collapse schema panel'}
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${schemaCollapsed ? '-rotate-90' : 'rotate-90'}`} />
          </button>
        </div>

        {!schemaCollapsed && (
          <>
            <div className="p-3 border-b border-white/5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/70" />
                <input
                  value={schemaSearch}
                  onChange={(e) => setSchemaSearch(e.target.value)}
                  placeholder="Search databases / tables / columns"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#060b14]/80 border border-white/10 text-xs text-white/80 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {schemaLoading ? (
                <div className="h-36 flex items-center justify-center gap-2 text-cyan-400/80 text-xs font-mono">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading schema...
                </div>
              ) : schemaError ? (
                <div className="p-3 text-xs text-rose-400/90 bg-rose-500/10 border border-rose-500/20 rounded-xl">{schemaError}</div>
              ) : filteredSchemaDatabases.length === 0 ? (
                <div className="h-36 flex flex-col items-center justify-center gap-2 text-white/40">
                  <Database className="w-4 h-4" />
                  <p className="text-xs font-mono">No schema matched your search.</p>
                </div>
              ) : (
                filteredSchemaDatabases.map((db) => {
                  const expanded = expandedSchemaDb === db.id;
                  return (
                    <div key={db.id} className="rounded-xl border border-white/5 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedSchemaDb(expanded ? null : db.id)}
                        className="w-full px-3 py-2 flex items-center justify-between text-left bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-xs text-white/85 font-mono truncate">{db.name}</p>
                          <p className="text-[10px] text-white/35 uppercase tracking-wider">
                            {(db.engine ?? 'unknown').toUpperCase()} • {db.tables.length} tables
                          </p>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 text-white/50 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      </button>

                      {expanded && (
                        <div className="bg-black/20 p-1.5 space-y-1">
                          {db.tables.map((table) => {
                            const key = `${db.id}:${table.name}`;
                            const isSelected = selectedSchemaTableKey === key;
                            return (
                              <div key={key} className={`rounded-lg border ${isSelected ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-white/[0.01] border-white/5'}`}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedSchemaTableKey(key)}
                                  className="w-full px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04] rounded-lg"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex items-center gap-2">
                                      <Table2 className="w-3 h-3 text-cyan-400/70 shrink-0" />
                                      <span className="text-[11px] text-white/80 font-mono truncate">{table.name}</span>
                                    </div>
                                    {typeof table.totalRows === 'number' && (
                                      <span className="text-[10px] text-white/35 font-mono">{table.totalRows.toLocaleString()}</span>
                                    )}
                                  </div>
                                  <p className="mt-1 text-[10px] text-white/30 truncate">{table.columns.slice(0, 5).join(', ')}</p>
                                </button>

                                {isSelected && (
                                  <div className="px-2 pb-2 space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                                    {table.columns.map((col, idx) => {
                                      const colType = inferTypeFromSamples(table.sampleRows, idx);
                                      const isPk = isLikelyPrimaryKey(table.name, col, idx);
                                      return (
                                        <div key={col} className="flex items-center justify-between gap-2 px-2 py-1 rounded-md bg-black/20 border border-white/5">
                                          <div className="min-w-0 flex items-center gap-1.5">
                                            {isPk ? (
                                              <span title="Primary Key">
                                                <Key className="w-3 h-3 text-amber-300 shrink-0" />
                                              </span>
                                            ) : (
                                              <span title="Field type">
                                                <TypeIcon className="w-3 h-3 text-cyan-300/70 shrink-0" />
                                              </span>
                                            )}
                                            <span className="text-[10px] text-white/80 font-mono truncate">{col}</span>
                                          </div>
                                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 font-mono shrink-0">
                                            {colType}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          

            <div className="border-t border-white/5 bg-white/[0.01] h-1/2 min-h-[180px] flex flex-col overflow-hidden p-2">
              <div className="px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/45">
                  <History className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Recent Queries</span>
                </div>
                {recentQueries.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="text-[10px] font-mono text-white/35 hover:text-white/65 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
                {recentQueries.length === 0 ? (
                  <div className="p-3 mt-2 text-center">
                    <p className="text-[10px] text-white/35 italic">No history yet</p>
                  </div>
                ) : (
                  recentQueries.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-white/5 bg-black/20 hover:border-white/10 transition-all overflow-hidden"
                    >
                      <div className="px-2.5 pt-2.5 pb-1 flex items-start gap-2">
                        <p className="flex-1 text-[11px] text-white/80 font-medium line-clamp-2 leading-snug min-w-0">{item.text}</p>
                        <div className="flex items-center gap-1 shrink-0 mt-0.5">
                          {item.sql && (
                            <button
                              type="button"
                              onClick={() => setExpandedRecentId(expandedRecentId === item.id ? null : item.id)}
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                                expandedRecentId === item.id
                                  ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                                  : 'border-white/10 bg-white/[0.03] text-white/40 hover:text-white/60 hover:border-white/20'
                              }`}
                            >
                              SQL
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => applyQuickPrompt(item.text)}
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-cyan-500/20 bg-cyan-500/5 text-cyan-300/60 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                            title="Fill prompt with this query"
                          >
                            Reuse
                          </button>
                        </div>
                      </div>
                      <div className="px-2.5 pb-2">
                        <span className="text-[9px] text-white/30 font-mono">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {expandedRecentId === item.id && item.sql && (
                        <div className="mx-2 mb-2 rounded-md bg-black/50 border border-cyan-500/10 p-2 overflow-x-auto">
                          <pre className="text-[10px] text-cyan-300/70 font-mono whitespace-pre-wrap leading-relaxed">{item.sql}</pre>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </aside> */}

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
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
                  <span className="text-cyan-400 font-mono text-xs bg-white/5 px-2 py-0.5 rounded-md">{selectedDataset}</span>
                  {useMockup && (
                    <span className="ml-2 text-xs text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-md">Demo Mode</span>
                  )}
                </p>

                <div className="mt-6 w-full max-w-2xl">
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/35 mb-2">Quick prompts</div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {quickPrompts.map((qp) => (
                      <button
                        key={qp}
                        type="button"
                        onClick={() => applyQuickPrompt(qp)}
                        className="px-3 py-1.5 rounded-full text-xs text-white/70 bg-white/[0.04] border border-white/10 hover:bg-white/[0.06] hover:border-white/20 transition-all"
                      >
                        {qp}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-10 pb-6 mt-auto">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex flex-col gap-5">
                    <div className="flex items-start gap-4 ml-auto max-w-[85%] animate-in slide-in-from-bottom-2 fade-in duration-500">
                      <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-[2rem] rounded-tr-md px-5 py-3 text-white/90 leading-relaxed shadow-lg text-sm">
                        {msg.prompt}
                      </div>
                      <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-inner">
                        <span className="font-bold text-sm text-white">{userInitial}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 max-w-[95%]">
                      <div className="w-9 h-9 shrink-0 rounded-full bg-[#0a101d]/80 border border-white/10 flex items-center justify-center shadow-[0_0_12px_rgba(34,211,238,0.25)]">
                        <img src="/logo.png" alt="SlayyyQL" className="w-6 h-6 object-contain drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]" />
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
                              reasoning: [
                                'Analyzed the natural-language request and parsed the user intent.',
                                'Identified the relevant tables from the schema: products and order_items.',
                                'Checked relationships and resolved the join on product_id (foreign key).',
                                'Determined the required aggregation: SUM(quantity × price) as total_revenue.',
                                'Applied grouping on the category column to roll up sales per category.',
                                `Optimized the query plan using ${selectedFramework} with model ${selectedModel}.`,
                                'Generated and validated the final SQL statement.',
                              ].map((s, i) => `${i + 1}. ${s}`).join('\n'),
                              summary:
                                "The query joins the 'products' table with 'order_items' using the product ID to associate each sale with its category. It then calculates the total sales for each category by summing the product of quantity and price for each line item and grouping the results by the 'category' column.",
                              sql: msg.sql,
                              columns: [
                                { name: 'category_name', type: 'VARCHAR' },
                                { name: 'total_revenue', type: 'DECIMAL' },
                              ],
                              rows: [
                                { category_name: 'Electronics', total_revenue: 45890.5 },
                                { category_name: 'Clothing', total_revenue: 32105.75 },
                                { category_name: 'Home & Garden', total_revenue: 19870.2 },
                                { category_name: 'Books', total_revenue: 12450.9 },
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

        <div className="w-full max-w-4xl mx-auto p-4 md:p-6 shrink-0 relative z-10 pt-0">
          <div className="absolute -top-8 left-0 right-0 h-8 bg-gradient-to-t from-[#060b14] to-transparent pointer-events-none" />

          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 via-violet-500/20 to-fuchsia-500/20 rounded-[2rem] blur-xl opacity-40 group-focus-within:opacity-75 transition duration-1000" />

            <div className="relative bg-[#0a101d]/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl flex flex-col transition-all duration-300 group-focus-within:border-white/20 group-focus-within:bg-[#0a101d]/90">
              <div className="px-4 pt-2 pb-1 flex items-center gap-2 border-b border-white/5">
                <div className="relative" ref={datasetRef}>
                  <button
                    onClick={() => setShowDatasetPicker(!showDatasetPicker)}
                    className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                      />
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
                          onClick={() => {
                            onFrameworkChange(fw);
                            setShowFrameworkPicker(false);
                          }}
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

                <div className="relative" ref={modelRef}>
                  <button
                    onClick={() => setShowModelPicker(!showModelPicker)}
                    className="flex items-center gap-1.5 text-[11px] font-mono text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20 hover:bg-violet-500/20 transition-all"
                  >
                    {models.find((m) => m.id === selectedModel)?.name ?? 'Model'}
                    <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                  </button>
                  {showModelPicker && (
                    <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#0a101d]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-xl z-50 max-h-72 overflow-y-auto custom-scrollbar">
                      {models.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            onModelChange(m.id);
                            setShowModelPicker(false);
                          }}
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

              <textarea
                ref={textareaRef}
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
                  {isGenerating ? <Sparkles className="w-4 h-4 animate-spin-slow" /> : <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="text-center mt-3">
            <p className="text-[10px] text-white/30">SlayQL can make mistakes. Verify important queries before executing on production.</p>
          </div>
        </div>
      </div>

      {showClearConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            className="w-full max-w-sm bg-[#0a101d] border border-white/10 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Clear query history?</h3>
                <p className="text-xs text-white/40 mt-0.5">This will permanently remove all {recentQueries.length} saved {recentQueries.length === 1 ? 'query' : 'queries'}.</p>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-mono border border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  clearRecentQueries();
                  setShowClearConfirm(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-mono border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 transition-all"
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

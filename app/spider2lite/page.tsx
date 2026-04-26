'use client';

import { useState, useEffect } from 'react';
import {
  Database, Snowflake, Cloud, ChevronLeft, Loader2,
  Table2, ChevronDown, ChevronRight,
  Columns3, Rows3, Search, LayoutGrid, AlertCircle
} from 'lucide-react';
import Link from 'next/link';

type Engine = 'sqlite' | 'bigquery' | 'snowflake';

interface SampleData {
  columns: string[];
  rows: any[][];
  totalRows: number;
}

interface TableMeta {
  name: string;
  columns: string[];
  totalRows: number;
  samplePath: string; // relative path to sample JSON file
}

interface IndexDatabase {
  engine: string;
  name: string;
  tables: TableMeta[];
}

const engineConfig: { id: Engine; label: string; icon: any }[] = [
  { id: 'sqlite', label: 'SQLite', icon: Database },
  { id: 'bigquery', label: 'BigQuery', icon: Cloud },
  { id: 'snowflake', label: 'Snowflake', icon: Snowflake },
];

function truncate(value: any, maxLen = 40): string {
  if (value === null || value === undefined) return 'NULL';
  const str = String(value);
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '…';
}

function DataCell({ value }: { value: any }) {
  if (value === null || value === undefined) {
    return <span className="italic text-violet-500/60 font-mono text-xs">NULL</span>;
  }
  const str = String(value);
  const isNumber = typeof value === 'number' || (!isNaN(Number(value)) && value !== '' && typeof value !== 'boolean');
  const isDate = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value);
  const isBoolean = typeof value === 'boolean';
  let color = 'text-cyan-100';
  if (isNumber) color = 'text-fuchsia-400';
  else if (isDate) color = 'text-amber-300';
  else if (isBoolean) color = 'text-cyan-400';
  return (
    <span className={`font-mono text-xs leading-relaxed ${color} max-w-[250px] truncate block`} title={str}>
      {truncate(value)}
    </span>
  );
}

export default function Spider2LitePage() {
  const [selectedEngine, setSelectedEngine] = useState<Engine>('sqlite');
  const [index, setIndex] = useState<IndexDatabase[]>([]);
  const [expandedDb, setExpandedDb] = useState<string | null>(null);
  const [previewTable, setPreviewTable] = useState<{ dbName: string; tableName: string; data: SampleData } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingIndex, setLoadingIndex] = useState(true);
  const [loadingSample, setLoadingSample] = useState(false);
  const [error, setError] = useState('');

  // Load index once
  useEffect(() => {
    fetch('/data/spider2-lite-index.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setIndex(data);
        setLoadingIndex(false);
      })
      .catch(err => {
        setError(`Failed to load index: ${err.message}`);
        setLoadingIndex(false);
      });
  }, []);

  // Filter by engine + search
  const filteredDbs = index
    .filter(d => d.engine === selectedEngine)
    .filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const expandedDbEntry = index.find(d => d.engine === selectedEngine && d.name === expandedDb);
  const tablesList = expandedDbEntry?.tables || [];

  // Lazy load sample data when a table is clicked
  const handlePreviewTable = async (dbName: string, table: TableMeta) => {
    // Show loading
    setPreviewTable({ dbName, tableName: table.name, data: { columns: table.columns, rows: [], totalRows: table.totalRows } });
    setLoadingSample(true);

    try {
      const res = await fetch(`/data/${table.samplePath}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const sampleRows = await res.json();
      setPreviewTable({
        dbName,
        tableName: table.name,
        data: {
          columns: table.columns,
          rows: sampleRows,
          totalRows: table.totalRows
        }
      });
    } catch (err: any) {
      setError(`Failed to load sample data: ${err.message}`);
    } finally {
      setLoadingSample(false);
    }
  };

  // Show error banner if any
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#060b14] relative font-sans text-slate-300">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/10 via-violet-900/10 to-fuchsia-900/10 pointer-events-none" />

      {/* Header */}
      <div className="h-16 border-b border-white/5 bg-[#060b14]/70 backdrop-blur-2xl flex items-center px-6 justify-between z-50 shadow-lg relative">
        <div className="flex items-center gap-4">
          <Link href="/?tab=data" className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-900/20 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all text-cyan-400">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight text-cyan-50">Spider 2.0 Lite</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-widest bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.15)] uppercase">Explorer</span>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-2 p-2 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-lg text-xs text-fuchsia-300 flex items-center gap-2 z-20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4 z-10 relative">
        {/* LEFT PANE */}
        <div className="w-80 flex flex-col bg-[#0a101d]/80 border border-cyan-900/30 rounded-2xl backdrop-blur-xl overflow-hidden">
          {/* Engine tabs */}
          <div className="flex p-2 gap-1 border-b border-white/5 bg-black/20 shrink-0">
            {engineConfig.map(eng => (
              <button
                key={eng.id}
                onClick={() => setSelectedEngine(eng.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-mono transition-all ${
                  selectedEngine === eng.id
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.15)]'
                    : 'text-slate-500 hover:text-cyan-100 hover:bg-white/5 border border-transparent'
                }`}
              >
                <eng.icon className="w-3.5 h-3.5" />
                {eng.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="p-3 border-b border-white/5 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-600" />
              <input
                type="text"
                placeholder="Search databases…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-full bg-[#0f172a] border border-cyan-900/50 text-xs text-cyan-100 placeholder-cyan-800/70 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all"
              />
            </div>
          </div>

          {/* Database list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loadingIndex ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
                <span className="text-xs text-cyan-500/50 font-mono">Loading index...</span>
              </div>
            ) : filteredDbs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 opacity-50">
                <Database className="w-6 h-6 text-slate-500" />
                <span className="text-xs text-slate-500">No databases found.</span>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredDbs.map(db => {
                  const isExpanded = expandedDb === db.name;
                  return (
                    <div key={db.name} className="rounded-lg overflow-hidden border border-transparent hover:border-white/5 transition-colors">
                      <button
                        onClick={() => setExpandedDb(isExpanded ? null : db.name)}
                        className={`w-full flex items-center justify-between p-2.5 text-left transition-colors ${isExpanded ? 'bg-cyan-500/5' : 'hover:bg-white/[0.02]'}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Database className={`w-3.5 h-3.5 shrink-0 ${isExpanded ? 'text-cyan-400' : 'text-slate-500'}`} />
                          <span className={`font-mono text-xs truncate ${isExpanded ? 'text-cyan-100' : 'text-slate-300'}`}>{db.name}</span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-600 transition-transform ${isExpanded ? 'rotate-180 text-cyan-500' : ''}`} />
                      </button>

                      {isExpanded && (
                        <div className="bg-black/20 pb-2">
                          {tablesList.length === 0 ? (
                            <div className="px-8 py-2 text-[10px] text-slate-500">No tables</div>
                          ) : (
                            tablesList.map(table => {
                              const isActive = previewTable?.dbName === db.name && previewTable?.tableName === table.name;
                              return (
                                <button
                                    key={`${db.name}-${table.name}`}
                                  onClick={() => handlePreviewTable(db.name, table)}
                                  className={`w-full flex items-center justify-between py-1.5 pl-8 pr-3 text-left transition-all ${
                                    isActive
                                      ? 'bg-cyan-500/10 border-l-2 border-cyan-400 text-cyan-300'
                                      : 'border-l-2 border-transparent hover:bg-white/[0.02] text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Table2 className="w-3 h-3 shrink-0 opacity-50" />
                                    <span className="font-mono text-[11px] truncate">{table.name}</span>
                                  </div>
                                  <span className="text-[10px] font-mono text-slate-600">{table.totalRows.toLocaleString()}</span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-2 border-t border-white/5 bg-black/20 text-[10px] font-mono text-cyan-500/50 text-center shrink-0">
            {filteredDbs.length} DATABASES LOADED
          </div>
        </div>

        {/* RIGHT PANE */}
        <div className="flex-1 flex flex-col bg-[#0a101d]/80 border border-cyan-900/30 rounded-2xl backdrop-blur-xl overflow-hidden relative">
          {!previewTable ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-40">
              <LayoutGrid className="w-12 h-12 text-cyan-500 mb-4" />
              <p className="text-sm font-mono text-cyan-100">Select a table to view sample data</p>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#0f172a]/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <Table2 className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-mono text-cyan-100 flex items-center gap-2">
                      <span className="text-slate-500">{previewTable.dbName}</span>
                      <ChevronRight className="w-3 h-3 text-cyan-500/50" />
                      <span className="text-cyan-300">{previewTable.tableName}</span>
                    </h2>
                    <div className="flex items-center gap-4 mt-1 text-[11px] font-mono text-cyan-500/60">
                      <span className="flex items-center gap-1"><Rows3 className="w-3 h-3" /> {previewTable.data.totalRows.toLocaleString()} rows total</span>
                      <span className="flex items-center gap-1"><Columns3 className="w-3 h-3" /> {previewTable.data.columns.length} columns</span>
                      {loadingSample && <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading samples...</span>}
                      {!loadingSample && previewTable.data.rows.length > 0 && (
                        <span className="flex items-center gap-1">Showing top {previewTable.data.rows.length} rows</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Table data */}
              <div className="flex-1 overflow-auto custom-scrollbar bg-[#060b14]/50">
                {loadingSample ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
                  </div>
                ) : previewTable.data.rows.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-xs text-slate-500 font-mono">No sample data available.</div>
                ) : (
                  <table className="w-full border-collapse text-left">
                    <thead className="sticky top-0 bg-[#0f172a] shadow-md z-10">
                      <tr>
                        <th className="px-4 py-2 border-b border-cyan-900/50 text-[10px] font-mono uppercase tracking-wider text-cyan-500/50 whitespace-nowrap bg-[#0f172a]">#</th>
                        {previewTable.data.columns.map((col, i) => (
                          <th key={i} className="px-4 py-2 border-b border-cyan-900/50 text-[11px] font-mono text-cyan-400 whitespace-nowrap bg-[#0f172a]">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewTable.data.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-white/[0.02] border-b border-white/[0.02] transition-colors">
                          <td className="px-4 py-2 text-[10px] font-mono text-slate-600 whitespace-nowrap">{rIdx + 1}</td>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="px-4 py-2 whitespace-nowrap">
                              <DataCell value={cell} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34, 211, 238, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34, 211, 238, 0.4); }
      `}</style>
    </div>
  );
}

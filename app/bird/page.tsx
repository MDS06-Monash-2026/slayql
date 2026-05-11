'use client';

import { useState, useEffect } from 'react';
import {
  Database, ChevronLeft, Loader2,
  Table2, ChevronDown, ChevronRight,
  Columns3, Rows3, Search, LayoutGrid, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import SchemaPreviewSample from '@/app/components/SchemaPreviewSample';

interface SampleData {
  columns: string[];
  rows: (any)[][];
  totalRows: number;
}

interface TableInfo {
  name: string;
  columns: string[];
  sampleRows: any[][];
  totalRows: number;
}

interface DatabaseFile {
  name: string;
  tables: TableInfo[];
}

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

export default function BirdPage({ embedded = false }: { embedded?: boolean }) {
  const [databases, setDatabases] = useState<DatabaseFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [previewTable, setPreviewTable] = useState<{ fileName: string; tableName: string; data: SampleData } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/data/bird-exploration.json')
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load data (${res.status})`);
        return res.json();
      })
      .then(data => {
        setDatabases(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const filteredFiles = databases.filter(db =>
    db.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`flex flex-col overflow-hidden bg-[#060b14] relative font-sans text-slate-300 ${embedded ? 'h-full' : 'h-screen'}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/10 via-violet-900/10 to-fuchsia-900/10 animate-gradient-shift pointer-events-none" />

      {/* Header */}
      <div className={`h-16 border-b border-white/5 bg-[#060b14]/70 backdrop-blur-2xl flex items-center px-6 justify-between z-50 shadow-lg relative ${embedded ? 'hidden' : ''}`}>
        <div className="flex items-center gap-4">
          <Link
            href="/?tab=data"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-900/20 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all text-cyan-400"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight text-cyan-50">BIRD Benchmark</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-widest bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.15)] uppercase">Local SQLite</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 z-10 relative">
        {/* Two-pane layout — 50% height (equal split with schema sample below) */}
        <div className="flex-1 min-h-0 flex overflow-hidden p-4 gap-4">
        {/* LEFT PANE: File explorer */}
        <div className="w-80 flex flex-col bg-[#0a101d]/80 border border-cyan-900/30 rounded-2xl shadow-[0_0_20px_rgba(34,211,238,0.03)] backdrop-blur-xl overflow-hidden">
          
          {/* Search filter */}
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

          {/* Database file list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-40 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
                <span className="text-xs text-cyan-500/50 font-mono">Loading...</span>
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <AlertCircle className="w-6 h-6 text-fuchsia-400 mx-auto mb-2" />
                <p className="text-xs text-fuchsia-400">{error}</p>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 opacity-50">
                <Database className="w-6 h-6 text-slate-500" />
                <span className="text-xs text-slate-500">No databases found.</span>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredFiles.map(db => {
                  const isExpanded = expandedFile === db.name;
                  return (
                    <div key={db.name} className="rounded-lg overflow-hidden border border-transparent hover:border-white/5 transition-colors">
                      <button
                        onClick={() => setExpandedFile(isExpanded ? null : db.name)}
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
                          {db.tables.length === 0 ? (
                            <div className="px-8 py-2 text-[10px] text-slate-500">No tables</div>
                          ) : (
                            db.tables.map(table => {
                              const isActive = previewTable?.fileName === db.name && previewTable?.tableName === table.name;
                              const sampleData: SampleData = {
                                columns: table.columns,
                                rows: table.sampleRows,
                                totalRows: table.totalRows
                              };
                              return (
                                <button
                                  key={table.name}
                                  onClick={() => setPreviewTable({ fileName: db.name, tableName: table.name, data: sampleData })}
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

          {/* Footer */}
          <div className="p-2 border-t border-white/5 bg-black/20 text-[10px] font-mono text-cyan-500/50 text-center shrink-0">
            {filteredFiles.length} DATABASES LOADED
          </div>
        </div>

        {/* RIGHT PANE: Data Viewer */}
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
                      <span className="text-slate-500">{previewTable.fileName}</span>
                      <ChevronRight className="w-3 h-3 text-cyan-500/50" />
                      <span className="text-cyan-300">{previewTable.tableName}</span>
                    </h2>
                    <div className="flex items-center gap-4 mt-1 text-[11px] font-mono text-cyan-500/60">
                      <span className="flex items-center gap-1"><Rows3 className="w-3 h-3" /> {previewTable.data.totalRows.toLocaleString()} rows total</span>
                      <span className="flex items-center gap-1"><Columns3 className="w-3 h-3" /> {previewTable.data.columns.length} columns</span>
                      <span className="flex items-center gap-1">Showing top {previewTable.data.rows.length} rows</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table data */}
              <div className="flex-1 overflow-auto custom-scrollbar bg-[#060b14]/50">
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
                    {previewTable.data.rows.length === 0 ? (
                      <tr>
                        <td colSpan={previewTable.data.columns.length + 1} className="py-8 text-center text-xs text-slate-500 font-mono">Table is empty.</td>
                      </tr>
                    ) : (
                      previewTable.data.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-white/[0.02] border-b border-white/[0.02] transition-colors">
                          <td className="px-4 py-2 text-[10px] font-mono text-slate-600 whitespace-nowrap">{rIdx + 1}</td>
                          {row.map((cell: any, cIdx: number) => (
                            <td key={cIdx} className="px-4 py-2 whitespace-nowrap"><DataCell value={cell} /></td>
                          ))} 
                        </tr>  
                      )) 
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        </div>

        {/* Schema sample — 50% height; scroll inside if needed */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden border-t border-white/5 px-4 pb-4 pt-2">
          <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
            <SchemaPreviewSample />
          </div>
        </div>
      </div>

      {/* Scrollbar styles (same as before) */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34, 211, 238, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34, 211, 238, 0.4); }
      `}</style>
    </div>
  );
}

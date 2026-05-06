'use client';

import { useState, useMemo, useCallback } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Copy, Play, Check, Loader2, Download } from 'lucide-react';

interface Column {
  name: string;
  type: string;
}

interface Row {
  [key: string]: string | number | null;
}

interface LLMResponseData {
  reasoning?: string;
  summary?: string;
  sql: string;
  columns?: Column[];
  rows?: Row[];
}

interface LLMResponseCardProps {
  data: LLMResponseData;
  index?: number;
}

function toCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  // RFC4180-ish: wrap if contains comma, quote, or newline
  if (/[",\r\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function rowsToCsv(columns: Column[], rows: Row[]): string {
  const header = columns.map((c) => toCsvCell(c.name)).join(',');
  const lines = rows.map((r) => columns.map((c) => toCsvCell(r[c.name])).join(','));
  return [header, ...lines].join('\r\n') + '\r\n';
}

// ─── QuickChart URL generator ──────────────────────────────
function buildChartUrl(
  chartType: 'bar' | 'line',
  columns: Column[],
  rows: Row[]
): string {
  const labelCol = columns[0]?.name;
  const valueCol =
    columns.find(
      (c) =>
        c.type.toLowerCase().includes('dec') ||
        c.type.toLowerCase().includes('int') ||
        c.type.toLowerCase().includes('float')
    )?.name ?? columns[1]?.name;

  if (!labelCol || !valueCol || rows.length === 0) return '';

  const labels = rows.map((r) => r[labelCol]?.toString() ?? '');
  const values = rows.map((r) => Number(r[valueCol]) || 0);

  const chartConfig = {
    type: chartType,
    data: {
      labels,
      datasets: [
        {
          label: valueCol,
          data: values,
          backgroundColor:
            chartType === 'bar'
              ? 'rgba(34, 211, 238, 0.6)'
              : 'rgba(139, 92, 246, 0.2)',
          borderColor: chartType === 'bar' ? '#22d3ee' : '#a78bfa',
          borderWidth: 2,
          fill: chartType === 'line',
          tension: 0.3,
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: '#94a3b8', font: { size: 10 } },
          grid: { color: 'rgba(255,255,255,0.03)' },
        },
        y: {
          ticks: { color: '#94a3b8', font: { size: 10 } },
          grid: { color: 'rgba(255,255,255,0.03)' },
        },
      },
      backgroundColor: '#0a101d',
    },
  };

  const encoded = encodeURIComponent(JSON.stringify(chartConfig));
  return `https://quickchart.io/chart?c=${encoded}&width=600&height=350&bkg=transparent&v=4`;
}

// ─── Component ─────────────────────────────────────────────
export default function LLMResponseCard({ data, index = 0 }: LLMResponseCardProps) {
  const [showReasoning, setShowReasoning] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'bar' | 'line'>('table');
  const [chartLoading, setChartLoading] = useState(false);

  // Compute chart URL only when needed
  const chartUrl = useMemo(() => {
    if (!data.columns || !data.rows || data.rows.length === 0) return '';
    return buildChartUrl(viewMode === 'line' ? 'line' : 'bar', data.columns, data.rows);
  }, [viewMode, data.columns, data.rows]);

  const handleCopySql = useCallback(async () => {
    await navigator.clipboard.writeText(data.sql);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2000);
  }, [data.sql]);

  const handleViewChange = (mode: 'table' | 'bar' | 'line') => {
    setViewMode(mode);
    if (mode !== 'table') setChartLoading(true);
  };

  const handleExportCsv = useCallback(() => {
    if (!data.columns || !data.rows || data.rows.length === 0) return;
    const csv = rowsToCsv(data.columns, data.rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `slayql-results-${index || 0}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [data.columns, data.rows, index]);

  const handleChartLoad = () => setChartLoading(false);
  const handleChartError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setChartLoading(false);
    (e.target as HTMLImageElement).style.display = 'none';
  };

  return (
    <div
      className="bg-[#0a101d]/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] rounded-tl-md p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700"
      style={{ animationDelay: `${index * 150}ms` }}
    >
      {/* Reasoning */}
      {data.reasoning && (
        <div className="mb-4">
          <button
            onClick={() => setShowReasoning(!showReasoning)}
            className="flex items-center gap-2 text-xs font-mono text-amber-400/80 hover:text-amber-300 transition-colors duration-200"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Reasoning steps</span>
            {showReasoning ? (
              <ChevronUp className="w-3 h-3 opacity-60" />
            ) : (
              <ChevronDown className="w-3 h-3 opacity-60" />
            )}
          </button>
          <div
            className={`overflow-hidden transition-all duration-500 ease-in-out ${
              showReasoning ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="mt-2 p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-xs leading-relaxed text-white/70 font-mono whitespace-pre-wrap">
              {data.reasoning}
            </div>
          </div>
        </div>
      )}

      {/* Query summary */}
      {data.summary && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-300/80">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-cyan-500/10 border border-cyan-500/20">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <span>Query summary</span>
          </div>
          <div className="mt-2 p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-xs leading-relaxed text-white/70">
            {data.summary}
          </div>
        </div>
      )}

      {/* SQL Code */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent rounded-2xl pointer-events-none" />
        <pre className="relative bg-[#03050a]/80 p-4 rounded-2xl overflow-x-auto font-mono text-[12px] leading-loose text-cyan-50/90 border border-white/[0.05]">
          <code>{data.sql}</code>
        </pre>
        <button
          onClick={handleCopySql}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200"
          title="Copy SQL"
        >
          {sqlCopied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-white/60 hover:text-white" />
          )}
        </button>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex gap-3 flex-wrap items-center">
        <button
          onClick={handleCopySql}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all duration-300 flex items-center gap-2 text-xs font-medium text-white/70 hover:text-white"
        >
          <Copy className="w-3.5 h-3.5" /> Copy
        </button>
        <button
          onClick={handleExportCsv}
          disabled={!data.rows || !data.columns || data.rows.length === 0}
          className={`px-4 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 text-xs font-medium border ${
            !data.rows || !data.columns || data.rows.length === 0
              ? 'bg-white/5 text-white/20 border-white/10 cursor-not-allowed'
              : 'bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border-violet-500/25'
          }`}
          title="Export results to CSV"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
        <button
          onClick={() => setShowResults(!showResults)}
          disabled={!data.rows}
          className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-xl transition-all duration-300 flex items-center gap-2 text-xs font-medium text-cyan-400"
        >
          <Play className="w-3.5 h-3.5" /> {showResults ? 'Hide Results' : 'Execute'}
        </button>
        {data.rows && showResults && (
          <div className="flex gap-1 ml-auto">
            {(['table', 'bar', 'line'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => handleViewChange(mode)}
                className={`px-3 py-1 rounded-lg text-[10px] font-mono transition-all uppercase tracking-wider ${
                  viewMode === mode
                    ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Execution Results / Chart */}
      {data.rows && showResults && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {viewMode === 'table' ? (
            <div className="overflow-x-auto rounded-2xl border border-white/5">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="bg-white/[0.03]">
                    {data.columns?.map((col) => (
                      <th
                        key={col.name}
                        className="px-3 py-2 text-left text-cyan-400/80 font-medium border-b border-white/5"
                      >
                        {col.name}
                        <span className="text-[9px] ml-1 text-white/30">({col.type})</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, i) => (
                    <tr
                      key={i}
                      className="border-t border-white/[0.02] hover:bg-white/[0.02] transition-colors"
                    >
                      {data.columns?.map((col) => (
                        <td key={col.name} className="px-3 py-1.5 text-white/70">
                          {row[col.name] ?? <span className="text-white/20">NULL</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : chartUrl ? (
            <div className="relative flex justify-center p-2 rounded-2xl bg-white/[0.02] border border-white/5 min-h-[200px]">
              {/* Loading skeleton */}
              {chartLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0a101d]/80 rounded-2xl">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
              )}
              <img
                src={chartUrl}
                alt={`${viewMode} chart`}
                className={`w-full max-w-[600px] h-auto rounded-xl transition-opacity duration-300 ${
                  chartLoading ? 'opacity-0' : 'opacity-100'
                }`}
                loading="lazy"
                onLoad={handleChartLoad}
                onError={handleChartError}
              />
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/40 text-xs">
              No numeric data available for chart.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

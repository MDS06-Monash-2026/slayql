'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  UploadCloud,
  Database,
  Cloud,
  Plug,
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  Table2,
  ChevronDown,
  ChevronRight,
  Key,
  Type as TypeIcon,
  RefreshCw,
  Sparkles,
  HardDrive,
  ExternalLink,
  ShieldCheck,
  GitBranch,
} from 'lucide-react';
import { SchemaGraphModal, type GraphRelationship, type GraphTable } from './SchemaGraph';

// -----------------------------------------------------------------------------
// Types & constants
// -----------------------------------------------------------------------------

type DatasetStatus = 'processing' | 'ready' | 'error';
type DatasetSource = 'file' | 'connection' | 'cloud' | 'builtin';
type Method = 'upload' | 'connect' | 'cloud';

interface DetectedColumn {
  name: string;
  type: string;
  isPk?: boolean;
  isFk?: boolean;
}

interface DetectedTable {
  name: string;
  columns: DetectedColumn[];
  rowCount?: number;
}

interface DetectedRelationship {
  from: string;
  to: string;
  fromColumn: string;
  toColumn: string;
}

interface UserDataset {
  id: string;
  name: string;
  source: DatasetSource;
  format?: string;
  engine?: string;
  status: DatasetStatus;
  errorMessage?: string;
  tableCount: number;
  rowCount?: number;
  sizeBytes?: number;
  createdAt: number;
  updatedAt: number;
  tables?: DetectedTable[];
  relationships?: DetectedRelationship[];
  /** Built-in datasets: locked from delete + carry a navigation route. */
  readOnly?: boolean;
  route?: string;
  description?: string;
}

const STORAGE_KEY = 'slayql.userDatasets';
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const ACCEPTED_EXTENSIONS = ['csv', 'json', 'sql', 'ddl', 'sqlite', 'db', 'parquet'] as const;
const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(',');

const ENGINE_OPTIONS = [
  'PostgreSQL',
  'MySQL',
  'SQLite',
  'MS SQL Server',
  'Snowflake',
  'BigQuery',
  'Redshift',
] as const;

// Pre-bundled benchmark datasets surfaced in the "Your Datasets" list.
// They are read-only and link out to the Explore tab for full schema browsing.
const BUILT_IN_DATASETS: UserDataset[] = [
  {
    id: 'builtin-spider2-lite',
    name: 'Spider 2.0 Lite',
    source: 'builtin',
    engine: 'BigQuery · Snowflake · SQLite',
    status: 'ready',
    tableCount: 0,
    createdAt: 0,
    updatedAt: 0,
    readOnly: true,
    route: '/?tab=data&explore=spider2-lite',
    description: 'Hybrid multi-dialect benchmark spanning cloud warehouses and local databases.',
  },
  {
    id: 'builtin-bird',
    name: 'BIRD Benchmark',
    source: 'builtin',
    engine: 'SQLite',
    status: 'ready',
    tableCount: 0,
    createdAt: 0,
    updatedAt: 0,
    readOnly: true,
    route: '/?tab=data&explore=bird',
    description: 'Large-scale cross-domain dataset bridging research benchmarks and real-world queries.',
  },
];

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatBytes(bytes?: number): string {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  if (idx < 0) return '';
  return filename.slice(idx + 1).toLowerCase();
}

function isAccepted(ext: string): boolean {
  return (ACCEPTED_EXTENSIONS as readonly string[]).includes(ext);
}

const MOCK_TYPES = ['INT', 'VARCHAR', 'DECIMAL', 'TIMESTAMP', 'BOOLEAN', 'TEXT', 'DATE'];

const TABLE_POOL = [
  'users',
  'orders',
  'products',
  'sessions',
  'events',
  'inventory',
  'invoices',
  'shipments',
  'reviews',
  'addresses',
];

function singularize(name: string): string {
  if (name.endsWith('ies')) return `${name.slice(0, -3)}y`;
  if (name.endsWith('s')) return name.slice(0, -1);
  return name;
}

function generateMockSchema(seed: string): { tables: DetectedTable[]; relationships: DetectedRelationship[] } {
  const tableCount = 4 + (seed.length % 4); // 4..7 tables for stronger graphs
  // Deterministic shuffle of TABLE_POOL by seed.
  const shuffled = [...TABLE_POOL].sort((a, b) => {
    const sa = (seed.charCodeAt(a.length % seed.length) + a.length) % 97;
    const sb = (seed.charCodeAt(b.length % seed.length) + b.length) % 97;
    return sa - sb;
  });
  const tableNames = shuffled.slice(0, Math.min(tableCount, TABLE_POOL.length));

  const relationships: DetectedRelationship[] = [];

  const tables: DetectedTable[] = tableNames.map((name, i) => {
    const colCount = 4 + ((seed.length + i) % 4);
    const columns: DetectedColumn[] = [];
    columns.push({
      name: `${singularize(name)}_id`,
      type: 'INT',
      isPk: true,
    });
    for (let c = 1; c < colCount; c++) {
      columns.push({
        name: `column_${c}`,
        type: MOCK_TYPES[(seed.charCodeAt(c % seed.length) + c) % MOCK_TYPES.length],
      });
    }
    return {
      name,
      columns,
      rowCount: 120 + ((seed.length + i) * 137) % 9000,
    };
  });

  // Each non-hub table points back to an earlier table → produces hub-and-spoke topology.
  for (let i = 1; i < tables.length; i++) {
    const targetIdx = (seed.charCodeAt(i % seed.length) + i) % i;
    const source = tables[i];
    const target = tables[targetIdx];
    const fkColName = `${singularize(target.name)}_id`;
    if (!source.columns.some((c) => c.name === fkColName)) {
      source.columns.push({ name: fkColName, type: 'INT', isFk: true });
    } else {
      source.columns = source.columns.map((c) => (c.name === fkColName ? { ...c, isFk: true } : c));
    }
    relationships.push({
      from: source.name,
      to: target.name,
      fromColumn: fkColName,
      toColumn: target.columns[0].name,
    });
  }

  return { tables, relationships };
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function DataUpload() {
  const router = useRouter();
  const [method, setMethod] = useState<Method>('upload');
  const [datasets, setDatasets] = useState<UserDataset[]>([]);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Schema graph modal — only opens when user explicitly clicks "View Graph"
  const [graphModalId, setGraphModalId] = useState<string | null>(null);

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [dropFlashKey, setDropFlashKey] = useState(0);

  // Connection form state
  const [connEngine, setConnEngine] = useState<(typeof ENGINE_OPTIONS)[number]>('PostgreSQL');
  const [connName, setConnName] = useState('');
  const [connString, setConnString] = useState('');
  const [testingConn, setTestingConn] = useState(false);
  const [connTestResult, setConnTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Load from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const sanitized = parsed.filter((d): d is UserDataset => {
        if (typeof d !== 'object' || d === null) return false;
        const item = d as Partial<UserDataset>;
        return (
          typeof item.id === 'string' &&
          typeof item.name === 'string' &&
          typeof item.createdAt === 'number'
        );
      });
      // Anything stuck in processing on reload should be marked as error
      const cleaned = sanitized.map((d) => (d.status === 'processing' ? { ...d, status: 'error' as const, errorMessage: 'Interrupted' } : d));
      setDatasets(cleaned);
    } catch {
      // ignore
    }
  }, []);

  // Persist
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(datasets));
    } catch {
      // ignore quota errors
    }
  }, [datasets]);

  const allDatasets = useMemo(() => [...BUILT_IN_DATASETS, ...datasets], [datasets]);

  const filteredDatasets = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return allDatasets;
    return allDatasets.filter(
      (d) =>
        d.name.toLowerCase().includes(keyword) ||
        (d.engine ?? '').toLowerCase().includes(keyword) ||
        (d.format ?? '').toLowerCase().includes(keyword) ||
        (d.description ?? '').toLowerCase().includes(keyword),
    );
  }, [allDatasets, search]);

  const stats = useMemo(() => {
    const ready = allDatasets.filter((d) => d.status === 'ready');
    const tableCount = ready.reduce((sum, d) => sum + (d.tableCount ?? 0), 0);
    const totalRows = ready.reduce((sum, d) => sum + (d.rowCount ?? 0), 0);
    return { total: allDatasets.length, ready: ready.length, tables: tableCount, rows: totalRows };
  }, [allDatasets]);

  // ---------- File handling ----------

  const ingestFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const errors: string[] = [];
    const accepted: File[] = [];

    for (const file of arr) {
      const ext = getExtension(file.name);
      if (!isAccepted(ext)) {
        errors.push(`${file.name}: unsupported format (.${ext || 'unknown'})`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        errors.push(`${file.name}: exceeds ${formatBytes(MAX_FILE_SIZE_BYTES)} limit`);
        continue;
      }
      accepted.push(file);
    }

    setUploadErrors(errors);

    if (accepted.length > 0) {
      // Trigger drop-zone flash animation for visual feedback.
      setDropFlashKey((k) => k + 1);
    }

    for (const file of accepted) {
      const ext = getExtension(file.name);
      const id = genId();
      const baseName = file.name.replace(/\.[^.]+$/, '');
      const newDs: UserDataset = {
        id,
        name: baseName,
        source: 'file',
        format: ext,
        status: 'processing',
        tableCount: 0,
        sizeBytes: file.size,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setDatasets((prev) => [newDs, ...prev]);

      // Simulate async parsing
      const delay = 1200 + Math.random() * 1200;
      setTimeout(() => {
        setDatasets((prev) =>
          prev.map((d) => {
            if (d.id !== id) return d;
            const { tables, relationships } = generateMockSchema(d.name + d.id);
            const rowCount = tables.reduce((sum, t) => sum + (t.rowCount ?? 0), 0);
            return {
              ...d,
              status: 'ready',
              tableCount: tables.length,
              rowCount,
              tables,
              relationships,
              updatedAt: Date.now(),
            };
          }),
        );
      }, delay);
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      ingestFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      ingestFiles(e.dataTransfer.files);
    }
  };

  // ---------- Connection ----------

  const handleTestConnection = () => {
    setTestingConn(true);
    setConnTestResult(null);
    setTimeout(() => {
      // mock validation: must have a name, and string containing :// or @
      const looksValid = (connString.includes('://') || connString.includes('@')) && connName.trim().length > 0;
      setConnTestResult({
        ok: looksValid,
        msg: looksValid
          ? `Connected to ${connEngine}. Ready to save.`
          : 'Could not validate. Provide a name and a valid connection string.',
      });
      setTestingConn(false);
    }, 1100);
  };

  const handleSaveConnection = () => {
    if (!connTestResult?.ok) return;
    const id = genId();
    const newDs: UserDataset = {
      id,
      name: connName.trim(),
      source: 'connection',
      engine: connEngine,
      status: 'processing',
      tableCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setDatasets((prev) => [newDs, ...prev]);
    setConnName('');
    setConnString('');
    setConnTestResult(null);

    // Simulate introspection
    setTimeout(() => {
      setDatasets((prev) =>
        prev.map((d) => {
          if (d.id !== id) return d;
          const { tables, relationships } = generateMockSchema(d.name + d.id);
          const rowCount = tables.reduce((sum, t) => sum + (t.rowCount ?? 0), 0);
          return {
            ...d,
            status: 'ready',
            tableCount: tables.length,
            rowCount,
            tables,
            relationships,
            updatedAt: Date.now(),
          };
        }),
      );
    }, 1500);
  };

  // ---------- Dataset actions ----------

  const handleDelete = (id: string) => {
    setDatasets((prev) => prev.filter((d) => d.id !== id));
    if (expandedId === id) setExpandedId(null);
    setDeletingId(null);
  };

  const handleReprocess = (id: string) => {
    setDatasets((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, status: 'processing' as const, errorMessage: undefined, updatedAt: Date.now() } : d,
      ),
    );
    setTimeout(() => {
      setDatasets((prev) =>
        prev.map((d) => {
          if (d.id !== id) return d;
          let { tables, relationships } = { tables: d.tables, relationships: d.relationships };
          if (!tables || !relationships) {
            const generated = generateMockSchema(d.name + d.id);
            tables = generated.tables;
            relationships = generated.relationships;
          }
          return {
            ...d,
            status: 'ready',
            tableCount: tables.length,
            tables,
            relationships,
            updatedAt: Date.now(),
          };
        }),
      );
    }, 1200);
  };

  const datasetPendingDelete = datasets.find((d) => d.id === deletingId);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-3 sm:p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        {/* ----------------- Header ----------------- */}
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">My Data</h1>
            <p className="text-white/50 mt-1.5 text-sm md:text-base">
              Bring your own datasets &mdash; upload files or connect a live database.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatBadge color="cyan" label="Datasets" value={stats.total} />
            <StatBadge color="emerald" label="Ready" value={stats.ready} />
            <StatBadge color="violet" label="Tables" value={stats.tables} />
            <StatBadge color="fuchsia" label="Rows" value={stats.rows.toLocaleString()} />
          </div>
        </header>

        {/* ----------------- Method tabs ----------------- */}
        <div className="flex gap-1 border-b border-white/5 overflow-x-auto custom-scrollbar">
          <MethodTab
            label="Upload Files"
            icon={Upload}
            active={method === 'upload'}
            onClick={() => setMethod('upload')}
            accent="cyan"
          />
          <MethodTab
            label="Connect Database"
            icon={Plug}
            active={method === 'connect'}
            onClick={() => setMethod('connect')}
            accent="violet"
          />
          <MethodTab
            label="Cloud Storage"
            icon={Cloud}
            active={method === 'cloud'}
            onClick={() => setMethod('cloud')}
            accent="fuchsia"
            soon
          />
        </div>

        {/* ----------------- Method panel ----------------- */}
        {method === 'upload' && (
          <section
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-2xl sm:rounded-3xl border-2 border-dashed transition-all p-6 sm:p-8 md:p-12 overflow-hidden ${
              isDragging
                ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_60px_rgba(34,211,238,0.3)]'
                : 'border-white/10 bg-[#0a101d]/60 hover:border-cyan-500/40 hover:bg-[#0a101d]/80'
            }`}
          >
            <style>{`
              @keyframes du-drop-flash {
                0% { opacity: 0; transform: scale(0.3); }
                15% { opacity: 0.9; transform: scale(1); }
                100% { opacity: 0; transform: scale(2.2); }
              }
              @keyframes du-drop-flash-ring {
                0% { opacity: 0; transform: scale(0.5); }
                30% { opacity: 0.8; }
                100% { opacity: 0; transform: scale(1.8); }
              }
              .du-drop-flash {
                animation: du-drop-flash 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              }
              .du-drop-flash-ring {
                animation: du-drop-flash-ring 1.4s ease-out forwards;
              }
            `}</style>

            {/* Drop flash overlay (re-mounts on each successful drop via key) */}
            {dropFlashKey > 0 && (
              <div
                key={dropFlashKey}
                className="absolute inset-0 pointer-events-none flex items-center justify-center"
              >
                <div
                  className="du-drop-flash w-64 h-64 rounded-full"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(34,211,238,0.55), rgba(168,85,247,0.25) 45%, transparent 70%)',
                  }}
                />
                <div className="du-drop-flash-ring absolute w-72 h-72 rounded-full border-2 border-cyan-400/60" />
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT_ATTR}
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className="relative flex flex-col items-center text-center gap-4">
              <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                isDragging ? 'bg-cyan-500/20 scale-110' : 'bg-cyan-500/10'
              }`}>
                <UploadCloud className={`w-8 h-8 text-cyan-400 ${isDragging ? 'animate-bounce' : ''}`} />
                <div className="absolute inset-0 rounded-2xl bg-cyan-400/20 blur-xl -z-10" />
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-semibold text-white">
                  {isDragging ? 'Release to parse your database' : 'Drag & drop your database file'}
                </h3>
                <p className="text-white/40 text-xs sm:text-sm mt-1 max-w-md mx-auto">
                  Upload your SQLite database file to begin querying with natural language — or{' '}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
                  >
                    browse files
                  </button>
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-1.5 max-w-md">
                {ACCEPTED_EXTENSIONS.map((ext) => (
                  <span
                    key={ext}
                    className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      ext === 'sqlite' || ext === 'db'
                        ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-300'
                        : 'border-white/10 bg-white/[0.03] text-white/50'
                    }`}
                  >
                    .{ext}
                  </span>
                ))}
              </div>

              <p className="text-[11px] text-white/30">Max {formatBytes(MAX_FILE_SIZE_BYTES)} per file</p>
            </div>

            {uploadErrors.length > 0 && (
              <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
                <div className="flex items-center gap-2 text-red-400 text-sm font-semibold mb-2">
                  <AlertCircle className="w-4 h-4" />
                  Some files were rejected
                </div>
                <ul className="space-y-1">
                  {uploadErrors.map((err, i) => (
                    <li key={i} className="text-xs text-red-300/80 font-mono">
                      &middot; {err}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setUploadErrors([])}
                  className="mt-3 text-[10px] font-mono text-white/40 hover:text-white/70 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            )}
          </section>
        )}

        {method === 'connect' && (
          <section className="rounded-2xl sm:rounded-3xl border border-white/10 bg-[#0a101d]/70 backdrop-blur-xl p-4 sm:p-6 md:p-8">
            <div className="flex items-center gap-3 mb-5 sm:mb-6">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center shrink-0">
                <Plug className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-white">New Database Connection</h3>
                <p className="text-[11px] sm:text-xs text-white/40 mt-0.5">Credentials are stored locally and never sent to our servers.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Connection Name">
                <input
                  type="text"
                  value={connName}
                  onChange={(e) => {
                    setConnName(e.target.value);
                    setConnTestResult(null);
                  }}
                  placeholder="prod-warehouse"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-400/50 focus:ring-1 focus:ring-violet-400/30 transition-all"
                />
              </FormField>

              <FormField label="Database Engine">
                <select
                  value={connEngine}
                  onChange={(e) => {
                    setConnEngine(e.target.value as (typeof ENGINE_OPTIONS)[number]);
                    setConnTestResult(null);
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-400/50 focus:ring-1 focus:ring-violet-400/30 transition-all appearance-none cursor-pointer"
                >
                  {ENGINE_OPTIONS.map((eng) => (
                    <option key={eng} value={eng} className="bg-[#0a101d]">
                      {eng}
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="md:col-span-2">
                <FormField label="Connection String">
                  <input
                    type="password"
                    value={connString}
                    onChange={(e) => {
                      setConnString(e.target.value);
                      setConnTestResult(null);
                    }}
                    placeholder="postgresql://user:password@host:5432/dbname"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 font-mono focus:outline-none focus:border-violet-400/50 focus:ring-1 focus:ring-violet-400/30 transition-all"
                  />
                </FormField>
              </div>
            </div>

            {connTestResult && (
              <div
                className={`mt-4 flex items-center gap-2 rounded-xl border p-3 text-sm ${
                  connTestResult.ok
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-red-500/30 bg-red-500/10 text-red-300'
                }`}
              >
                {connTestResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{connTestResult.msg}</span>
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConn || !connString.trim() || !connName.trim()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-mono border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {testingConn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {testingConn ? 'Testing...' : 'Test connection'}
              </button>
              <button
                type="button"
                onClick={handleSaveConnection}
                disabled={!connTestResult?.ok}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] hover:scale-[1.02] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100"
              >
                <Plug className="w-4 h-4" />
                Save connection
              </button>
            </div>
          </section>
        )}

        {method === 'cloud' && (
          <section className="rounded-2xl sm:rounded-3xl border border-dashed border-white/10 bg-[#0a101d]/40 p-8 sm:p-12 text-center">
            <div className="inline-flex w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 items-center justify-center mb-4">
              <Cloud className="w-6 h-6 sm:w-7 sm:h-7 text-fuchsia-300" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-white">Cloud storage import &mdash; coming soon</h3>
            <p className="text-xs sm:text-sm text-white/40 mt-2 max-w-md mx-auto">
              Sync directly from S3, GCS, Azure Blob, Google Drive and more. Join the waitlist to get notified.
            </p>
            <button
              type="button"
              disabled
              className="mt-5 px-5 py-2 rounded-full text-xs font-mono uppercase tracking-widest border border-fuchsia-500/20 bg-fuchsia-500/5 text-fuchsia-300/60 cursor-not-allowed"
            >
              Notify me
            </button>
          </section>
        )}

        {/* ----------------- Datasets list ----------------- */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/45 flex items-center gap-2">
              <Database className="w-3.5 h-3.5" />
              Your Datasets &middot; {filteredDatasets.length}
            </h2>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search datasets..."
                className="w-full sm:w-64 pl-9 pr-3 py-2 rounded-full text-xs bg-black/30 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 transition-all"
              />
            </div>
          </div>

          {filteredDatasets.length === 0 ? (
            <EmptyState hasFilter={search.trim().length > 0} onAction={() => fileInputRef.current?.click()} />
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredDatasets.map((d) => (
                <DatasetCard
                  key={d.id}
                  dataset={d}
                  expanded={expandedId === d.id}
                  onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
                  onDelete={() => setDeletingId(d.id)}
                  onReprocess={() => handleReprocess(d.id)}
                  onOpenInExplore={d.route ? () => router.push(d.route!) : undefined}
                  onViewGraph={
                    d.source !== 'builtin' && d.status === 'ready' && (d.tables?.length ?? 0) > 0
                      ? () => setGraphModalId(d.id)
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ----------------- Schema Graph modal ----------------- */}
      {graphModalId && (() => {
        const target = allDatasets.find((d) => d.id === graphModalId);
        if (!target || !target.tables) return null;
        const subtitle = `${target.engine ?? target.format?.toUpperCase() ?? 'Custom'} · ${target.tables.length} tables · ${target.relationships?.length ?? 0} relationships`;
        return (
          <SchemaGraphModal
            datasetName={target.name}
            datasetSubtitle={subtitle}
            tables={target.tables as GraphTable[]}
            relationships={(target.relationships ?? []) as GraphRelationship[]}
            onClose={() => setGraphModalId(null)}
          />
        );
      })()}

      {/* ----------------- Delete confirm modal ----------------- */}
      {deletingId && datasetPendingDelete && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setDeletingId(null)}
        >
          <div
            className="w-full max-w-sm bg-[#0a101d] border border-white/10 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Delete dataset?</h3>
                <p className="text-xs text-white/40 mt-0.5">
                  <span className="font-mono text-white/70">{datasetPendingDelete.name}</span> will be permanently removed.
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl text-xs font-mono border border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(datasetPendingDelete.id)}
                className="px-4 py-2 rounded-xl text-xs font-mono border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

function StatBadge({ color, label, value }: { color: 'cyan' | 'emerald' | 'violet' | 'fuchsia'; label: string; value: number | string }) {
  const colorMap: Record<string, string> = {
    cyan: 'border-cyan-500/20 bg-cyan-500/5 text-cyan-300',
    emerald: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300',
    violet: 'border-violet-500/20 bg-violet-500/5 text-violet-300',
    fuchsia: 'border-fuchsia-500/20 bg-fuchsia-500/5 text-fuchsia-300',
  };
  return (
    <div className={`px-3 py-1.5 rounded-full border text-[11px] font-mono ${colorMap[color]}`}>
      <span className="opacity-60 uppercase tracking-wider mr-1.5">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function MethodTab({
  label,
  icon: Icon,
  active,
  onClick,
  accent,
  soon,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
  accent: 'cyan' | 'violet' | 'fuchsia';
  soon?: boolean;
}) {
  const activeAccent: Record<string, string> = {
    cyan: 'text-cyan-400 border-cyan-400',
    violet: 'text-violet-400 border-violet-400',
    fuchsia: 'text-fuchsia-400 border-fuchsia-400',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap -mb-px ${
        active
          ? `${activeAccent[accent]} bg-white/[0.02]`
          : 'text-white/50 hover:text-white/80 border-transparent hover:bg-white/[0.02]'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span>{label}</span>
      {soon && (
        <span className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300">
          Soon
        </span>
      )}
    </button>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.18em] font-mono text-white/40 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function EmptyState({ hasFilter, onAction }: { hasFilter: boolean; onAction: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 bg-[#0a101d]/40 p-10 text-center">
      <div className="inline-flex w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 items-center justify-center mb-3">
        <Database className="w-6 h-6 text-white/30" />
      </div>
      <h3 className="text-sm font-semibold text-white/80">
        {hasFilter ? 'No datasets match your search' : 'No datasets yet'}
      </h3>
      <p className="text-xs text-white/40 mt-1.5 max-w-sm mx-auto">
        {hasFilter
          ? 'Try a different keyword or clear your filter.'
          : 'Upload a file or connect a database to start querying with natural language.'}
      </p>
      {!hasFilter && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 transition-all"
        >
          <Upload className="w-3.5 h-3.5" />
          Upload your first dataset
        </button>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: DatasetStatus }) {
  if (status === 'ready') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
        <CheckCircle2 className="w-3 h-3" /> Ready
      </span>
    );
  }
  if (status === 'processing') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
        <Loader2 className="w-3 h-3 animate-spin" /> Processing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border border-red-500/30 bg-red-500/10 text-red-300">
      <AlertCircle className="w-3 h-3" /> Error
    </span>
  );
}

function SourceIcon({ source }: { source: DatasetSource }) {
  if (source === 'file') return <FileText className="w-4 h-4 text-cyan-400" />;
  if (source === 'connection') return <Plug className="w-4 h-4 text-violet-400" />;
  if (source === 'builtin') return <ShieldCheck className="w-4 h-4 text-amber-300" />;
  return <Cloud className="w-4 h-4 text-fuchsia-400" />;
}

function DatasetCard({
  dataset,
  expanded,
  onToggle,
  onDelete,
  onReprocess,
  onOpenInExplore,
  onViewGraph,
}: {
  dataset: UserDataset;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onReprocess: () => void;
  onOpenInExplore?: () => void;
  onViewGraph?: () => void;
}) {
  const isBuiltIn = dataset.source === 'builtin';
  const canExpand = !isBuiltIn && dataset.status === 'ready' && (dataset.tables?.length ?? 0) > 0;
  return (
    <div
      className={`group rounded-2xl border backdrop-blur-xl transition-all overflow-hidden ${
        isBuiltIn
          ? 'bg-gradient-to-br from-amber-500/[0.04] to-[#0a101d]/70 border-amber-500/20 hover:border-amber-400/40'
          : expanded
            ? 'bg-[#0a101d]/70 border-cyan-500/40 shadow-[0_0_30px_rgba(34,211,238,0.08)]'
            : 'bg-[#0a101d]/70 border-white/10 hover:border-white/20'
      }`}
    >
      <div className="p-3 sm:p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
          <button
            type="button"
            onClick={onToggle}
            disabled={!canExpand}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
              isBuiltIn
                ? 'border-amber-500/20 bg-amber-500/5 cursor-default'
                : canExpand
                  ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer'
                  : 'border-white/5 bg-white/[0.02] cursor-default'
            }`}
            title={canExpand ? (expanded ? 'Collapse' : 'View schema') : undefined}
          >
            <SourceIcon source={dataset.source} />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-white truncate">{dataset.name}</h3>
              {isBuiltIn ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border border-amber-500/30 bg-amber-500/10 text-amber-300">
                  <ShieldCheck className="w-3 h-3" /> Built-in
                </span>
              ) : (
                <StatusPill status={dataset.status} />
              )}
            </div>

            {isBuiltIn && dataset.description ? (
              <p className="mt-1 text-xs text-white/55 line-clamp-2 leading-relaxed">{dataset.description}</p>
            ) : null}

            <div className="mt-1.5 flex items-center gap-x-3 gap-y-0.5 text-[11px] text-white/40 font-mono flex-wrap">
              {dataset.source === 'file' && dataset.format && (
                <span className="uppercase tracking-wider">.{dataset.format}</span>
              )}
              {(dataset.source === 'connection' || dataset.source === 'builtin') && dataset.engine && (
                <span className="inline-flex items-center gap-1 truncate max-w-[200px]">
                  <HardDrive className="w-3 h-3 shrink-0" />
                  <span className="truncate">{dataset.engine}</span>
                </span>
              )}
              {!isBuiltIn && dataset.status === 'ready' && (
                <>
                  <span>{dataset.tableCount} table{dataset.tableCount === 1 ? '' : 's'}</span>
                  {dataset.rowCount !== undefined && (
                    <span className="hidden xs:inline">~{dataset.rowCount.toLocaleString()} rows</span>
                  )}
                </>
              )}
              {dataset.sizeBytes !== undefined && <span>{formatBytes(dataset.sizeBytes)}</span>}
              {!isBuiltIn && (
                <>
                  <span className="text-white/30 hidden sm:inline">&middot;</span>
                  <span>{formatRelativeTime(dataset.updatedAt)}</span>
                </>
              )}
            </div>
            {dataset.status === 'error' && dataset.errorMessage && (
              <p className="mt-1 text-[11px] text-red-300/80">{dataset.errorMessage}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 self-stretch sm:self-auto justify-end flex-wrap">
          {isBuiltIn && onOpenInExplore && (
            <button
              type="button"
              onClick={onOpenInExplore}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono border border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 hover:border-amber-400/50 transition-all"
              title="Open in Explore tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open in Explore</span>
              <span className="sm:hidden">Explore</span>
            </button>
          )}
          {!isBuiltIn && onViewGraph && (
            <button
              type="button"
              onClick={onViewGraph}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 hover:border-cyan-400/50 transition-all"
              title="View schema graph"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">View Graph</span>
              <span className="sm:hidden">Graph</span>
            </button>
          )}
          {!isBuiltIn && dataset.status === 'error' && (
            <button
              type="button"
              onClick={onReprocess}
              className="p-2 rounded-lg text-white/40 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
              title="Retry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          {!isBuiltIn && (
            <button
              type="button"
              onClick={onDelete}
              className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {canExpand && (
            <button
              type="button"
              onClick={onToggle}
              className="p-2 rounded-lg text-white/40 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
              title={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {expanded && canExpand && dataset.tables && (
        <div className="border-t border-white/5 bg-black/20 px-4 md:px-5 py-4 space-y-3">
          {dataset.tables.map((tbl) => (
            <div key={tbl.name} className="rounded-xl border border-white/5 bg-[#060b14]/60 overflow-hidden">
              <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Table2 className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                  <span className="text-xs font-mono text-white/85 truncate">{tbl.name}</span>
                  <span className="text-[10px] text-white/30 font-mono">
                    {tbl.columns.length} cols
                    {tbl.rowCount !== undefined && ` · ${tbl.rowCount.toLocaleString()} rows`}
                  </span>
                </div>
              </div>
              <div className="px-3 py-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-1">
                {tbl.columns.map((col) => (
                  <div key={col.name} className="flex items-center gap-1.5 min-w-0 py-0.5">
                    {col.isPk ? (
                      <span title="Primary Key">
                        <Key className="w-3 h-3 text-amber-300 shrink-0" />
                      </span>
                    ) : (
                      <span title="Field">
                        <TypeIcon className="w-3 h-3 text-cyan-300/60 shrink-0" />
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-white/75 truncate">{col.name}</span>
                    <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 font-mono shrink-0">
                      {col.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  X,
  Sparkles,
  GitBranch,
  Key,
  ArrowRight,
  Zap,
  Table2,
  Type as TypeIcon,
} from 'lucide-react';

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

export interface GraphColumn {
  name: string;
  type: string;
  isPk?: boolean;
  isFk?: boolean;
}

export interface GraphTable {
  name: string;
  columns: GraphColumn[];
  rowCount?: number;
}

export interface GraphRelationship {
  from: string;
  to: string;
  fromColumn?: string;
  toColumn?: string;
}

// -----------------------------------------------------------------------------
// Constants & helpers
// -----------------------------------------------------------------------------

const SVG_WIDTH = 900;
const SVG_HEIGHT = 560;
const NODE_RADIUS = 38;

function layoutPositions(tables: GraphTable[]): Map<string, { x: number; y: number }> {
  const map = new Map<string, { x: number; y: number }>();
  const n = tables.length;
  if (n === 0) return map;

  const cx = SVG_WIDTH / 2;
  const cy = SVG_HEIGHT / 2;

  if (n === 1) {
    map.set(tables[0].name, { x: cx, y: cy });
    return map;
  }

  if (n <= 4) {
    const radius = 170;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      map.set(tables[i].name, {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      });
    }
    return map;
  }

  // Hub + spokes: first table becomes the central hub.
  map.set(tables[0].name, { x: cx, y: cy });
  const spokes = n - 1;
  const radius = 200;
  for (let i = 1; i < n; i++) {
    const angle = ((i - 1) / spokes) * Math.PI * 2 - Math.PI / 2;
    map.set(tables[i].name, {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    });
  }
  return map;
}

function nodeDegree(name: string, relationships: GraphRelationship[]): number {
  return relationships.reduce(
    (sum, r) => sum + (r.from === name ? 1 : 0) + (r.to === name ? 1 : 0),
    0,
  );
}

function truncateLabel(name: string, max = 12): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

// -----------------------------------------------------------------------------
// SchemaGraph (SVG)
// -----------------------------------------------------------------------------

interface SchemaGraphProps {
  tables: GraphTable[];
  relationships: GraphRelationship[];
  highlight?: string | null;
  onSelectTable?: (name: string | null) => void;
  className?: string;
  /** Forces re-mount to replay entrance animation. */
  replayKey?: string | number;
}

export function SchemaGraph({
  tables,
  relationships,
  highlight,
  onSelectTable,
  className,
  replayKey,
}: SchemaGraphProps) {
  const positions = useMemo(() => layoutPositions(tables), [tables]);

  const isRelated = (a: string, b: string) =>
    relationships.some((r) => (r.from === a && r.to === b) || (r.to === a && r.from === b));

  const isHighlightedNode = (name: string) =>
    !!highlight && (highlight === name || isRelated(highlight, name));

  const isDimmedNode = (name: string) => !!highlight && !isHighlightedNode(name);

  const isHighlightedEdge = (r: GraphRelationship) =>
    !!highlight && (r.from === highlight || r.to === highlight);

  const isDimmedEdge = (r: GraphRelationship) => !!highlight && !isHighlightedEdge(r);

  return (
    <div className={`relative ${className ?? ''}`} key={replayKey}>
      <style>{`
        @keyframes sg-node-enter {
          0% { opacity: 0; transform: scale(0.2); }
          60% { opacity: 1; transform: scale(1.12); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes sg-edge-draw {
          from { stroke-dashoffset: 1000; opacity: 0; }
          50% { opacity: 0.85; }
          to { stroke-dashoffset: 0; opacity: 0.75; }
        }
        @keyframes sg-glow-pulse {
          0%, 100% { opacity: 0.18; }
          50% { opacity: 0.45; }
        }
        @keyframes sg-grid-drift {
          from { background-position: 0 0; }
          to { background-position: 40px 40px; }
        }
        .sg-node-anim {
          opacity: 0;
          transform-origin: center;
          transform-box: fill-box;
          animation: sg-node-enter 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .sg-edge-anim {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          opacity: 0;
          animation: sg-edge-draw 1.1s ease-out forwards;
        }
        .sg-glow-pulse {
          animation: sg-glow-pulse 2.4s ease-in-out infinite;
        }
      `}</style>

      {/* Subtle animated grid backdrop */}
      <div
        className="absolute inset-0 rounded-3xl pointer-events-none opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(34,211,238,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(34,211,238,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          animation: 'sg-grid-drift 12s linear infinite',
          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 85%)',
        }}
      />

      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="relative w-full h-full select-none"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="sg-edge-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>

          <radialGradient id="sg-node-grad">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>

          <radialGradient id="sg-node-grad-hot">
            <stop offset="0%" stopColor="#164e63" />
            <stop offset="100%" stopColor="#0c1929" />
          </radialGradient>

          <filter id="sg-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <marker
            id="sg-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="#a855f7" opacity="0.85" />
          </marker>
        </defs>

        {/* ----- Edges ----- */}
        <g>
          {relationships.map((rel, i) => {
            const from = positions.get(rel.from);
            const to = positions.get(rel.to);
            if (!from || !to) return null;

            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const offsetMag = Math.min(45, dist * 0.18);
            const perpX = dist === 0 ? 0 : (-dy / dist) * offsetMag;
            const perpY = dist === 0 ? 0 : (dx / dist) * offsetMag;
            const mx = (from.x + to.x) / 2 + perpX;
            const my = (from.y + to.y) / 2 + perpY;

            // Shorten endpoints to sit just outside node radius.
            const angleStart = Math.atan2(my - from.y, mx - from.x);
            const angleEnd = Math.atan2(my - to.y, mx - to.x);
            const sx = from.x + Math.cos(angleStart) * (NODE_RADIUS + 2);
            const sy = from.y + Math.sin(angleStart) * (NODE_RADIUS + 2);
            const ex = to.x + Math.cos(angleEnd) * (NODE_RADIUS + 6);
            const ey = to.y + Math.sin(angleEnd) * (NODE_RADIUS + 6);

            const path = `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`;
            const dim = isDimmedEdge(rel);
            const hot = isHighlightedEdge(rel);

            const delay = tables.length * 0.12 + i * 0.08 + 0.25;

            return (
              <g key={`rel-${i}`}>
                <path
                  d={path}
                  fill="none"
                  stroke="url(#sg-edge-grad)"
                  strokeWidth={hot ? 2.5 : dim ? 1 : 1.6}
                  className="sg-edge-anim"
                  style={{ animationDelay: `${delay}s`, opacity: dim ? 0.15 : undefined }}
                  markerEnd="url(#sg-arrow)"
                />
                {hot && rel.fromColumn && rel.toColumn && (
                  <text
                    x={mx}
                    y={my - 4}
                    textAnchor="middle"
                    className="fill-cyan-300 text-[9px] font-mono"
                    style={{ paintOrder: 'stroke', stroke: '#020617', strokeWidth: 4 }}
                  >
                    {rel.fromColumn} → {rel.toColumn}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* ----- Nodes ----- */}
        <g>
          {tables.map((tbl, i) => {
            const pos = positions.get(tbl.name);
            if (!pos) return null;

            const dim = isDimmedNode(tbl.name);
            const hot = isHighlightedNode(tbl.name);
            const isHub = i === 0;
            const degree = nodeDegree(tbl.name, relationships);
            const sizeBoost = Math.min(degree * 1.5, 8);
            const r = NODE_RADIUS + (isHub ? 4 : 0) + sizeBoost;

            return (
              <g
                key={tbl.name}
                className="sg-node-anim cursor-pointer"
                style={{ animationDelay: `${i * 0.12}s` }}
                onPointerEnter={(e) => {
                  // Only treat as hover on devices with a real pointer (mouse/pen).
                  // On touch, hover events race with click and would deselect on tap.
                  if (e.pointerType !== 'touch') onSelectTable?.(tbl.name);
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType !== 'touch') onSelectTable?.(null);
                }}
                onClick={() => onSelectTable?.(tbl.name === highlight ? null : tbl.name)}
              >
                {/* Outer glow */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r + 16}
                  fill={hot ? '#22d3ee' : isHub ? '#a855f7' : '#22d3ee'}
                  className="sg-glow-pulse"
                  filter="url(#sg-glow)"
                  style={{ opacity: dim ? 0.05 : undefined }}
                />

                {/* Ring */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r + 5}
                  fill="none"
                  stroke={hot ? '#22d3ee' : isHub ? '#c084fc' : '#22d3ee'}
                  strokeOpacity={dim ? 0.15 : 0.35}
                  strokeWidth="1"
                />

                {/* Body */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r}
                  fill={isHub ? 'url(#sg-node-grad-hot)' : 'url(#sg-node-grad)'}
                  stroke={hot ? '#22d3ee' : isHub ? '#c084fc' : '#22d3ee'}
                  strokeWidth={hot ? 2.5 : 1.5}
                  strokeOpacity={dim ? 0.25 : 1}
                />

                {/* Inner detail dot for hub */}
                {isHub && (
                  <circle
                    cx={pos.x}
                    cy={pos.y - r + 10}
                    r="3"
                    fill="#c084fc"
                    opacity={dim ? 0.3 : 0.8}
                  />
                )}

                {/* Label */}
                <text
                  x={pos.x}
                  y={pos.y - 2}
                  textAnchor="middle"
                  className="fill-white font-mono font-semibold pointer-events-none"
                  style={{ opacity: dim ? 0.4 : 1, fontSize: '14px' }}
                >
                  {truncateLabel(tbl.name, 12)}
                </text>
                <text
                  x={pos.x}
                  y={pos.y + 15}
                  textAnchor="middle"
                  className="fill-cyan-300/70 font-mono pointer-events-none"
                  style={{ opacity: dim ? 0.4 : 1, fontSize: '11px' }}
                >
                  {tbl.columns.length} cols
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Detail panel & legend
// -----------------------------------------------------------------------------

function TableDetail({
  table,
  relationships,
  allTables,
  onSelectTable,
}: {
  table: GraphTable;
  relationships: GraphRelationship[];
  allTables: GraphTable[];
  onSelectTable: (name: string) => void;
}) {
  const outgoing = relationships.filter((r) => r.from === table.name);
  const incoming = relationships.filter((r) => r.to === table.name);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Table2 className="w-4 h-4 text-cyan-300" />
          <h3 className="text-sm font-semibold text-white font-mono truncate">{table.name}</h3>
        </div>
        <p className="text-[11px] text-white/40 font-mono">
          {table.columns.length} columns
          {table.rowCount !== undefined && ` · ~${table.rowCount.toLocaleString()} rows`}
        </p>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 mb-2">Columns</p>
        <div className="rounded-xl border border-white/5 bg-black/30 divide-y divide-white/5 max-h-56 overflow-y-auto custom-scrollbar">
          {table.columns.map((col) => (
            <div key={col.name} className="flex items-center gap-2 px-3 py-1.5">
              {col.isPk ? (
                <span title="Primary key">
                  <Key className="w-3 h-3 text-amber-300 shrink-0" />
                </span>
              ) : col.isFk ? (
                <span title="Foreign key">
                  <GitBranch className="w-3 h-3 text-violet-300 shrink-0" />
                </span>
              ) : (
                <TypeIcon className="w-3 h-3 text-cyan-300/50 shrink-0" />
              )}
              <span className="text-[11px] font-mono text-white/80 truncate flex-1">{col.name}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 font-mono shrink-0">
                {col.type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {(outgoing.length > 0 || incoming.length > 0) && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 mb-2">Relationships</p>
          <div className="space-y-1.5">
            {outgoing.map((r, i) => (
              <button
                key={`out-${i}`}
                type="button"
                onClick={() => onSelectTable(r.to)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-cyan-500/5 hover:border-cyan-500/20 transition-colors text-left"
              >
                <span className="text-[10px] text-white/45 font-mono shrink-0">FK →</span>
                <span className="text-[11px] font-mono text-white/80 truncate">{r.to}</span>
                <ArrowRight className="w-3 h-3 text-cyan-300/50 ml-auto" />
              </button>
            ))}
            {incoming.map((r, i) => (
              <button
                key={`in-${i}`}
                type="button"
                onClick={() => onSelectTable(r.from)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-violet-500/5 hover:border-violet-500/20 transition-colors text-left"
              >
                <span className="text-[10px] text-white/45 font-mono shrink-0">← FK</span>
                <span className="text-[11px] font-mono text-white/80 truncate">{r.from}</span>
                <ArrowRight className="w-3 h-3 text-violet-300/50 ml-auto rotate-180" />
              </button>
            ))}
          </div>
        </div>
      )}

      {allTables.length > 1 && (
        <p className="text-[10px] text-white/30 italic pt-2 border-t border-white/5">
          Click any node on the graph to inspect its schema.
        </p>
      )}
    </div>
  );
}

function Legend({ tables, relationships }: { tables: GraphTable[]; relationships: GraphRelationship[] }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 mb-2">Topology Stats</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
            <div className="text-[10px] uppercase tracking-wider text-cyan-300/70 font-mono mb-1">Tables</div>
            <div className="text-xl font-bold text-white">{tables.length}</div>
          </div>
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
            <div className="text-[10px] uppercase tracking-wider text-violet-300/70 font-mono mb-1">Relations</div>
            <div className="text-xl font-bold text-white">{relationships.length}</div>
          </div>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 mb-2">Legend</p>
        <ul className="space-y-2 text-[11px] text-white/60 font-mono">
          <li className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full border border-violet-300 bg-violet-500/20" />
            Hub table (most connected)
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full border border-cyan-300 bg-cyan-500/10" />
            Entity table
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block w-6 h-0.5 bg-gradient-to-r from-cyan-400 to-fuchsia-400 rounded-full" />
            Foreign-key relationship
          </li>
        </ul>
      </div>

      <p className="text-[10px] text-white/30 italic pt-2 border-t border-white/5">
        Hover or click a node to inspect its columns and connections.
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SchemaGraphModal
// -----------------------------------------------------------------------------

interface SchemaGraphModalProps {
  datasetName: string;
  datasetSubtitle?: string;
  tables: GraphTable[];
  relationships: GraphRelationship[];
  onClose: () => void;
  /** When true, show "just generated" sparkle banner at the top. */
  freshlyGenerated?: boolean;
}

export function SchemaGraphModal({
  datasetName,
  datasetSubtitle,
  tables,
  relationships,
  onClose,
  freshlyGenerated,
}: SchemaGraphModalProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mobileSheetOpen) {
          setMobileSheetOpen(false);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, mobileSheetOpen]);

  // On compact viewports (below lg) the side panel is hidden, so auto-open the
  // bottom sheet whenever a table gets selected — otherwise the stats stay
  // hidden behind a chip the user would have to tap again.
  useEffect(() => {
    if (!selected) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(min-width: 1024px)').matches) return;
    setMobileSheetOpen(true);
  }, [selected]);

  const selectedTable = useMemo(
    () => (selected ? tables.find((t) => t.name === selected) ?? null : null),
    [selected, tables],
  );

  return (
    <div
      className="fixed inset-0 md:top-16 md:left-[var(--sidebar-w,240px)] z-[200] flex flex-col bg-[#060b14]/95 backdrop-blur-xl overflow-hidden animate-in fade-in duration-200"
      style={{ transition: 'left 0.4s ease-in-out' }}
    >
      <style>{`
        @keyframes sg-fresh-flash {
          0% { opacity: 0; transform: scale(0.85); }
          15% { opacity: 1; transform: scale(1.05); }
          80% { opacity: 1; }
          100% { opacity: 0; transform: scale(1); }
        }
        @keyframes sg-banner-slide {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sg-sheet-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .sg-fresh-flash {
          animation: sg-fresh-flash 1.4s ease-out forwards;
        }
        .sg-banner-anim {
          animation: sg-banner-slide 0.4s ease-out 0.2s both;
        }
        .sg-sheet-anim {
          animation: sg-sheet-up 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>

      {/* Ambient gradient blobs */}
      <div className="absolute top-0 left-0 w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[40%] h-[40%] rounded-full bg-fuchsia-500/10 blur-[160px] pointer-events-none" />

      {/* Flash burst on first reveal */}
      {freshlyGenerated && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div
            className="sg-fresh-flash w-[420px] h-[420px] sm:w-[600px] sm:h-[600px] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(34,211,238,0.35), rgba(168,85,247,0.18) 35%, transparent 65%)',
            }}
          />
        </div>
      )}

      {/* Header */}
      <header className="relative z-10 px-3 sm:px-6 py-3 sm:py-4 border-b border-white/10 flex items-center justify-between gap-2 bg-[#060b14]/80 backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
            <GitBranch className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-300" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base md:text-lg font-semibold text-white flex items-center gap-2 truncate">
              <span className="truncate">{datasetName}</span>
              {freshlyGenerated && (
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 animate-pulse shrink-0" />
              )}
            </h2>
            <p className="text-[10px] sm:text-xs text-white/45 mt-0.5 font-mono truncate">
              {datasetSubtitle ?? `Schema graph · ${tables.length} tables · ${relationships.length} relationships`}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl border border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0"
          title="Close (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* Fresh banner */}
      {freshlyGenerated && (
        <div className="sg-banner-anim relative z-10 px-3 sm:px-6 py-2 border-b border-cyan-500/15 bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-fuchsia-500/10 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
          <span className="text-[11px] sm:text-xs font-mono text-cyan-100/90 tracking-wide truncate">
            Schema parsed. Topology graph generated automatically.
          </span>
        </div>
      )}

      {/* Body */}
      <div className="relative z-10 flex-1 flex overflow-hidden">
        <div className="flex-1 p-2 sm:p-4 md:p-8 overflow-hidden flex items-center justify-center min-h-0">
          {tables.length === 0 ? (
            <div className="text-center text-white/50">
              <p className="text-sm">No schema available yet.</p>
            </div>
          ) : (
            <SchemaGraph
              tables={tables}
              relationships={relationships}
              highlight={selected}
              onSelectTable={setSelected}
              className="w-full h-full max-w-5xl"
              replayKey={datasetName}
            />
          )}
        </div>

        <aside className="hidden lg:flex w-[320px] border-l border-white/10 bg-[#0a101d]/70 backdrop-blur-md overflow-y-auto custom-scrollbar p-4 flex-col">
          {selectedTable ? (
            <TableDetail
              table={selectedTable}
              relationships={relationships}
              allTables={tables}
              onSelectTable={setSelected}
            />
          ) : (
            <Legend tables={tables} relationships={relationships} />
          )}
        </aside>
      </div>

      {/* Mobile/tablet floating chip (shown below lg) */}
      <div className="lg:hidden relative z-10 px-3 pb-3 pt-1">
        {selectedTable ? (
          <button
            type="button"
            onClick={() => setMobileSheetOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0a101d]/85 border border-cyan-500/30 backdrop-blur-md text-left hover:bg-cyan-500/10 transition-colors"
          >
            <Table2 className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
            <span className="text-xs font-mono text-white/90 truncate">{selectedTable.name}</span>
            <span className="text-[10px] text-white/40 font-mono shrink-0">
              {selectedTable.columns.length} cols
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-300/70 ml-auto shrink-0" />
          </button>
        ) : (
          <div className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#0a101d]/70 border border-white/10 backdrop-blur-md">
            <span className="text-[11px] text-white/50 font-mono">
              {tables.length} tables · {relationships.length} relations
            </span>
            <span className="text-[10px] text-white/30 italic">Tap a node to inspect</span>
          </div>
        )}
      </div>

      {/* Mobile detail bottom sheet */}
      {mobileSheetOpen && selectedTable && (
        <div
          className="lg:hidden fixed inset-0 z-[210] flex flex-col items-stretch justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileSheetOpen(false)}
        >
          <div
            className="sg-sheet-anim bg-[#0a101d] border-t border-white/10 rounded-t-2xl max-h-[75vh] overflow-y-auto custom-scrollbar p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-3">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Table details</p>
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <TableDetail
              table={selectedTable}
              relationships={relationships}
              allTables={tables}
              onSelectTable={(name) => {
                setSelected(name);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

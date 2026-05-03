'use client';

import { useEffect, useRef, useState } from 'react';
import { GitBranch } from 'lucide-react';
import mermaid from 'mermaid';

/**
 * Demo diagram — avoid Mermaid reserved tokens as bare attribute names (e.g. `alias`).
 */
const DEFAULT_MERMAID_DEFINITION = `erDiagram
  CBSA {
    int CBSA
    string CBSA_name
    string CBSA_type
    int population_estimate
    float land_area_sq_mi
  }
  ZipAlias {
    int zip_code
    string place_alias
  }
  AreaCode {
    int zip_code
    int area_code
  }`;

type SchemaPreviewSampleProps = {
  definition?: string;
  subtitle?: string;
};

let mermaidConfigured = false;

function ensureMermaidConfig() {
  if (mermaidConfigured) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    themeVariables: {
      primaryColor: '#0f172a',
      primaryTextColor: '#e2e8f0',
      secondaryColor: '#0a101d',
      lineColor: '#22d3ee',
      mainBkg: '#0a101d',
    },
  });
  mermaidConfigured = true;
}

function safeRenderId(): string {
  const u =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `mmd-${u.replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

export default function SchemaPreviewSample({
  definition = DEFAULT_MERMAID_DEFINITION,
  subtitle = 'Sample diagram · plug in partner Mermaid per DB when ready',
}: SchemaPreviewSampleProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const renderGen = useRef(0);
  const [mermaidError, setMermaidError] = useState<string | null>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const gen = ++renderGen.current;
    let cancelled = false;

    const run = async () => {
      setMermaidError(null);
      el.innerHTML = '';

      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

      if (cancelled || gen !== renderGen.current) return;

      ensureMermaidConfig();
      const renderId = safeRenderId();

      try {
        const { svg } = await mermaid.render(renderId, definition);
        if (cancelled || gen !== renderGen.current || hostRef.current !== el) return;
        el.innerHTML = svg;
      } catch (e) {
        if (!cancelled && gen === renderGen.current) {
          setMermaidError(e instanceof Error ? e.message : 'Mermaid render failed');
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (hostRef.current === el) {
        el.innerHTML = '';
      }
    };
  }, [definition]);

  return (
    <section className="relative rounded-2xl border border-cyan-500/20 bg-[#0a101d]/90 backdrop-blur-xl overflow-hidden flex flex-col min-h-0 h-full">
      <div className="px-4 py-3 border-b border-white/5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 text-fuchsia-400/90">
          <GitBranch className="w-4 h-4 shrink-0" />
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-500/70">Schema · Mermaid → SVG</p>
            <p className="text-xs text-white/50 font-mono mt-0.5">{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="p-4 flex-1 min-h-0 flex flex-col">
        {/* Keep host mounted at all times — conditional ref was breaking Mermaid / Strict Mode */}
        <div
          ref={hostRef}
          className="flex justify-center items-start flex-1 min-h-0 overflow-auto rounded-xl border border-white/5 bg-[#060b14]/80 p-4 [&_svg]:max-w-full"
        />
        {mermaidError ? (
          <p className="mt-2 text-xs text-red-400/90 font-mono shrink-0">{mermaidError}</p>
        ) : null}
      </div>
    </section>
  );
}

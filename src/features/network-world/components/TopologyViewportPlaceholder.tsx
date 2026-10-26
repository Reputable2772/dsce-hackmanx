import React from 'react';
import { Box, Compass, Eye, Sparkles } from 'lucide-react';

export const TopologyViewportPlaceholder: React.FC = () => {
  return (
    <div className="relative flex h-[520px] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-precursor-border bg-gradient-to-b from-precursor-violet/20 via-precursor-surface/40 to-precursor-navy/90 backdrop-blur-xl shadow-2xl">
      {/* Visual coordinate grid & atmosphere */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40" />

      {/* Radial depth glow */}
      <div className="absolute h-96 w-96 rounded-full bg-precursor-purple/10 blur-3xl pointer-events-none" />

      {/* Top viewport HUD */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2 rounded-lg border border-precursor-border bg-precursor-card/80 px-2.5 py-1.5 backdrop-blur-md">
          <Box className="h-3.5 w-3.5 text-precursor-cyan" />
          <span>3D DIGITAL TWIN VIEWPORT</span>
          <span className="rounded bg-slate-800 px-1 py-0.2 text-[10px] text-slate-400 font-bold">
            UNCONNECTED
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-precursor-border bg-precursor-card/80 px-2.5 py-1.5 backdrop-blur-md">
          <Compass className="h-3.5 w-3.5 text-precursor-purple" />
          <span>ORBIT CAM: [0.0, 12.0, 24.0]</span>
        </div>
      </div>

      {/* Center Digital Twin Stage Indicator */}
      <div className="relative z-10 flex max-w-md flex-col items-center text-center p-6">
        <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-precursor-border-active bg-precursor-violet/40 text-precursor-cyan shadow-glow-purple/20">
          <div className="absolute inset-0 rounded-3xl bg-precursor-purple/10 animate-pulse" />
          <Box className="h-9 w-9 text-precursor-lavender" />
        </div>

        <h3 className="text-lg font-bold text-white">
          Network World 3D Canvas
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          Interactive digital twin viewport reserved for Three.js / React Three Fiber. Topology nodes, traffic particle conduits, and interface status will render upon backend connection in Phase 2.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md border border-precursor-border bg-precursor-surface px-2.5 py-1 font-mono text-[11px] text-slate-400">
            <Eye className="h-3 w-3 text-precursor-cyan" />
            <span>WebGL 2.0 Ready</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-precursor-border bg-precursor-surface px-2.5 py-1 font-mono text-[11px] text-slate-400">
            <Sparkles className="h-3 w-3 text-precursor-purple" />
            <span>R3F / Drei Active</span>
          </span>
        </div>
      </div>

      {/* Bottom viewport controls legend */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 text-[11px] font-mono text-slate-500">
        <span>Controls: Left Click + Drag (Orbit)</span>
        <span>•</span>
        <span>Right Click + Drag (Pan)</span>
        <span>•</span>
        <span>Scroll (Zoom)</span>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import { DETECTOR_METADATA } from '../fixtures/predictionsFixture';
import { DetectorType } from '../types';

export const DetectorEvidencePanel: React.FC = () => {
  const [selectedDetector, setSelectedDetector] = useState<DetectorType>('ewma');

  const current = DETECTOR_METADATA.find(d => d.id === selectedDetector) || DETECTOR_METADATA[0];

  return (
    <div className="rounded-xl border border-white/[0.08] bg-precursor-card-glass p-4 backdrop-blur-xl shadow-glass-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-precursor-purple" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
            Precursor Detection Engine Architecture & Models
          </h3>
        </div>

        {/* Tab pills */}
        <div className="flex rounded-lg border border-white/[0.1] bg-precursor-surface p-0.5">
          {DETECTOR_METADATA.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDetector(d.id)}
              className={`rounded px-2.5 py-1 text-xs font-mono font-bold transition ${
                selectedDetector === d.id
                  ? 'bg-precursor-purple text-white shadow-glow-purple/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {d.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Detector Details */}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="md:col-span-2 space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-purple-300 text-sm">
              {current.name}
            </h4>
            <span className="rounded bg-violet-800/40 px-2 py-0.2 font-mono text-[10px] text-violet-200">
              OFFLINE ENSEMBLE
            </span>
          </div>

          <p className="text-slate-300 leading-relaxed">
            {current.description}
          </p>

          <div className="rounded-lg border border-violet-900/60 bg-navy-950/80 p-2.5 font-mono text-[11px] text-cyan-300">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Decision Boundary Logic:</span>
            {current.formulaSummary}
          </div>
        </div>

        <div className="space-y-2 border-l border-violet-900/30 pl-4">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 block">
              Core Strengths:
            </span>
            <p className="text-slate-300 text-[11px] mt-0.5">
              {current.strengths}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-amber-400 block">
              Known Limitations:
            </span>
            <p className="text-slate-300 text-[11px] mt-0.5">
              {current.limitations}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import { DETECTOR_METADATA } from '../fixtures/predictionsFixture';
import { DetectorType } from '../types';

export const DetectorEvidencePanel: React.FC = () => {
  const [selectedDetector, setSelectedDetector] = useState<DetectorType>('ewma');

  const current = DETECTOR_METADATA.find(d => d.id === selectedDetector) || DETECTOR_METADATA[0];

  return (
    <div className="rounded-xl border border-[#E3E8F0] bg-white p-4 shadow-sm text-[#202938]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3E8F0] pb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#5267D8]" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#202938]">
            Precursor Detection Engine Architecture & Models
          </h3>
        </div>

        {/* Tab pills */}
        <div className="flex rounded-lg border border-[#E3E8F0] bg-[#F8FAFC] p-0.5">
          {DETECTOR_METADATA.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDetector(d.id)}
              className={`rounded px-2.5 py-1 text-xs font-mono font-bold transition ${
                selectedDetector === d.id
                  ? 'bg-[#5267D8] text-white shadow-xs'
                  : 'text-[#687386] hover:text-[#202938]'
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
            <h4 className="font-semibold text-[#5267D8] text-sm">
              {current.name}
            </h4>
            <span className="rounded bg-[#EEF2FF] border border-indigo-100 px-2 py-0.2 font-mono text-[10px] text-[#5267D8] font-semibold">
              OFFLINE ENSEMBLE
            </span>
          </div>

          <p className="text-[#475569] leading-relaxed">
            {current.description}
          </p>

          <div className="rounded-lg border border-[#E3E8F0] bg-[#F8FAFC] p-2.5 font-mono text-[11px] text-[#202938]">
            <span className="text-[#687386] block text-[10px] uppercase font-bold">Decision Boundary Logic:</span>
            {current.formulaSummary}
          </div>
        </div>

        <div className="space-y-2 border-t md:border-t-0 md:border-l border-[#E3E8F0] pt-3 md:pt-0 md:pl-4">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-emerald-700 block">
              Core Strengths:
            </span>
            <p className="text-[#475569] text-[11px] mt-0.5">
              {current.strengths}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-amber-700 block">
              Known Limitations:
            </span>
            <p className="text-[#475569] text-[11px] mt-0.5">
              {current.limitations}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

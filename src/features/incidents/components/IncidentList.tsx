import React from 'react';
import { 
  Clock, 
  Server, 
  ChevronRight, 
  Activity 
} from 'lucide-react';
import { IncidentRecord } from '../types';

interface IncidentListProps {
  incidents: IncidentRecord[];
  selectedIncidentId: string | null;
  onSelectIncident: (id: string) => void;
}

export const IncidentList: React.FC<IncidentListProps> = ({
  incidents,
  selectedIncidentId,
  onSelectIncident
}) => {
  if (incidents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-violet-900/30 bg-navy-900/40 p-8 text-center">
        <Activity className="h-8 w-8 text-slate-500 mb-2" />
        <h4 className="text-sm font-semibold text-slate-300">No Incidents Found</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          No incident matches the active search query or severity/status filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {incidents.map((inc) => {
        const isSelected = selectedIncidentId === inc.id;
        const isCritical = inc.severity === 'CRITICAL';
        const isHigh = inc.severity === 'HIGH';
        const isWarning = inc.severity === 'WARNING';

        return (
          <div
            key={inc.id}
            onClick={() => onSelectIncident(inc.id)}
            className={`group relative flex cursor-pointer flex-col justify-between rounded-xl border p-4 backdrop-blur-md transition-all duration-200 ${
              isSelected
                ? 'border-purple-500 bg-navy-800/90 shadow-[0_0_15px_rgba(155,123,255,0.18)] ring-1 ring-purple-500/50'
                : 'border-violet-900/40 bg-navy-900/60 hover:border-violet-700 hover:bg-navy-800/50'
            }`}
          >
            {/* Top row: ID, Status, Severity, Timestamp */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-cyan-400">
                  {inc.id}
                </span>

                <span className={`rounded border px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                  isCritical 
                    ? 'border-rose-500/40 bg-rose-500/20 text-rose-300' 
                    : isHigh 
                    ? 'border-amber-500/40 bg-amber-500/20 text-amber-300' 
                    : isWarning 
                    ? 'border-yellow-500/40 bg-yellow-500/20 text-yellow-300' 
                    : 'border-blue-500/40 bg-blue-500/20 text-blue-300'
                }`}>
                  {inc.severity}
                </span>

                <span className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                  {inc.status}
                </span>

                {inc.isActiveFault && (
                  <span className="flex items-center gap-1 rounded bg-rose-950/60 border border-rose-500/30 px-1.5 py-0.5 text-[10px] font-mono text-rose-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                    <span>ACTIVE FAULT</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                <Clock className="h-3 w-3" />
                <span>Last: {inc.lastObserved}</span>
              </div>
            </div>

            {/* Middle: Title & Summary */}
            <div className="my-2">
              <h4 className="text-sm font-semibold text-slate-100 group-hover:text-cyan-300 transition">
                {inc.title}
              </h4>
              <p className="mt-1 line-clamp-2 text-xs text-slate-300 leading-relaxed">
                {inc.summary}
              </p>
            </div>

            {/* Bottom: Affected Nodes, Detection Source & Arrow */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-violet-900/30 pt-2.5 text-[11px]">
              <div className="flex flex-wrap items-center gap-2 font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <Server className="h-3 w-3 text-purple-400" />
                  <span>Nodes:</span>
                </span>
                <span className="text-slate-200">
                  {inc.affectedNodes.join(', ')}
                </span>
                <span className="text-violet-500">•</span>
                <span className="text-slate-400">Source: <strong className="text-slate-300">{inc.detectionSource}</strong></span>
              </div>

              <div className="flex items-center gap-1 text-xs font-medium text-cyan-400 group-hover:translate-x-0.5 transition">
                <span>View Details</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

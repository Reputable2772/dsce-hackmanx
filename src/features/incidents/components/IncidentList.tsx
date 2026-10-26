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
  if (!Array.isArray(incidents) || incidents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-[#E3E8F0] bg-white p-8 text-center shadow-xs">
        <Activity className="h-8 w-8 text-[#94A3B8] mb-2" />
        <h4 className="text-sm font-semibold text-[#202938]">No Incidents Found</h4>
        <p className="text-xs text-[#687386] mt-1 max-w-sm">
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
        const isInfo = inc.severity === 'INFO';

        const nodes = Array.isArray(inc.affectedNodes) ? inc.affectedNodes : [];

        const sevBadge = isCritical
          ? 'border-rose-200 bg-rose-50 text-rose-700'
          : isHigh
          ? 'border-orange-200 bg-orange-50 text-orange-700'
          : isInfo
          ? 'border-blue-200 bg-blue-50 text-blue-700'
          : 'border-amber-200 bg-amber-50 text-amber-700';

        const statusBadge =
          inc.status === 'RESOLVED'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : inc.status === 'ACKNOWLEDGED'
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : inc.status === 'INVESTIGATING'
            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
            : 'bg-rose-50 text-rose-700 border-rose-200';

        return (
          <div
            key={inc.id}
            onClick={() => onSelectIncident(inc.id)}
            className={`group relative flex cursor-pointer flex-col justify-between rounded-xl border p-3.5 transition-all duration-150 ${
              isSelected
                ? 'border-[#5267D8]/40 border-l-4 border-l-[#5267D8] bg-[#EEF2FF] shadow-xs'
                : 'border-[#E3E8F0] bg-white hover:bg-[#F8FAFC] hover:border-[#CBD5E1] shadow-xs'
            }`}
          >
            {/* Top row: ID, Severity, Status, Type/Category, Timestamp */}
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-xs font-bold text-[#5267D8]">
                  {inc.id}
                </span>

                <span className={`rounded-full border px-2 py-0.2 text-[10px] font-mono font-bold uppercase ${sevBadge}`}>
                  {inc.severity || 'WARNING'}
                </span>

                <span className={`rounded-full border px-2 py-0.2 text-[10px] font-mono font-medium ${statusBadge}`}>
                  {inc.status || 'OPEN'}
                </span>

                {inc.category && (
                  <span className="rounded bg-[#F1F5F9] border border-[#E2E8F0] px-1.5 py-0.2 text-[9px] font-mono text-[#64748B]">
                    {inc.category}
                  </span>
                )}

                {inc.isActiveFault && (
                  <span className="flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-1.5 py-0.2 text-[9px] font-mono font-semibold text-rose-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                    <span>ACTIVE</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 font-mono text-[11px] text-[#687386]">
                <Clock className="h-3 w-3 text-slate-400" />
                <span>{inc.lastObserved || inc.firstObserved || 'Recent'}</span>
              </div>
            </div>

            {/* Middle: Title & Summary */}
            <div className="my-2">
              <h4 className="text-xs font-bold text-[#202938] group-hover:text-[#5267D8] transition line-clamp-1">
                {inc.title}
              </h4>
              <p className="mt-0.5 line-clamp-2 text-[11px] text-[#687386] leading-relaxed">
                {inc.summary}
              </p>
            </div>

            {/* Bottom: Affected Nodes, Detection Source & Arrow */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E3E8F0]/80 pt-2 text-[11px]">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[#687386]">
                <span className="flex items-center gap-1">
                  <Server className="h-3 w-3 text-[#5267D8]" />
                  <span>Nodes:</span>
                </span>
                <span className="font-semibold text-[#202938]">
                  {nodes.length > 0 ? nodes.join(', ') : 'N/A'}
                </span>
                {inc.detectionSource && (
                  <>
                    <span className="text-[#CBD5E1]">•</span>
                    <span>Source: <strong className="text-[#475569]">{inc.detectionSource}</strong></span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1 text-[11px] font-semibold text-[#5267D8] group-hover:translate-x-0.5 transition">
                <span>Details</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

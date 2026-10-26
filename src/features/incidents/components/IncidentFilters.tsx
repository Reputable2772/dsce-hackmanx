import React from 'react';
import { Search, RotateCcw, Database } from 'lucide-react';
import { IncidentSeverity, IncidentStatus, IncidentCategory } from '../types';

interface IncidentFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedSeverity: IncidentSeverity | 'ALL';
  onSeverityChange: (s: IncidentSeverity | 'ALL') => void;
  selectedStatus: IncidentStatus | 'ALL';
  onStatusChange: (st: IncidentStatus | 'ALL') => void;
  selectedCategory: IncidentCategory | 'ALL';
  onCategoryChange: (c: IncidentCategory | 'ALL') => void;
  sortBy: 'RECENT' | 'SEVERITY';
  onSortChange: (sort: 'RECENT' | 'SEVERITY') => void;
  onReset: () => void;
}

export const IncidentFilters: React.FC<IncidentFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedSeverity,
  onSeverityChange,
  selectedStatus,
  onStatusChange,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  onReset
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-precursor-card-glass p-3 backdrop-blur-xl shadow-glass-panel">
      {/* Search Bar */}
      <div className="relative min-w-[220px] flex-1">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search incidents by ID, node, or summary..."
          className="w-full rounded-lg border border-white/[0.1] bg-precursor-surface py-1.5 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-400 outline-none transition focus:border-precursor-cyan focus:ring-1 focus:ring-precursor-cyan"
        />
      </div>

      {/* Dropdown Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Severity */}
        <select
          value={selectedSeverity}
          onChange={(e) => onSeverityChange(e.target.value as IncidentSeverity | 'ALL')}
          aria-label="Filter incidents by severity"
          className="rounded-lg border border-violet-800/50 bg-navy-950 px-2.5 py-1.5 text-xs text-slate-300 outline-none transition focus:border-cyan-400"
        >
          <option value="ALL">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="WARNING">Warning</option>
          <option value="INFO">Info</option>
        </select>

        {/* Status */}
        <select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value as IncidentStatus | 'ALL')}
          aria-label="Filter incidents by status"
          className="rounded-lg border border-violet-800/50 bg-navy-950 px-2.5 py-1.5 text-xs text-slate-300 outline-none transition focus:border-cyan-400"
        >
          <option value="ALL">All Statuses</option>
          <option value="INVESTIGATING">Investigating</option>
          <option value="OPEN">Open</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="RESOLVED">Resolved</option>
        </select>

        {/* Category */}
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value as IncidentCategory | 'ALL')}
          aria-label="Filter incidents by category"
          className="rounded-lg border border-violet-800/50 bg-navy-950 px-2.5 py-1.5 text-xs text-slate-300 outline-none transition focus:border-cyan-400"
        >
          <option value="ALL">All Categories</option>
          <option value="CONGESTION">Congestion</option>
          <option value="HARDWARE">Hardware</option>
          <option value="ANOMALY">Anomaly</option>
          <option value="CONNECTIVITY">Connectivity</option>
          <option value="CONFIGURATION">Configuration</option>
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as 'RECENT' | 'SEVERITY')}
          aria-label="Sort incidents"
          className="rounded-lg border border-violet-800/50 bg-navy-950 px-2.5 py-1.5 text-xs text-slate-300 outline-none transition focus:border-cyan-400"
        >
          <option value="RECENT">Sort: Most Recent</option>
          <option value="SEVERITY">Sort: Highest Severity</option>
        </select>
      </div>

      {/* Demo indicator & Reset */}
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-mono text-cyan-300">
          <Database className="h-3 w-3 text-cyan-400" />
          <span>DEMO DATA</span>
        </div>

        <button
          onClick={onReset}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-700/60 bg-slate-800/40 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
          title="Reset incident filters"
        >
          <RotateCcw className="h-3 w-3" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>
    </div>
  );
};

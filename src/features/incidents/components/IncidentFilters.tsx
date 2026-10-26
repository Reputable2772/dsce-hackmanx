import React from 'react';
import { Search, RotateCcw, Download } from 'lucide-react';
import { IncidentSeverity, IncidentStatus, IncidentCategory } from '../types';
import { apiClient } from '@/lib/api';

interface IncidentFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedSeverity: IncidentSeverity | 'ALL';
  onSeverityChange: (s: IncidentSeverity | 'ALL') => void;
  selectedStatus: IncidentStatus | 'ALL';
  onStatusChange: (st: IncidentStatus | 'ALL') => void;
  selectedCategory: IncidentCategory | 'ALL';
  onCategoryChange: (c: IncidentCategory | 'ALL') => void;
  selectedNode: string;
  onNodeChange: (node: string) => void;
  availableNodes: string[];
  sortBy: 'RECENT' | 'SEVERITY';
  onSortChange: (sort: 'RECENT' | 'SEVERITY') => void;
  onReset: () => void;
  filteredCount?: number;
  totalCount?: number;
  filteredIncidentsForExport?: any[];
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
  selectedNode,
  onNodeChange,
  availableNodes,
  sortBy,
  onSortChange,
  onReset,
  filteredIncidentsForExport = [],
}) => {
  // CSV Export handler
  const handleExportCsv = () => {
    // Attempt backend export link if possible, or build CSV from active filtered records
    if (filteredIncidentsForExport && filteredIncidentsForExport.length > 0) {
      const headers = ['id', 'title', 'severity', 'status', 'category', 'nodes', 'observed_window', 'summary'];
      const rows = filteredIncidentsForExport.map((i) => [
        `"${i.id}"`,
        `"${(i.title || '').replace(/"/g, '""')}"`,
        `"${i.severity}"`,
        `"${i.status}"`,
        `"${i.category || ''}"`,
        `"${(Array.isArray(i.affectedNodes) ? i.affectedNodes.join(';') : '').replace(/"/g, '""')}"`,
        `"${i.firstObserved || ''} - ${i.lastObserved || ''}"`,
        `"${(i.summary || '').replace(/"/g, '""')}"`,
      ]);
      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `precursor_incidents_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // Fallback to backend export url
      const url = apiClient.getFilteredCsvUrl({
        type: 'incidents',
        status: selectedStatus,
        severity: selectedSeverity,
      });
      window.open(url, '_blank');
    }
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedSeverity !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedCategory !== 'ALL' ||
    selectedNode !== 'ALL' ||
    sortBy !== 'RECENT';

  return (
    <div className="space-y-2.5 rounded-xl border border-[#E3E8F0] bg-white p-3.5 shadow-sm text-[#202938]">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Search Bar */}
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search incidents by ID, node, interface, or title..."
            className="w-full rounded-lg border border-[#E3E8F0] bg-white py-1.5 pl-9 pr-3 text-xs text-[#202938] placeholder-[#94A3B8] outline-none transition focus:border-[#5267D8] focus:ring-1 focus:ring-[#5267D8]"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Severity */}
          <select
            value={selectedSeverity}
            onChange={(e) => onSeverityChange(e.target.value as IncidentSeverity | 'ALL')}
            aria-label="Filter incidents by severity"
            className="rounded-lg border border-[#E3E8F0] bg-white px-2.5 py-1.5 text-xs text-[#202938] outline-none transition hover:border-[#CBD5E1] focus:border-[#5267D8]"
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
            className="rounded-lg border border-[#E3E8F0] bg-white px-2.5 py-1.5 text-xs text-[#202938] outline-none transition hover:border-[#CBD5E1] focus:border-[#5267D8]"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          {/* Type / Category */}
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value as IncidentCategory | 'ALL')}
            aria-label="Filter incidents by type"
            className="rounded-lg border border-[#E3E8F0] bg-white px-2.5 py-1.5 text-xs text-[#202938] outline-none transition hover:border-[#CBD5E1] focus:border-[#5267D8]"
          >
            <option value="ALL">All Types</option>
            <option value="CONGESTION">Congestion</option>
            <option value="HARDWARE">Hardware</option>
            <option value="ANOMALY">Anomaly</option>
            <option value="CONNECTIVITY">Connectivity</option>
            <option value="CONFIGURATION">Configuration</option>
          </select>

          {/* Node Filter */}
          <select
            value={selectedNode}
            onChange={(e) => onNodeChange(e.target.value)}
            aria-label="Filter incidents by node"
            className="rounded-lg border border-[#E3E8F0] bg-white px-2.5 py-1.5 text-xs text-[#202938] outline-none transition hover:border-[#CBD5E1] focus:border-[#5267D8]"
          >
            <option value="ALL">All Nodes</option>
            {availableNodes.map((n) => (
              <option key={n} value={n}>
                Node: {n}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as 'RECENT' | 'SEVERITY')}
            aria-label="Sort incidents"
            className="rounded-lg border border-[#E3E8F0] bg-white px-2.5 py-1.5 text-xs text-[#202938] outline-none transition hover:border-[#CBD5E1] focus:border-[#5267D8]"
          >
            <option value="RECENT">Sort: Recent First</option>
            <option value="SEVERITY">Sort: Severity First</option>
          </select>
        </div>

        {/* Action Buttons: Reset & CSV Export */}
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E8F0] bg-white px-2.5 py-1.5 text-xs font-medium text-[#687386] transition hover:bg-[#F8FAFC] hover:text-[#202938]"
              title="Reset all filters"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#5267D8] bg-[#EEF2FF] px-3 py-1.5 text-xs font-semibold text-[#5267D8] transition hover:bg-[#E0E7FF] shadow-xs"
            title="Export filtered incidents as CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
};

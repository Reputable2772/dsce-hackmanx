import React, { useState, useMemo } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { IncidentSummaryCards } from './components/IncidentSummaryCards';
import { IncidentFilters } from './components/IncidentFilters';
import { IncidentList } from './components/IncidentList';
import { IncidentDetailPanel } from './components/IncidentDetailPanel';
import { DETERMINISTIC_INCIDENTS } from './fixtures/incidentsFixture';
import { IncidentSeverity, IncidentStatus, IncidentCategory } from './types';
import { useAppStore } from '@/stores/useAppStore';

export const IncidentsPage: React.FC = () => {
  const selectedIncidentId = useAppStore((s) => s.selectedIncidentId);
  const setSelectedIncidentId = useAppStore((s) => s.setSelectedIncidentId);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<IncidentSeverity | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<IncidentStatus | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<IncidentCategory | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'RECENT' | 'SEVERITY'>('RECENT');

  // Filtered and sorted incidents
  const filteredIncidents = useMemo(() => {
    return DETERMINISTIC_INCIDENTS.filter((inc) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = inc.id.toLowerCase().includes(q);
        const matchesTitle = inc.title.toLowerCase().includes(q);
        const matchesSummary = inc.summary.toLowerCase().includes(q);
        const matchesNode = inc.affectedNodes.some(n => n.toLowerCase().includes(q));
        if (!matchesId && !matchesTitle && !matchesSummary && !matchesNode) {
          return false;
        }
      }

      // Severity filter
      if (selectedSeverity !== 'ALL' && inc.severity !== selectedSeverity) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL' && inc.status !== selectedStatus) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'ALL' && inc.category !== selectedCategory) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'SEVERITY') {
        const order: Record<IncidentSeverity, number> = {
          CRITICAL: 4,
          HIGH: 3,
          WARNING: 2,
          INFO: 1
        };
        return order[b.severity] - order[a.severity];
      }
      return 0; // Natural fixture order is chronological
    });
  }, [searchQuery, selectedSeverity, selectedStatus, selectedCategory, sortBy]);

  const selectedIncident = useMemo(() => {
    return DETERMINISTIC_INCIDENTS.find(i => i.id === selectedIncidentId) || DETERMINISTIC_INCIDENTS[0];
  }, [selectedIncidentId]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSeverity('ALL');
    setSelectedStatus('ALL');
    setSelectedCategory('ALL');
    setSortBy('RECENT');
  };

  return (
    <PageContainer
      title="Incident Correlator & Root Cause Explorer"
      subtitle="Correlated multi-signal incident groupings distinguishing current rule breaches from forward early-warning forecasts."
    >
      <div className="space-y-6">
        {/* Incident Summary Cards */}
        <IncidentSummaryCards
          incidents={DETERMINISTIC_INCIDENTS}
          selectedStatus={selectedStatus}
          onSelectStatus={setSelectedStatus}
        />

        {/* Filter Toolbar */}
        <IncidentFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedSeverity={selectedSeverity}
          onSeverityChange={setSelectedSeverity}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onReset={handleResetFilters}
        />

        {/* 2-Column Responsive Layout: List on Left, Detail on Right */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Incident List (5 cols on lg) */}
          <div className="lg:col-span-5">
            <div className="mb-2 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Showing {filteredIncidents.length} of {DETERMINISTIC_INCIDENTS.length} Incidents</span>
              <span>* Sorted by {sortBy === 'RECENT' ? 'Recency' : 'Severity'}</span>
            </div>
            <IncidentList
              incidents={filteredIncidents}
              selectedIncidentId={selectedIncident?.id || null}
              onSelectIncident={setSelectedIncidentId}
            />
          </div>

          {/* Incident Details Panel (7 cols on lg) */}
          <div className="lg:col-span-7">
            {selectedIncident ? (
              <IncidentDetailPanel incident={selectedIncident} />
            ) : (
              <div className="flex h-64 items-center justify-center rounded-xl border border-violet-900/40 bg-navy-900/60 p-6 text-center text-slate-400 font-mono text-xs">
                Select an incident from the list to inspect root cause evidence, timeline, and remediation options.
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

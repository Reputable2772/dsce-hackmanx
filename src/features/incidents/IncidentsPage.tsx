import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { Radio } from 'lucide-react';
import { IncidentSummaryCards } from './components/IncidentSummaryCards';
import { IncidentFilters } from './components/IncidentFilters';
import { IncidentList } from './components/IncidentList';
import { IncidentDetailPanel } from './components/IncidentDetailPanel';
import { IncidentSeverity, IncidentStatus, IncidentCategory, IncidentRecord } from './types';
import { normalizeIncidentList } from './incidentNormalizer';
import { useAppStore } from '@/stores/useAppStore';
import { apiClient } from '@/lib/api';

export const IncidentsPage: React.FC = () => {
  const selectedIncidentId = useAppStore((s) => s.selectedIncidentId);
  const setSelectedIncidentId = useAppStore((s) => s.setSelectedIncidentId);
  const connectionState = useAppStore((s) => s.connectionState);
  const isConnected = connectionState === 'connected';
  const operatingMode = useAppStore((s) => s.operatingMode);
  const targetHost = useAppStore((s) => s.targetHost);
  const targetPort = useAppStore((s) => s.targetPort);

  const [incidentsList, setIncidentsList] = useState<IncidentRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<IncidentSeverity | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<IncidentStatus | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<IncidentCategory | 'ALL'>('ALL');
  const [selectedSource, setSelectedSource] = useState<'ALL' | 'SYNTHETIC' | 'LIVE'>(
    operatingMode === 'live' ? 'LIVE' : 'ALL'
  );
  const [selectedNode, setSelectedNode] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'RECENT' | 'SEVERITY'>('RECENT');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync source filter if mode changes to live
  useEffect(() => {
    if (operatingMode === 'live') {
      setSelectedSource('LIVE');
    }
  }, [operatingMode]);

  useEffect(() => {
    let isMounted = true;
    const loadIncidents = async () => {
      try {
        const res = await apiClient.fetchIncidents();
        if (!isMounted || !res) return;

        const rawList = res.incidents || [];
        const normalized = normalizeIncidentList(rawList);
        setIncidentsList(normalized);
      } catch (err) {
        // If fetch fails and we haven't loaded yet, keep existing or empty
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadIncidents();
    const timer = setInterval(loadIncidents, 3000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [isConnected, operatingMode]);

  // Derive unique nodes from currently loaded incident records
  const availableNodes = useMemo(() => {
    const nodeSet = new Set<string>();
    incidentsList.forEach((inc) => {
      if (Array.isArray(inc.affectedNodes)) {
        inc.affectedNodes.forEach((n) => nodeSet.add(n));
      }
    });
    return Array.from(nodeSet).sort();
  }, [incidentsList]);

  // Filtered and sorted incidents
  const filteredIncidents = useMemo(() => {
    return incidentsList
      .filter((inc) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesId = (inc.id || '').toLowerCase().includes(q);
          const matchesTitle = (inc.title || '').toLowerCase().includes(q);
          const matchesSummary = (inc.summary || '').toLowerCase().includes(q);
          const matchesNode = Array.isArray(inc.affectedNodes) && inc.affectedNodes.some((n) => n.toLowerCase().includes(q));
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

        // In Live Mode, strictly exclude synthetic incidents
        if (operatingMode === 'live') {
          const incSource = (inc.source || 'synthetic').toLowerCase();
          if (incSource !== 'live') {
            return false;
          }
        } else if (selectedSource !== 'ALL') {
          const matchSource = selectedSource.toLowerCase();
          const incSource = (inc.source || 'synthetic').toLowerCase();
          if (incSource !== matchSource) {
            return false;
          }
        }

        // Node filter
        if (selectedNode !== 'ALL') {
          if (!Array.isArray(inc.affectedNodes) || !inc.affectedNodes.includes(selectedNode)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'SEVERITY') {
          const order: Record<IncidentSeverity, number> = {
            CRITICAL: 4,
            HIGH: 3,
            WARNING: 2,
            INFO: 1,
          };
          return (order[b.severity] || 0) - (order[a.severity] || 0);
        }
        // Recent sort: chronological or reverse ID
        return b.id.localeCompare(a.id);
      });
  }, [incidentsList, searchQuery, selectedSeverity, selectedStatus, selectedCategory, selectedSource, selectedNode, sortBy, operatingMode]);

  const selectedIncident = useMemo(() => {
    if (selectedIncidentId) {
      const found = filteredIncidents.find((i) => i.id === selectedIncidentId);
      if (found) return found;
    }
    return filteredIncidents[0] || null;
  }, [filteredIncidents, selectedIncidentId]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSeverity('ALL');
    setSelectedStatus('ALL');
    setSelectedCategory('ALL');
    setSelectedSource(operatingMode === 'live' ? 'LIVE' : 'ALL');
    setSelectedNode('ALL');
    setSortBy('RECENT');
  };

  return (
    <PageContainer
      title={operatingMode === 'live' ? `Incidents • Live Traffic Monitor (${targetHost}:${targetPort})` : "Incidents"}
      subtitle={operatingMode === 'live'
        ? `Physical network incidents detected in real time for Target PC ${targetHost}:${targetPort}. Synthetic scenario datasets are strictly excluded.`
        : "Presents detected incidents and reliability-gate decisions correlated across monitored systems."
      }
      action={
        operatingMode === 'live' ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 animate-pulse">
            <Radio className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            <span>LIVE HARDWARE PROBE: {targetHost}:{targetPort}</span>
          </span>
        ) : isConnected ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-mono text-xs font-semibold text-emerald-700">
            <Radio className="h-3 w-3 text-emerald-600 animate-pulse" />
            <span>Live Incident Engine</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 font-mono text-xs font-medium text-slate-600">
            <span>Offline Incident Store</span>
          </span>
        )
      }
    >
      <div className="space-y-5">
        {/* Incident Summary Cards */}
        <IncidentSummaryCards
          incidents={incidentsList}
          selectedStatus={selectedStatus}
          onSelectStatus={setSelectedStatus}
          selectedSeverity={selectedSeverity}
          onSelectSeverity={setSelectedSeverity}
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
          selectedSource={selectedSource}
          onSourceChange={setSelectedSource}
          selectedNode={selectedNode}
          onNodeChange={setSelectedNode}
          availableNodes={availableNodes}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onReset={handleResetFilters}
          filteredCount={filteredIncidents.length}
          totalCount={incidentsList.length}
          filteredIncidentsForExport={filteredIncidents}
        />

        {/* 2-Column Responsive Layout: List on Left, Detail on Right */}
        {incidentsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-[#E3E8F0] bg-white p-12 text-center shadow-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Radio className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-bold text-[#202938]">
              {isLoading ? 'Loading Incident Catalog...' : 'No Active Incidents Detected'}
            </h3>
            <p className="mt-1 text-xs text-[#687386] max-w-md">
              {isLoading
                ? 'Connecting to backend service at http://127.0.0.1:8000...'
                : 'Nominal network operating state. All latency, packet loss, and jitter indicators remain within standard SLA bounds across observed interfaces.'}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Link
                to="/history"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#5267D8] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#4355B9] transition shadow-xs"
              >
                <span>Investigate Incident History</span>
                <span>&rarr;</span>
              </Link>
              <Link
                to="/simulation"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E8F0] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#202938] hover:bg-[#F8FAFC] transition shadow-xs"
              >
                <span>Trigger Degradation Scenario</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Incident List (5 cols on lg) */}
            <div className="lg:col-span-5">
              <div className="mb-2 flex items-center justify-between text-xs font-mono text-[#687386]">
                <span>Showing {filteredIncidents.length} of {incidentsList.length} Incidents</span>
                <span>Sorted by {sortBy === 'RECENT' ? 'Recency' : 'Severity'}</span>
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
                <div className="flex h-64 items-center justify-center rounded-xl border border-[#E3E8F0] bg-white p-6 text-center text-[#687386] font-mono text-xs shadow-xs">
                  Select an incident from the list to inspect root cause evidence, timeline, and telemetry.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

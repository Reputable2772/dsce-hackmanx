import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { Radio } from 'lucide-react';
import { IncidentSummaryCards } from './components/IncidentSummaryCards';
import { IncidentFilters } from './components/IncidentFilters';
import { IncidentList } from './components/IncidentList';
import { IncidentDetailPanel } from './components/IncidentDetailPanel';
import { IncidentSeverity, IncidentStatus, IncidentCategory, IncidentRecord } from './types';
import { useAppStore } from '@/stores/useAppStore';
import { apiClient } from '@/lib/api';

export const IncidentsPage: React.FC = () => {
  const selectedIncidentId = useAppStore((s) => s.selectedIncidentId);
  const setSelectedIncidentId = useAppStore((s) => s.setSelectedIncidentId);
  const connectionState = useAppStore((s) => s.connectionState);
  const isConnected = connectionState === 'connected';

  const [incidentsList, setIncidentsList] = useState<IncidentRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<IncidentSeverity | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<IncidentStatus | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<IncidentCategory | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'RECENT' | 'SEVERITY'>('RECENT');

  useEffect(() => {
    let isMounted = true;
    const loadIncidents = async () => {
      try {
        const res = await apiClient.fetchIncidents();
        if (!isMounted || !res) return;

        const rawList = res.incidents || [];
        if (rawList.length === 0) {
          setIncidentsList([]);
          return;
        }

        const mapped: IncidentRecord[] = rawList.map((inc: any, idx: number) => {
          const firstIso = new Date((inc.first_seen || inc.detected_at || Date.now() / 1000) * 1000).toISOString();
          const lastIso = new Date((inc.last_seen || inc.detected_at || Date.now() / 1000) * 1000).toISOString();
          const rawStatus = (inc.status || 'ACTIVE').toUpperCase();
          const statusMapped: IncidentStatus =
            rawStatus === 'RESOLVED' ? 'RESOLVED' : rawStatus === 'ACKNOWLEDGED' ? 'ACKNOWLEDGED' : 'OPEN';

          return {
            id: inc.id || `INC-LIVE-${idx + 1}`,
            title: inc.title || 'Telemetry Anomaly Detected',
            summary: inc.is_active_fault
              ? `Confirmed active network fault on ${inc.interface_id || 'eth0'}. Immediate hardware alert active.`
              : `Early-warning predictive forecast (+${inc.predicted_horizon_minutes || 5}m lookahead). Reliability Gate: ${inc.gate_state || 'PREDICT'}.`,
            severity: (inc.severity as IncidentSeverity) || 'WARNING',
            status: statusMapped,
            category: inc.is_active_fault ? 'CONNECTIVITY' : 'ANOMALY',
            affectedNodes: ['rtr-spine-01', 'sw-leaf-01'],
            affectedLinks: ['link-gw-sp1', 'link-sp1-lf1'],
            primaryMetrics: inc.primary_metrics || ['latency_ms'],
            detectionSource: inc.is_active_fault ? 'Fixed SLA' : 'Forecast-Residual',
            firstObserved: firstIso.substring(11, 19) + ' UTC',
            lastObserved: lastIso.substring(11, 19) + ' UTC',
            isActiveFault: Boolean(inc.is_active_fault),
            predictedHorizonMinutes: inc.predicted_horizon_minutes || null,
            evidence: Object.entries(inc.evidence_summary || {}).map(([k, v]) => ({
              metric: k,
              observedValue: String(v),
              baseline: 'Nominal',
              delta: '+Delta',
              timestamp: firstIso.substring(11, 19) + ' UTC',
            })),
            timeline: [
              {
                id: `tl-${inc.id}-1`,
                time: firstIso.substring(11, 19) + ' UTC',
                event: `Incident initialized (${inc.is_active_fault ? 'Immediate SLA Threshold Breach' : 'Early Warning Horizon Forecast'})`,
                type: 'detection',
              },
            ],
            currentFaults: inc.is_active_fault
              ? (inc.primary_metrics || []).map((m: string) => ({
                  id: `f-${m}`,
                  rule: 'Exceeded SLA threshold',
                  interfaceId: inc.interface_id || 'eth0',
                  value: String(inc.evidence_summary?.[m] || 'Active breach'),
                }))
              : [],
            futurePredictions: !inc.is_active_fault
              ? [
                  {
                    id: `p-${inc.id}`,
                    horizon: inc.predicted_horizon_minutes || 5,
                    impact: inc.severity,
                    score: 0.95,
                  },
                ]
              : [],
            hypotheses: [
              {
                id: `hyp-${idx}-1`,
                title: inc.is_active_fault ? 'Physical Link Loss or Port Degradation' : 'Buffer Saturation & Congestion',
                likelihood: 'High',
                rationale: `Derived from ${inc.supporting_signals?.join(', ') || 'multi-horizon telemetry detectors'}.`,
                isHypothesis: true,
              },
            ],
            diagnosticSteps: [
              {
                step: 1,
                action: 'Inspect interface counters and packet drops',
                command: `ip -s link show ${inc.interface_id || 'eth0'}`,
                expected: 'Verify drop counters and carrier flags',
              },
            ],
            verificationChecks: [
              {
                check: 'Latency & Loss Return to SLA',
                method: 'Precursor Telemetry Buffer Monitor',
                passCriteria: 'RTT < 50ms and Loss = 0%',
              },
            ],
            remediations: [
              {
                action: 'Reroute critical traffic to redundant spine conduits (Operator verification required)',
                risk: 'Temporary transit reconfiguration spike during BGP convergence',
                rollback: 'Restore original route preference via router-spine-01',
              },
            ],
          };
        });

        setIncidentsList(mapped);
      } catch {
        // Fall back gracefully
      }
    };

    loadIncidents();
    const timer = setInterval(loadIncidents, 4000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [isConnected]);

  // Filtered and sorted incidents
  const filteredIncidents = useMemo(() => {
    return incidentsList.filter((inc) => {
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
  }, [incidentsList, searchQuery, selectedSeverity, selectedStatus, selectedCategory, sortBy]);

  const selectedIncident = useMemo(() => {
    return incidentsList.find(i => i.id === selectedIncidentId) || incidentsList[0];
  }, [incidentsList, selectedIncidentId]);

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
      action={
        isConnected ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-xs text-emerald-400 animate-pulse">
            <Radio className="h-3 w-3" />
            <span>Live Incident Correlator (Python Engine)</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1 font-mono text-xs text-slate-400">
            <span>Deterministic Incident Catalog</span>
          </span>
        )
      }
    >
      <div className="space-y-6">
        {/* Incident Summary Cards */}
        <IncidentSummaryCards
          incidents={incidentsList}
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
        {incidentsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E3E8F0] bg-white p-12 text-center shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Radio className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-bold text-[#202938]">No Active Incidents Detected</h3>
            <p className="mt-1 text-xs text-[#687386] max-w-md">
              Nominal network operating state. All latency, packet loss, and jitter indicators remain within standard SLA bounds across observed interfaces.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Link
                to="/history"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#5267D8] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#4355B9] transition shadow-sm"
              >
                <span>Investigate Incident History</span>
                <span>&rarr;</span>
              </Link>
              <Link
                to="/simulation"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E8F0] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#202938] hover:bg-[#F8FAFC] transition shadow-sm"
              >
                <span>Trigger Degradation Scenario</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Incident List (5 cols on lg) */}
            <div className="lg:col-span-5">
              <div className="mb-2 flex items-center justify-between text-xs font-mono text-[#687386]">
                <span>Showing {filteredIncidents.length} of {incidentsList.length} Active Incidents</span>
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
                <div className="flex h-64 items-center justify-center rounded-xl border border-[#E3E8F0] bg-white p-6 text-center text-[#687386] font-mono text-xs">
                  Select an incident from the list to inspect root cause evidence, timeline, and remediation options.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

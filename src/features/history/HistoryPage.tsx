import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import {
  History,
  ArrowUpDown,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Activity,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  FileSpreadsheet,
  X,
  FileText
} from 'lucide-react';
import { apiClient } from '@/lib/api';

import { useAppStore } from '@/stores/useAppStore';

interface HistorySummary {
  total_incidents: number;
  active_incidents: number;
  resolved_incidents: number;
  acknowledged_incidents: number;
  earliest_timestamp: number | null;
  latest_timestamp: number | null;
  total_telemetry_points: number;
  most_recent_event: {
    title?: string;
    timestamp?: number;
    severity?: string;
    message?: string;
  } | null;
}

interface HistoricalIncident {
  id: string;
  title: string;
  severity: string;
  status: string;
  is_active_fault: boolean;
  predicted_horizon_minutes: number | null;
  primary_metrics: string[];
  supporting_signals: string[];
  gate_state: string;
  detected_at: number;
  first_seen: number;
  last_seen: number;
  resolved_at: number | null;
  duration_seconds: number | null;
  interface_id: string;
  evidence_summary: Record<string, any>;
  source: string;
  scenario_type?: string;
  seed?: number;
}

interface TelemetryPoint {
  timestamp: number;
  node_id: string;
  interface_id: string;
  metric_id: string;
  value: number | null;
  unit: string;
  quality: string;
  source: string;
}

interface GateHistoryItem {
  id: number;
  timestamp: number;
  state: string;
  sensor_health_score: number;
  drift_score: number;
  residual_error_score: number;
  reasons: string[];
  source: string;
}

interface CopilotHistoryItem {
  id: number;
  timestamp: number;
  incident_id?: string;
  prompt: string;
  summary: string;
  hypotheses: string[];
  diagnostic_commands: string[];
  runbook_ids: string[];
  model_used: string;
  source: string;
}

interface ClaimVerificationItem {
  id: number;
  timestamp: number;
  statement: string;
  verdict: 'VERIFIED' | 'CONTRADICTED' | 'UNVERIFIED';
  metric_id: string;
  claimed_value?: number;
  observed_value?: number;
  tolerance_pct: number;
  explanation: string;
}

export const HistoryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialIncidentId = searchParams.get('incidentId');

  const connectionState = useAppStore((s) => s.connectionState);
  const isConnected = connectionState === 'connected';

  // Data states
  const [summary, setSummary] = useState<HistorySummary | null>(null);
  const [incidents, setIncidents] = useState<HistoricalIncident[]>([]);
  const [totalIncidents, setTotalIncidents] = useState(0);
  const [selectedIncident, setSelectedIncident] = useState<HistoricalIncident | null>(null);

  // Detail panel sub-states
  const [telemetryPoints, setTelemetryPoints] = useState<TelemetryPoint[]>([]);
  const [gateHistory, setGateHistory] = useState<GateHistoryItem[]>([]);
  const [copilotHistory, setCopilotHistory] = useState<CopilotHistoryItem[]>([]);
  const [claimVerifications, setClaimVerifications] = useState<ClaimVerificationItem[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [telemetryWindowMinutes, setTelemetryWindowMinutes] = useState<number>(10);
  const [visibleMetrics, setVisibleMetrics] = useState<Record<string, boolean>>({
    latency_ms: true,
    packet_loss_pct: true,
    jitter_ms: true,
    throughput_mbps: false,
  });

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [selectedFaultType, setSelectedFaultType] = useState<string>('ALL'); // ALL, FAULT, PREDICTION
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'SEVERITY' | 'DURATION'>('NEWEST');

  // Refreshing and error
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch summary and incident list
  const loadHistoryData = useCallback(async () => {
    setErrorMessage(null);
    try {
      const [sumRes, incRes] = await Promise.all([
        apiClient.fetchHistorySummary(),
        apiClient.fetchHistoricalIncidents({ limit: 200 }),
      ]);
      setSummary(sumRes);
      setIncidents(incRes.incidents || []);
      setTotalIncidents(incRes.total || 0);

      // Auto-select incident if param specified or none selected
      if (initialIncidentId) {
        const found = (incRes.incidents || []).find((i: HistoricalIncident) => i.id === initialIncidentId);
        if (found) setSelectedIncident(found);
      } else if (!selectedIncident && incRes.incidents && incRes.incidents.length > 0) {
        setSelectedIncident(incRes.incidents[0]);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to connect to PRECURSOR historical database');
    }
  }, [initialIncidentId]);

  useEffect(() => {
    loadHistoryData();
  }, [loadHistoryData]);

  // When selected incident changes, load its surrounding telemetry, gate transitions, and copilot history
  useEffect(() => {
    if (!selectedIncident) {
      setTelemetryPoints([]);
      setGateHistory([]);
      setCopilotHistory([]);
      setClaimVerifications([]);
      return;
    }

    let isMounted = true;
    setIsLoadingDetail(true);

    const loadIncidentDetails = async () => {
      try {
        const halfWindowSec = (telemetryWindowMinutes * 60) / 2;
        const centerTs = selectedIncident.detected_at || selectedIncident.first_seen || Date.now() / 1000;
        const startTs = centerTs - halfWindowSec;
        const endTs = (selectedIncident.resolved_at || selectedIncident.last_seen || centerTs) + halfWindowSec;

        const [telemRes, gateRes, copilotRes, claimsRes] = await Promise.all([
          apiClient.fetchHistoricalTelemetry(startTs, endTs, undefined, 500).catch(() => ({ points: [] })),
          apiClient.fetchHistoricalGate(30).catch(() => ({ history: [] })),
          apiClient.fetchHistoricalCopilot(selectedIncident.id).catch(() => ({ records: [] })),
          apiClient.fetchHistoricalClaims(selectedIncident.id).catch(() => ({ verifications: [] })),
        ]);

        if (isMounted) {
          setTelemetryPoints(telemRes.points || []);
          setGateHistory(gateRes.history || []);
          setCopilotHistory(copilotRes.records || []);
          setClaimVerifications(claimsRes.verifications || []);
        }
      } catch {
        // Safe empty state
      } finally {
        if (isMounted) setIsLoadingDetail(false);
      }
    };

    loadIncidentDetails();

    return () => {
      isMounted = false;
    };
  }, [selectedIncident, telemetryWindowMinutes]);

  // Filtered and sorted incidents
  const filteredIncidents = useMemo(() => {
    return incidents
      .filter((inc) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchId = inc.id.toLowerCase().includes(q);
          const matchTitle = inc.title.toLowerCase().includes(q);
          const matchIf = (inc.interface_id || '').toLowerCase().includes(q);
          if (!matchId && !matchTitle && !matchIf) return false;
        }
        if (selectedSeverity !== 'ALL' && inc.severity !== selectedSeverity) return false;
        if (selectedStatus !== 'ALL' && inc.status !== selectedStatus) return false;
        if (selectedSource !== 'ALL' && inc.source.toLowerCase() !== selectedSource.toLowerCase()) return false;
        if (selectedFaultType === 'FAULT' && !inc.is_active_fault) return false;
        if (selectedFaultType === 'PREDICTION' && inc.is_active_fault) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'NEWEST') return b.detected_at - a.detected_at;
        if (sortBy === 'OLDEST') return a.detected_at - b.detected_at;
        if (sortBy === 'SEVERITY') {
          const rank: Record<string, number> = { CRITICAL: 4, HIGH: 3, WARNING: 2, INFO: 1 };
          return (rank[b.severity] || 0) - (rank[a.severity] || 0);
        }
        if (sortBy === 'DURATION') {
          return (b.duration_seconds || 0) - (a.duration_seconds || 0);
        }
        return 0;
      });
  }, [incidents, searchQuery, selectedSeverity, selectedStatus, selectedSource, selectedFaultType, sortBy]);

  // Format Helpers
  const formatEpochIso = (epochSec: number | null | undefined): string => {
    if (!epochSec) return 'Unavailable';
    return new Date(epochSec * 1000).toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  };

  const formatDuration = (seconds: number | null | undefined, isResolved: boolean): string => {
    if (seconds === null || seconds === undefined) {
      return isResolved ? 'N/A' : 'Ongoing';
    }
    if (seconds < 60) return `${seconds.toFixed(0)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  // Telemetry metric groups for charts
  const metricGroups = useMemo(() => {
    const map: Record<string, TelemetryPoint[]> = {};
    for (const p of telemetryPoints) {
      if (!map[p.metric_id]) map[p.metric_id] = [];
      map[p.metric_id].push(p);
    }
    // Sort each by timestamp
    for (const k in map) {
      map[k].sort((a, b) => a.timestamp - b.timestamp);
    }
    return map;
  }, [telemetryPoints]);

  return (
    <PageContainer
      title="Incident History & Audit Timeline"
      subtitle="Database-backed audit trail of past network incidents, gate transitions, and verified Copilot explanations."
      action={
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsRefreshing(true);
              loadHistoryData().finally(() => setIsRefreshing(false));
            }}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E3E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#202938] hover:bg-[#F8FAFC] transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#687386] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <a
            href={apiClient.getFilteredCsvUrl({
              type: 'incidents',
              status: selectedStatus,
              severity: selectedSeverity,
              source: selectedSource,
            })}
            download="precursor_historical_incidents.csv"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#5267D8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4355B9] transition shadow-sm"
            title="Download filtered history as CSV"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </a>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Disconnection or Error Banner */}
        {!isConnected && (
          <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <p>
              <strong>Disconnected from live backend:</strong> Displaying cached historical database records. Reconnecting to <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">127.0.0.1:8000</code>.
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <p>{errorMessage}</p>
          </div>
        )}

        {/* 3.A Summary Area */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl border border-[#E3E8F0] bg-white p-3.5 shadow-sm">
            <span className="text-[11px] font-medium text-[#687386]">Total Incidents</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-[#202938]">
                {summary?.total_incidents ?? totalIncidents}
              </span>
              <span className="text-[10px] text-[#687386]">recorded</span>
            </div>
          </div>

          <div className="rounded-xl border border-[#E3E8F0] bg-white p-3.5 shadow-sm">
            <span className="text-[11px] font-medium text-[#687386]">Active Incidents</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-rose-600">
                {summary?.active_incidents ?? 0}
              </span>
              <span className="text-[10px] text-rose-600 font-medium">unresolved</span>
            </div>
          </div>

          <div className="rounded-xl border border-[#E3E8F0] bg-white p-3.5 shadow-sm">
            <span className="text-[11px] font-medium text-[#687386]">Resolved Incidents</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-emerald-600">
                {summary?.resolved_incidents ?? 0}
              </span>
              <span className="text-[10px] text-emerald-600 font-medium">cleared</span>
            </div>
          </div>

          <div className="rounded-xl border border-[#E3E8F0] bg-white p-3.5 shadow-sm">
            <span className="text-[11px] font-medium text-[#687386]">Telemetry Points</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-[#5267D8]">
                {summary?.total_telemetry_points ? summary.total_telemetry_points.toLocaleString() : '0'}
              </span>
              <span className="text-[10px] text-[#687386]">in DB</span>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-xl border border-[#E3E8F0] bg-white p-3.5 shadow-sm">
            <span className="text-[11px] font-medium text-[#687386]">Historical Range</span>
            <div className="mt-1 text-[11px] font-mono text-[#202938] leading-tight">
              {summary?.earliest_timestamp ? (
                <>
                  <div>From: {formatEpochIso(summary.earliest_timestamp).substring(5, 16)}</div>
                  <div className="text-[#687386]">To: {formatEpochIso(summary.latest_timestamp).substring(5, 16)}</div>
                </>
              ) : (
                <span className="text-[#687386]">Awaiting records</span>
              )}
            </div>
          </div>
        </div>

        {/* 3.C & 3.D Search, Filter & Sort Controls */}
        <div className="rounded-xl border border-[#E3E8F0] bg-white p-3.5 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by incident ID, title, interface (e.g. eth0, latency)..."
                className="w-full rounded-lg border border-[#E3E8F0] bg-[#F8FAFC] pl-9 pr-3 py-1.5 text-xs text-[#202938] placeholder-[#94A3B8] focus:border-[#5267D8] focus:bg-white focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-[#94A3B8] hover:text-[#202938]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[11px] font-medium text-[#687386]">Severity:</span>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="rounded-lg border border-[#E3E8F0] bg-white px-2 py-1 text-xs font-semibold text-[#202938] focus:border-[#5267D8] focus:outline-none"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="WARNING">Warning</option>
                <option value="INFO">Info</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[11px] font-medium text-[#687386]">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-lg border border-[#E3E8F0] bg-white px-2 py-1 text-xs font-semibold text-[#202938] focus:border-[#5267D8] focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>

            {/* Source: Live vs Synthetic */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[11px] font-medium text-[#687386]">Source:</span>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="rounded-lg border border-[#E3E8F0] bg-white px-2 py-1 text-xs font-semibold text-[#202938] focus:border-[#5267D8] focus:outline-none"
              >
                <option value="ALL">All Sources</option>
                <option value="LIVE">Live Probe</option>
                <option value="SYNTHETIC">Synthetic Sim</option>
              </select>
            </div>

            {/* Fault vs Prediction */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[11px] font-medium text-[#687386]">Type:</span>
              <select
                value={selectedFaultType}
                onChange={(e) => setSelectedFaultType(e.target.value)}
                className="rounded-lg border border-[#E3E8F0] bg-white px-2 py-1 text-xs font-semibold text-[#202938] focus:border-[#5267D8] focus:outline-none"
              >
                <option value="ALL">All Events</option>
                <option value="FAULT">Active Faults</option>
                <option value="PREDICTION">Predicted Warnings</option>
              </select>
            </div>

            {/* Sorting */}
            <div className="flex items-center gap-1.5 text-xs">
              <ArrowUpDown className="h-3.5 w-3.5 text-[#687386]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-lg border border-[#E3E8F0] bg-white px-2 py-1 text-xs font-semibold text-[#202938] focus:border-[#5267D8] focus:outline-none"
              >
                <option value="NEWEST">Newest First</option>
                <option value="OLDEST">Oldest First</option>
                <option value="SEVERITY">Highest Severity</option>
                <option value="DURATION">Longest Duration</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Content Area: Split View (List on Left, Incident Detail & Timeline on Right) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: 3.B Timeline/List (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-[#687386] px-1">
              <span>Historical Incidents ({filteredIncidents.length})</span>
              <span className="font-mono text-[11px]">Database: precursor.db</span>
            </div>

            {filteredIncidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E3E8F0] bg-white p-12 text-center shadow-sm">
                <History className="h-8 w-8 text-[#94A3B8]" />
                <h3 className="mt-2 text-sm font-bold text-[#202938]">No Matching Incidents</h3>
                <p className="mt-1 text-xs text-[#687386] max-w-xs">
                  No records match your selected filters. Adjust your search or check simulation activity.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
                {filteredIncidents.map((inc) => {
                  const isSelected = selectedIncident?.id === inc.id;
                  const isResolved = inc.status === 'RESOLVED';
                  const isAck = inc.status === 'ACKNOWLEDGED';

                  const sevBadge =
                    inc.severity === 'CRITICAL'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : inc.severity === 'HIGH'
                      ? 'bg-orange-50 text-orange-700 border-orange-200'
                      : inc.severity === 'WARNING'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-50 text-slate-700 border-slate-200';

                  const statusBadge = isResolved
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : isAck
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200';

                  return (
                    <div
                      key={inc.id}
                      onClick={() => {
                        setSelectedIncident(inc);
                        setSearchParams({ incidentId: inc.id });
                      }}
                      className={`cursor-pointer rounded-xl border p-3.5 transition-all shadow-sm ${
                        isSelected
                          ? 'border-[#5267D8] bg-[#EEF2FF]/60 ring-1 ring-[#5267D8]'
                          : 'border-[#E3E8F0] bg-white hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-[#202938]">
                            {inc.id}
                          </span>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${sevBadge}`}>
                            {inc.severity}
                          </span>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-mono font-semibold ${statusBadge}`}>
                            {inc.status}
                          </span>
                        </div>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono uppercase ${
                          inc.source === 'live'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {inc.source}
                        </span>
                      </div>

                      <h4 className="mt-1.5 text-xs font-bold text-[#202938] line-clamp-1">
                        {inc.title}
                      </h4>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-y-1 text-[11px] text-[#687386]">
                        <div className="flex items-center gap-3">
                          <span className="font-mono bg-[#F1F5F9] px-1.5 py-0.5 rounded text-[#475569]">
                            {inc.interface_id}
                          </span>
                          <span>
                            {inc.is_active_fault ? (
                              <span className="text-rose-600 font-semibold">Active Fault</span>
                            ) : (
                              <span className="text-amber-600 font-medium">+{inc.predicted_horizon_minutes || 5}m Warning</span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[10px]">
                          <Clock className="h-3 w-3 text-[#94A3B8]" />
                          <span>{formatDuration(inc.duration_seconds, isResolved)}</span>
                        </div>
                      </div>

                      <div className="mt-2 border-t border-[#E3E8F0] pt-1.5 text-[10px] font-mono text-[#94A3B8] flex items-center justify-between">
                        <span>Started: {formatEpochIso(inc.first_seen).substring(11, 19)}</span>
                        <span>{isResolved ? `Ended: ${formatEpochIso(inc.resolved_at).substring(11, 19)}` : 'Ongoing'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: 4. Incident Detail & Timeline & 5. Historical Graphs (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-5">
            {selectedIncident ? (
              <div className="space-y-5">
                {/* 4. Incident Detail Card */}
                <div className="rounded-2xl border border-[#E3E8F0] bg-white p-5 shadow-sm space-y-4">
                  {/* Top Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E3E8F0] pb-3.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-extrabold text-[#5267D8]">
                          {selectedIncident.id}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-mono font-bold ${
                          selectedIncident.severity === 'CRITICAL'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {selectedIncident.severity}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-mono font-bold ${
                          selectedIncident.status === 'RESOLVED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : selectedIncident.status === 'ACKNOWLEDGED'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {selectedIncident.status}
                        </span>
                        <span className="rounded bg-[#F1F5F9] border border-[#E2E8F0] px-2 py-0.5 text-xs font-mono text-[#475569]">
                          {selectedIncident.source.toUpperCase()}
                        </span>
                      </div>
                      <h2 className="mt-2 text-base font-bold text-[#202938]">
                        {selectedIncident.title}
                      </h2>
                    </div>

                    {/* Operational Acknowledge / Resolve Actions */}
                    <div className="flex items-center gap-2">
                      {selectedIncident.status !== 'RESOLVED' && selectedIncident.status !== 'ACKNOWLEDGED' && (
                        <button
                          onClick={async () => {
                            await apiClient.acknowledgeIncident(selectedIncident.id);
                            setSelectedIncident({ ...selectedIncident, status: 'ACKNOWLEDGED' });
                            loadHistoryData();
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition"
                        >
                          <Clock className="h-3.5 w-3.5" />
                          <span>Acknowledge</span>
                        </button>
                      )}
                      {selectedIncident.status !== 'RESOLVED' && (
                        <button
                          onClick={async () => {
                            await apiClient.resolveIncident(selectedIncident.id);
                            setSelectedIncident({ ...selectedIncident, status: 'RESOLVED', resolved_at: Date.now() / 1000 });
                            loadHistoryData();
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Resolve</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Incident Lifecycle Timestamps */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl bg-[#F8FAFC] border border-[#E3E8F0] p-3 text-xs">
                    <div>
                      <span className="text-[10px] text-[#687386] font-medium uppercase">First Observed</span>
                      <p className="mt-0.5 font-mono text-[11px] font-semibold text-[#202938]">
                        {formatEpochIso(selectedIncident.first_seen)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#687386] font-medium uppercase">Last Observed</span>
                      <p className="mt-0.5 font-mono text-[11px] font-semibold text-[#202938]">
                        {formatEpochIso(selectedIncident.last_seen)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#687386] font-medium uppercase">Resolved At</span>
                      <p className="mt-0.5 font-mono text-[11px] font-semibold text-[#202938]">
                        {selectedIncident.resolved_at ? formatEpochIso(selectedIncident.resolved_at) : 'Active / Ongoing'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#687386] font-medium uppercase">Total Duration</span>
                      <p className="mt-0.5 font-mono text-[11px] font-semibold text-[#5267D8]">
                        {formatDuration(selectedIncident.duration_seconds, selectedIncident.status === 'RESOLVED')}
                      </p>
                    </div>
                  </div>

                  {/* Metric Evidence & Gate Decision */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-[#202938]">Triggering Evidence & Detectors:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg border border-[#E3E8F0] p-2.5 bg-white">
                        <span className="text-[10px] text-[#687386] uppercase font-bold">Primary Signals:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {selectedIncident.primary_metrics.map((m) => (
                            <span key={m} className="rounded bg-[#EEF2FF] text-[#5267D8] font-mono text-[11px] px-2 py-0.5 font-semibold">
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-lg border border-[#E3E8F0] p-2.5 bg-white">
                        <span className="text-[10px] text-[#687386] uppercase font-bold">Reliability Gate At Detection:</span>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-mono font-bold ${
                            selectedIncident.gate_state === 'PREDICT'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            GATE: {selectedIncident.gate_state}
                          </span>
                          <span className="text-[11px] text-[#687386]">Interface: {selectedIncident.interface_id}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Historical Metric Graphs */}
                <div className="rounded-2xl border border-[#E3E8F0] bg-white p-5 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E3E8F0] pb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-[#5267D8]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#202938]">
                        Historical Telemetry Surrounding Incident Window
                      </h3>
                    </div>

                    {/* Window selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#687386]">Interval:</span>
                      {[5, 10, 30].map((mins) => (
                        <button
                          key={mins}
                          onClick={() => setTelemetryWindowMinutes(mins)}
                          className={`rounded px-2 py-0.5 text-xs font-mono font-semibold transition ${
                            telemetryWindowMinutes === mins
                              ? 'bg-[#5267D8] text-white'
                              : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                          }`}
                        >
                          ±{mins}m
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Series Toggles */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-[11px] font-medium text-[#687386]">Toggle Series:</span>
                    {[
                      { id: 'latency_ms', label: 'Latency (ms)', color: '#5267D8' },
                      { id: 'packet_loss_pct', label: 'Packet Loss (%)', color: '#DC2626' },
                      { id: 'jitter_ms', label: 'Jitter (ms)', color: '#D97706' },
                      { id: 'throughput_mbps', label: 'Throughput (Mbps)', color: '#159E98' },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() =>
                          setVisibleMetrics((prev) => ({ ...prev, [s.id]: !prev[s.id] }))
                        }
                        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition ${
                          visibleMetrics[s.id]
                            ? 'bg-white border-[#CBD5E1] text-[#202938] shadow-xs'
                            : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8] opacity-60'
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Honest Empty State or Chart Render */}
                  {isLoadingDetail ? (
                    <div className="flex h-44 items-center justify-center text-xs text-[#687386]">
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin text-[#5267D8]" />
                      Loading historical telemetry window...
                    </div>
                  ) : telemetryPoints.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E3E8F0] bg-[#F8FAFC] py-12 text-center">
                      <Activity className="h-6 w-6 text-[#94A3B8]" />
                      <p className="mt-2 text-xs font-semibold text-[#202938]">No Telemetry Samples in Window</p>
                      <p className="mt-0.5 text-[11px] text-[#687386]">
                        No recorded points exist for this interval. Never fabricating artificial historical points.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Metric cards with exact values */}
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {['latency_ms', 'packet_loss_pct', 'jitter_ms', 'throughput_mbps'].map((mKey) => {
                          const pts = metricGroups[mKey] || [];
                          const latestVal = pts.length > 0 ? pts[pts.length - 1].value : null;
                          const unit = pts.length > 0 ? pts[0].unit : '';
                          const label = mKey.replace('_ms', '').replace('_pct', '').replace('_mbps', '').replace('_', ' ').toUpperCase();
                          return (
                            <div key={mKey} className="rounded-xl border border-[#E3E8F0] bg-[#F8FAFC] p-3 text-xs">
                              <span className="text-[10px] uppercase font-bold text-[#687386]">{label}</span>
                              <div className="mt-1 flex items-baseline gap-1">
                                <span className="font-mono text-base font-bold text-[#202938]">
                                  {latestVal !== null ? Number(latestVal).toFixed(2) : 'N/A'}
                                </span>
                                <span className="text-[10px] text-[#687386] font-mono">{unit}</span>
                              </div>
                              <span className="text-[10px] text-[#94A3B8] font-mono">
                                {pts.length} samples
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Visual Timeline Bar of Observations */}
                      <div className="rounded-xl border border-[#E3E8F0] p-3 bg-white space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-[#687386] font-mono">
                          <span>Window Start: {formatEpochIso(telemetryPoints[0].timestamp).substring(11, 19)}</span>
                          <span>Window End: {formatEpochIso(telemetryPoints[telemetryPoints.length - 1].timestamp).substring(11, 19)}</span>
                        </div>
                        <div className="h-6 w-full rounded-md bg-[#F1F5F9] flex overflow-hidden">
                          {telemetryPoints.slice(0, 80).map((pt, idx) => {
                            const isFault = pt.metric_id === 'packet_loss_pct' && (pt.value || 0) > 0;
                            const isHighLat = pt.metric_id === 'latency_ms' && (pt.value || 0) > 50;
                            return (
                              <div
                                key={idx}
                                className={`flex-1 transition-all ${
                                  isFault ? 'bg-rose-500' : isHighLat ? 'bg-amber-400' : 'bg-emerald-400'
                                }`}
                                title={`${pt.metric_id}: ${pt.value} at ${formatEpochIso(pt.timestamp).substring(11, 19)}`}
                              />
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-[#687386]">
                          <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Nominal
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-amber-400" /> Elevated Latency
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-rose-500" /> Active Loss / Fault
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. Reliability Gate & Prediction History */}
                <div className="rounded-2xl border border-[#E3E8F0] bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 border-b border-[#E3E8F0] pb-2.5">
                    <ShieldCheck className="h-4 w-4 text-[#159E98]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#202938]">
                      Reliability Gate Decision History ({gateHistory.length} recorded)
                    </h3>
                  </div>

                  {gateHistory.length === 0 ? (
                    <p className="text-xs text-[#687386]">No gate decisions recorded in persistent database yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {gateHistory.slice(0, 10).map((gh) => (
                        <div key={gh.id} className="rounded-lg border border-[#E3E8F0] bg-[#F8FAFC] p-2.5 text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-mono font-bold ${
                              gh.state === 'PREDICT'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : gh.state === 'DEGRADED'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              GATE: {gh.state}
                            </span>
                            <span className="text-[11px] text-[#475569]">
                              {gh.reasons && gh.reasons.length > 0 ? gh.reasons.join(', ') : 'Nominal metrics'}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-[#687386]">
                            {formatEpochIso(gh.timestamp).substring(11, 19)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 7. Copilot & Claim Verification History */}
                <div className="rounded-2xl border border-[#E3E8F0] bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E3E8F0] pb-2.5">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#5267D8]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#202938]">
                        Persisted Copilot Explanations & Claim Verifications
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono text-[#687386]">
                      {copilotHistory.length} inquiries • {claimVerifications.length} claims
                    </span>
                  </div>

                  {copilotHistory.length === 0 && claimVerifications.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#E3E8F0] bg-[#F8FAFC] p-6 text-center text-xs text-[#687386]">
                      No Copilot advice has been triggered or saved for this incident yet. Use the Copilot page to explicitly request an explanation.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Copilot Records */}
                      {copilotHistory.map((rec) => (
                        <div key={rec.id} className="rounded-xl border border-[#E3E8F0] bg-[#F8FAFC] p-3.5 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#5267D8]">Query: "{rec.prompt}"</span>
                            <span className="font-mono text-[10px] text-[#94A3B8]">
                              {formatEpochIso(rec.timestamp).substring(11, 19)}
                            </span>
                          </div>
                          <p className="text-[#202938] leading-relaxed bg-white border border-[#E3E8F0] p-2.5 rounded-lg">
                            {rec.summary}
                          </p>

                          {rec.diagnostic_commands && rec.diagnostic_commands.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase text-[#687386]">Recommended Diagnostic Commands:</span>
                              {rec.diagnostic_commands.map((cmd, i) => (
                                <div key={i} className="font-mono text-[11px] bg-[#1E293B] text-emerald-400 p-2 rounded flex items-center justify-between">
                                  <span>{cmd}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Verified Claims */}
                      {claimVerifications.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-xs font-bold text-[#202938]">Numerical Claim Verification Results:</span>
                          <div className="space-y-1.5">
                            {claimVerifications.map((clm) => {
                              const verdictBadge =
                                clm.verdict === 'VERIFIED'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : clm.verdict === 'CONTRADICTED'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200';

                              return (
                                <div key={clm.id} className="rounded-lg border border-[#E3E8F0] bg-white p-2.5 text-xs flex flex-wrap items-center justify-between gap-2">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold border ${verdictBadge}`}>
                                        {clm.verdict}
                                      </span>
                                      <span className="font-semibold text-[#202938]">{clm.statement}</span>
                                    </div>
                                    <p className="text-[11px] text-[#687386]">{clm.explanation}</p>
                                  </div>

                                  <div className="font-mono text-[10px] text-[#475569] bg-[#F1F5F9] px-2 py-1 rounded text-right">
                                    <div>Claimed: {clm.claimed_value ?? 'N/A'}</div>
                                    <div>Observed: {clm.observed_value ?? 'N/A'}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-96 items-center justify-center rounded-2xl border border-dashed border-[#E3E8F0] bg-white text-xs text-[#687386]">
                Select an incident from the timeline to investigate details and telemetry window.
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

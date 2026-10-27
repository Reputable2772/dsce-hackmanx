import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Menu, 
  Sliders, 
  ShieldCheck, 
  AlertTriangle, 
  ShieldAlert,
  Bell,
  BellOff,
  BellRing
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useBreachNotifications } from '@/features/alerts/useBreachNotifications';
import { LiveProbeModal } from './LiveProbeModal';
import { ThresholdsModal } from './ThresholdsModal';

interface TopHeaderProps {
  onOpenMobileMenu: () => void;
}

// Map routes to human-readable page titles
const routeTitles: Record<string, string> = {
  '/': 'Network World (Digital Twin)',
  '/world': 'Network World (Digital Twin)',
  '/telemetry': 'Telemetry Explorer',
  '/predictions': 'Forward Predictions & Reliability Gate',
  '/incidents': 'Incident Correlator & Root Cause',
  '/history': 'Historical Incidents & Timeline Audit',
  '/copilot': 'Offline AI Copilot & Claim Verifier',
  '/simulation': 'Simulation Lab & Evaluation',
  '/status': 'System Status & Subsystems',
  '/settings': 'Operational Settings',
};

export const TopHeader: React.FC<TopHeaderProps> = ({ onOpenMobileMenu }) => {
  const location = useLocation();
  const currentTitle = routeTitles[location.pathname] || 'PRECURSOR Network Intelligence';
  const { 
    gateState, 
    connectionState, 
    operatingMode, 
    targetHost, 
    targetPort, 
    activeScenario,
    latestStatus,
    checkLiveConnection,
  } = useAppStore();
  const [liveProbeOpen, setLiveProbeOpen] = useState(false);
  const [thresholdsOpen, setThresholdsOpen] = useState(false);
  const { permissionGranted, permissionStatus, requestPermission } = useBreachNotifications();
  const isConnected = connectionState === 'connected';
  const activeMode = operatingMode || latestStatus?.mode || 'synthetic';

  // Gate badge colors
  const gateColors =
    gateState === 'PREDICT'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : gateState === 'DEGRADED'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-rose-50 text-rose-700 border-rose-200';

  const GateIcon = gateState === 'PREDICT' ? ShieldCheck : gateState === 'DEGRADED' ? AlertTriangle : ShieldAlert;

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-[#E3E8F0] bg-white px-4 sm:px-6">
      {/* Left: Mobile hamburger menu toggle & Page title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="rounded-lg p-1.5 text-[#687386] hover:bg-slate-100 lg:hidden focus:outline-none"
          aria-label="Open sidebar menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h1 className="text-sm font-bold tracking-tight text-[#202938] sm:text-base">
            {currentTitle}
          </h1>
          <p className="hidden text-[11px] text-[#687386] sm:block">
            Autonomous multi-signal observation • Grounded local inference
          </p>
        </div>
      </div>

      {/* Right: Utility area (Gate Badge, Mode Pill, Connection, Notifications, Settings) */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Active Operation Mode Pill */}
        {activeMode === 'live' ? (
          <button
            type="button"
            onClick={() => setLiveProbeOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-mono font-bold text-emerald-800 shadow-xs hover:bg-emerald-100 transition cursor-pointer"
            title="Operating Mode: Live Hardware Probe (Click to configure)"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold">LIVE: {targetHost}:{targetPort}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setLiveProbeOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-[#EEF2FF] px-2.5 py-1 text-xs font-mono font-medium text-[#5267D8] hover:bg-indigo-100/70 transition cursor-pointer"
            title="Operating Mode: Synthetic Simulation (Click to configure)"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#5267D8]" />
            <span className="max-w-[120px] truncate sm:max-w-none">
              SYNTHETIC: {activeScenario.split('(')[0].trim() || 'Baseline'}
            </span>
          </button>
        )}

        {/* Reliability Gate Pill */}
        <div className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-mono font-semibold ${gateColors}`}>
          <GateIcon className="h-3.5 w-3.5" />
          <span>GATE: {gateState}</span>
        </div>

        {/* Backend Connection Chip */}
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-mono font-medium ${
          isConnected
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-amber-200 bg-amber-50 text-amber-700'
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span className="hidden md:inline">{isConnected ? '127.0.0.1:8000' : 'Offline Mode'}</span>
        </span>

        {/* Browser Push Notifications Toggle */}
        <button
          type="button"
          onClick={requestPermission}
          className={`relative rounded-lg p-2 transition-colors cursor-pointer ${
            permissionGranted
              ? 'text-emerald-600 hover:bg-emerald-50'
              : permissionStatus === 'denied'
              ? 'text-slate-400 hover:bg-slate-100'
              : 'text-amber-600 hover:bg-amber-50 animate-pulse'
          }`}
          title={
            permissionGranted
              ? 'Browser Notifications Active (Entry alerts for Warnings, Degraded, Abstain)'
              : permissionStatus === 'denied'
              ? 'Browser Notifications Blocked in Browser Preferences'
              : 'Click to Enable Browser Notifications for Warnings, Degraded, and Abstain'
          }
          aria-label="Browser Notifications"
        >
          {permissionGranted ? (
            <BellRing className="h-4 w-4" />
          ) : permissionStatus === 'denied' ? (
            <BellOff className="h-4 w-4" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          {permissionGranted && (
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
          )}
        </button>

        {/* Detection & Gate Thresholds Tuning */}
        <button
          type="button"
          onClick={() => setThresholdsOpen(true)}
          className="rounded-lg p-2 text-[#687386] transition-colors hover:bg-slate-100 hover:text-[#202938] cursor-pointer"
          title="Detection Engine & Reliability Gate Thresholds"
          aria-label="Thresholds Configuration"
        >
          <Sliders className="h-4 w-4" />
        </button>
      </div>

      {/* Live Hardware Probe & Ingestion Mode Modal */}
      <LiveProbeModal
        isOpen={liveProbeOpen}
        onClose={() => setLiveProbeOpen(false)}
        onModeChanged={() => checkLiveConnection()}
      />

      {/* Detection & Reliability Gate Thresholds Modal */}
      <ThresholdsModal
        isOpen={thresholdsOpen}
        onClose={() => setThresholdsOpen(false)}
      />
    </header>
  );
};

import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  Menu, 
  Bell, 
  Settings, 
  ShieldCheck, 
  AlertTriangle, 
  ShieldAlert, 
  X,
  Radio,
  Activity,
  Cpu,
  CheckCircle2
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { apiClient } from '@/lib/api';

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

interface OperationalEventItem {
  id: number;
  timestamp: number;
  event_type: string;
  title: string;
  message: string;
  severity: string;
  related_incident_id?: string;
  is_read: number;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onOpenMobileMenu }) => {
  const location = useLocation();
  const currentTitle = routeTitles[location.pathname] || 'PRECURSOR Network Intelligence';
  const { 
    gateState, 
    connectionState, 
    operatingMode, 
    targetHost, 
    targetPort, 
    interfaceId, 
    activeScenario,
    setOperatingMode,
  } = useAppStore();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [modeModalOpen, setModeModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'synthetic' | 'live'>(operatingMode);
  const [editHost, setEditHost] = useState(targetHost);
  const [editPort, setEditPort] = useState(targetPort);
  const [editIface, setEditIface] = useState(interfaceId);
  const [modeLoading, setModeLoading] = useState(false);
  const [modeFeedback, setModeFeedback] = useState<string | null>(null);
  const [events, setEvents] = useState<OperationalEventItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const isConnected = connectionState === 'connected';

  // Load real operational notifications
  const loadNotifications = async () => {
    try {
      const res = await apiClient.fetchNotifications(30);
      if (res && res.events) {
        setEvents(res.events);
        const unread = res.events.filter((e: OperationalEventItem) => e.is_read === 0).length;
        setUnreadCount(unread);
      }
    } catch {
      // Offline fallback
    }
  };

  React.useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 8000);
    return () => clearInterval(timer);
  }, [isConnected]);

  const handleMarkAllRead = async () => {
    try {
      await apiClient.markAllNotificationsRead();
      setEvents((prev) => prev.map((e) => ({ ...e, is_read: 1 })));
      setUnreadCount(0);
    } catch {}
  };

  const handleMarkSingleRead = async (id: number) => {
    try {
      await apiClient.markNotificationRead(id);
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, is_read: 1 } : e)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

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
        {operatingMode === 'live' ? (
          <button
            type="button"
            onClick={() => {
              setModalMode(operatingMode);
              setEditHost(targetHost);
              setEditPort(targetPort);
              setEditIface(interfaceId);
              setModeFeedback(null);
              setModeModalOpen(true);
            }}
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
            onClick={() => {
              setModalMode(operatingMode);
              setEditHost(targetHost);
              setEditPort(targetPort);
              setEditIface(interfaceId);
              setModeFeedback(null);
              setModeModalOpen(true);
            }}
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

        {/* Notifications Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              if (!notificationsOpen) loadNotifications();
            }}
            className="relative rounded-lg p-2 text-[#687386] transition-colors hover:bg-slate-100 hover:text-[#202938]"
            title="Operational Notifications"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#5267D8] px-1 text-[9px] font-bold text-white shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-88 rounded-xl border border-[#E3E8F0] bg-white p-3.5 shadow-lg z-50">
              <div className="flex items-center justify-between border-b border-[#E3E8F0] pb-2 text-xs font-bold text-[#202938]">
                <div className="flex items-center gap-1.5">
                  <span>Operational Events</span>
                  {unreadCount > 0 && (
                    <span className="rounded bg-[#EEF2FF] px-1.5 py-0.5 text-[10px] font-mono text-[#5267D8]">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] font-semibold text-[#5267D8] hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setNotificationsOpen(false)}
                    className="rounded p-0.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-2.5 max-h-72 overflow-y-auto space-y-2 pr-1">
                {events.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#687386]">
                    No operational alerts or gate transitions recorded yet.
                  </div>
                ) : (
                  events.map((ev) => {
                    const isCritical = ev.severity === 'CRITICAL';
                    const isWarning = ev.severity === 'WARNING';
                    const sevBadge = isCritical
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : isWarning
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-50 text-slate-700 border-slate-200';

                    const timeStr = new Date(ev.timestamp * 1000).toISOString().substring(11, 19) + ' UTC';

                    return (
                      <div
                        key={ev.id}
                        onClick={() => handleMarkSingleRead(ev.id)}
                        className={`rounded-lg border p-2.5 text-xs transition ${
                          ev.is_read === 0
                            ? 'border-[#CBD5E1] bg-[#F8FAFC]'
                            : 'border-[#E3E8F0] bg-white opacity-80'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`rounded-full border px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase ${sevBadge}`}>
                              {ev.severity}
                            </span>
                            <span className="font-bold text-[#202938] line-clamp-1">{ev.title}</span>
                          </div>
                          <span className="font-mono text-[9px] text-[#94A3B8]">{timeStr}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-[#687386] leading-snug">
                          {ev.message}
                        </p>
                        {ev.related_incident_id && (
                          <div className="mt-1.5 flex justify-end">
                            <Link
                              to={`/history?incidentId=${encodeURIComponent(ev.related_incident_id)}`}
                              onClick={() => setNotificationsOpen(false)}
                              className="text-[10px] font-semibold text-[#5267D8] hover:underline flex items-center gap-1"
                            >
                              <span>View Incident Detail</span>
                              <span>&rarr;</span>
                            </Link>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Link to Settings */}
        <Link
          to="/settings"
          className="rounded-lg p-2 text-[#687386] transition-colors hover:bg-slate-100 hover:text-[#202938]"
          title="Operational Settings"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>

      {/* Mode Switch Modal / Drawer */}
      {modeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E3E8F0] bg-white p-5 shadow-2xl transition-all">
            <div className="flex items-center justify-between border-b border-[#E3E8F0] pb-3">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-[#5267D8]" />
                <h3 className="text-sm font-bold text-[#202938]">Operation Mode Switcher</h3>
              </div>
              <button
                type="button"
                onClick={() => setModeModalOpen(false)}
                className="rounded-lg p-1 text-[#687386] hover:bg-slate-100 hover:text-[#202938]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Segmented Mode Selector */}
              <div>
                <label className="mb-1.5 block font-semibold text-[#687386]">Target Operational Mode</label>
                <div className="grid grid-cols-2 gap-1 rounded-xl border border-[#E3E8F0] bg-[#F6F8FB] p-1">
                  <button
                    type="button"
                    onClick={() => setModalMode('synthetic')}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 font-mono text-xs font-bold transition ${
                      modalMode === 'synthetic'
                        ? 'bg-white text-[#5267D8] shadow-xs'
                        : 'text-[#687386] hover:text-[#202938]'
                    }`}
                  >
                    <Cpu className="h-3.5 w-3.5" />
                    <span>Synthetic Simulation</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalMode('live')}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 font-mono text-xs font-bold transition ${
                      modalMode === 'live'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-[#687386] hover:text-[#202938]'
                    }`}
                  >
                    <Activity className="h-3.5 w-3.5" />
                    <span>Live Hardware Probe</span>
                  </button>
                </div>
              </div>

              {modalMode === 'live' ? (
                <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                  <p className="text-[11px] text-emerald-800 font-medium">
                    Configure real-time Linux socket probes and interface statistics directly through the backend probe engine.
                  </p>
                  <div>
                    <label className="mb-1 block font-mono text-[10px] uppercase font-bold text-[#687386]">Target Host / IP</label>
                    <input
                      type="text"
                      value={editHost}
                      onChange={(e) => setEditHost(e.target.value)}
                      placeholder="1.1.1.1"
                      className="w-full rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1.5 font-mono text-xs text-[#202938] outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block font-mono text-[10px] uppercase font-bold text-[#687386]">Target Port</label>
                      <input
                        type="number"
                        value={editPort}
                        onChange={(e) => setEditPort(parseInt(e.target.value, 10) || 80)}
                        placeholder="80"
                        className="w-full rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1.5 font-mono text-xs text-[#202938] outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-mono text-[10px] uppercase font-bold text-[#687386]">Interface</label>
                      <input
                        type="text"
                        value={editIface}
                        onChange={(e) => setEditIface(e.target.value)}
                        placeholder="eth0"
                        className="w-full rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1.5 font-mono text-xs text-[#202938] outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-indigo-100 bg-[#EEF2FF]/50 p-3 text-[11px] text-[#5267D8]">
                  Switches ingestion to deterministic synthetic telemetry runs using the multi-horizon engine. Active scenario: <strong className="font-bold">{activeScenario}</strong>.
                </div>
              )}

              {modeFeedback && (
                <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-[11px] text-emerald-800 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span>{modeFeedback}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E3E8F0]">
                <button
                  type="button"
                  onClick={() => setModeModalOpen(false)}
                  className="rounded-lg border border-[#E3E8F0] px-3 py-1.5 font-medium text-[#687386] hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={modeLoading}
                  onClick={async () => {
                    setModeLoading(true);
                    setModeFeedback(null);
                    try {
                      await setOperatingMode(modalMode, editHost, editPort, editIface);
                      setModeFeedback(`Successfully switched to ${modalMode.toUpperCase()} mode!`);
                      setTimeout(() => {
                        setModeModalOpen(false);
                      }, 1000);
                    } catch (err: any) {
                      setModeFeedback(`Mode updated locally: ${err?.message || 'Offline mode'}`);
                    } finally {
                      setModeLoading(false);
                    }
                  }}
                  className={`rounded-lg px-4 py-1.5 font-bold text-white transition ${
                    modalMode === 'live' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#5267D8] hover:bg-[#4353B3]'
                  }`}
                >
                  {modeLoading ? 'Applying...' : 'Apply Mode'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

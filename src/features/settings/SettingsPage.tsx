import React, { useState } from 'react';
import {
  Palette,
  RotateCcw,
  Shield,
  Download,
  CheckCircle2,
  AlertTriangle,
  Compass,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useAppStore } from '@/stores/useAppStore';
import { apiClient } from '@/lib/api';
import { ThresholdsSettingsSection } from './components/ThresholdsSettingsSection';

export const SettingsPage: React.FC = () => {
  const connectionState = useAppStore((s) => s.connectionState);
  const isConnected = connectionState === 'connected';

  const {
    reducedMotion,
    demoMode,
    showParticles,
    showNodeLabels,
    autoRotateCamera,
    setReducedMotion,
    setDemoMode,
    setShowParticles,
    setShowNodeLabels,
    setAutoRotateCamera,
    resetDemoPreferences,
    restoreDefaults,
  } = useSettingsStore();

  const [confirmResetDemo, setConfirmResetDemo] = useState(false);
  const [confirmRestoreDefaults, setConfirmRestoreDefaults] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleExportDemoCsv = () => {
    if (isConnected) {
      window.open(apiClient.getExportCsvUrl(), '_blank');
      setExportNotice('Live telemetry CSV exported directly from backend storage vault.');
      setTimeout(() => setExportNotice(null), 4000);
      return;
    }

    const headers = 'timestamp_iso,timestamp_epoch,node_id,interface_id,metric_id,value,unit,quality,source,labels_json\n';
    const sampleRow = `${new Date().toISOString()},${Date.now()},spine-01,eth0,rtt_ms,14.2,ms,good,demo_fixture,"{""role"":""spine""}"\n`;
    const blob = new Blob([headers, sampleRow], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `precursor_telemetry_demo_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportNotice('Demo CSV exported using agreed schema.');
    setTimeout(() => setExportNotice(null), 4000);
  };

  const handleExportDemoJson = () => {
    if (isConnected) {
      window.open(apiClient.getExportJsonUrl(), '_blank');
      setExportNotice('Live structured JSON run archive exported directly from backend storage vault.');
      setTimeout(() => setExportNotice(null), 4000);
      return;
    }
    const archive = {
      version: '1.0.0',
      run_id: `run-demo-${Date.now()}`,
      exported_at: new Date().toISOString(),
      scenario: 'gradual_degradation',
      gate_decisions: [{ stage: 'onset', gate: 'PREDICT' }, { stage: 'breach', gate: 'DEGRADED' }],
      metadata: {
        generator: 'PRECURSOR Frontend Demonstration Lab',
        backend_connected: false,
      },
    };
    const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `precursor_run_archive_demo_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportNotice('Demo JSON run archive exported using agreed structured schema.');
    setTimeout(() => setExportNotice(null), 4000);
  };

  return (
    <PageContainer
      title="Application Settings & Preferences"
      subtitle="Configure visual appearance, reduced motion, 3D digital twin rendering, and export preferences."
    >
      <div className="space-y-6 max-w-5xl text-[#202938]">
        {/* Notice Banner if export triggered */}
        {exportNotice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>{exportNotice}</span>
          </div>
        )}

        {/* Section 1: Display & Motion Preferences */}
        <div className="rounded-xl border border-[#E3E8F0] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="h-5 w-5 text-[#5267D8]" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-[#202938]">
              Display & Motion Preferences
            </h3>
          </div>

          {/* Reduced Motion Switch */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-[#202938] flex items-center gap-2">
                <span>Reduced Motion</span>
                {reducedMotion && (
                  <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-mono text-amber-700 font-bold">
                    Active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#687386] max-w-xl">
                Suppresses high-frequency particle animations, camera transitions, and pulsating glows. Recommended for users sensitive to motion or when operating on low-power devices.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReducedMotion(!reducedMotion)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#5267D8] ${
                reducedMotion ? 'bg-[#5267D8]' : 'bg-[#CBD5E1]'
              }`}
              role="switch"
              aria-checked={reducedMotion}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  reducedMotion ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Section 2: 3D Network World & Demonstration Settings */}
        <div className="rounded-xl border border-[#E3E8F0] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Compass className="h-5 w-5 text-[#5267D8]" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-[#202938]">
              3D Digital Twin & Display Preferences
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            {/* Demonstration Mode Selection */}
            <div className="flex items-center justify-between py-2 border-b border-[#E3E8F0]">
              <div>
                <div className="font-semibold text-[#202938]">Demonstration Mode</div>
                <div className="text-[#687386] text-[11px] mt-0.5">
                  Select between guided step-by-step failure tours and open operational exploration.
                </div>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <button
                  type="button"
                  onClick={() => setDemoMode('guided_demo')}
                  className={`rounded px-3 py-1.5 text-xs font-semibold ${
                    demoMode === 'guided_demo'
                      ? 'bg-[#5267D8] text-white shadow-xs'
                      : 'border border-[#E3E8F0] bg-white text-[#687386] hover:bg-[#F8FAFC]'
                  }`}
                >
                  Guided Demo
                </button>
                <button
                  type="button"
                  onClick={() => setDemoMode('explore')}
                  className={`rounded px-3 py-1.5 text-xs font-semibold ${
                    demoMode === 'explore'
                      ? 'bg-[#5267D8] text-white shadow-xs'
                      : 'border border-[#E3E8F0] bg-white text-[#687386] hover:bg-[#F8FAFC]'
                  }`}
                >
                  Free Explore
                </button>
              </div>
            </div>

            {/* Show/Hide Traffic Particles */}
            <div className="flex items-center justify-between py-2 border-b border-[#E3E8F0]">
              <div>
                <div className="font-semibold text-[#202938]">Illustrative 3D Traffic Particles</div>
                <div className="text-[#687386] text-[11px] mt-0.5">
                  Renders light pulses along spine-leaf links and ambient particle depth in Network World.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowParticles(!showParticles)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  showParticles ? 'bg-[#5267D8]' : 'bg-[#CBD5E1]'
                }`}
                role="switch"
                aria-checked={showParticles}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                    showParticles ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Show/Hide Node Labels */}
            <div className="flex items-center justify-between py-2 border-b border-[#E3E8F0]">
              <div>
                <div className="font-semibold text-[#202938]">3D Node Billboard Labels</div>
                <div className="text-[#687386] text-[11px] mt-0.5">
                  Displays hostname, role tags, and IP labels floating above datacenter switches.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNodeLabels(!showNodeLabels)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  showNodeLabels ? 'bg-[#5267D8]' : 'bg-[#CBD5E1]'
                }`}
                role="switch"
                aria-checked={showNodeLabels}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                    showNodeLabels ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Auto-Rotate Camera */}
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="font-semibold text-[#202938]">Orbit Camera Auto-Rotation</div>
                <div className="text-[#687386] text-[11px] mt-0.5">
                  Slow cinematic orbit around the digital twin topology when idle.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAutoRotateCamera(!autoRotateCamera)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  autoRotateCamera ? 'bg-[#5267D8]' : 'bg-[#CBD5E1]'
                }`}
                role="switch"
                aria-checked={autoRotateCamera}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                    autoRotateCamera ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Data Export & Storage Boundaries */}
        <div className="rounded-xl border border-[#E3E8F0] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Download className="h-5 w-5 text-emerald-600" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-[#202938]">
              Data Export & Integration Schema
            </h3>
          </div>

          <p className="text-xs text-[#687386] mb-4 leading-relaxed">
            Download client demonstration telemetry runs matching the schema agreed with the Python backend daemon.
            When the backend is active, these buttons trigger live downloads from <code className="font-mono text-[#5267D8]">/api/export/csv</code> and <code className="font-mono text-[#5267D8]">/api/export/json</code>.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExportDemoCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-[#5267D8] bg-[#EEF2FF] px-4 py-2 text-xs font-semibold text-[#5267D8] hover:bg-[#E0E7FF] transition-all shadow-xs"
            >
              <Download className="h-4 w-4" />
              <span>Export Sample CSV Telemetry</span>
            </button>

            <button
              type="button"
              onClick={handleExportDemoJson}
              className="inline-flex items-center gap-2 rounded-lg border border-[#E3E8F0] bg-white px-4 py-2 text-xs font-semibold text-[#202938] hover:bg-[#F8FAFC] transition-all shadow-xs"
            >
              <Download className="h-4 w-4 text-[#5267D8]" />
              <span>Export Sample JSON Run Archive</span>
            </button>
          </div>
        </div>

        {/* Section: Operational Engine Detection & SLA Thresholds */}
        <ThresholdsSettingsSection isConnected={isConnected} />

        {/* Section 4: Storage & Reset Boundaries */}
        <div className="rounded-xl border border-[#E3E8F0] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-amber-600" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-[#202938]">
              Preferences Reset & State Hygiene
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-[#E3E8F0] bg-[#F8FAFC] p-4 text-xs">
              <h4 className="font-semibold text-[#202938] mb-1">Reset Demonstration Preferences</h4>
              <p className="text-[#687386] text-[11px] mb-3">
                Restores particle visibility, node labels, and auto-rotation defaults.
              </p>
              {confirmResetDemo ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetDemoPreferences();
                      setConfirmResetDemo(false);
                    }}
                    className="rounded bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
                  >
                    Confirm Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResetDemo(false)}
                    className="rounded border border-[#E3E8F0] bg-white px-3 py-1.5 text-xs text-[#687386]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmResetDemo(true)}
                  className="inline-flex items-center gap-1.5 rounded border border-[#E3E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#202938] hover:bg-[#F8FAFC]"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-[#687386]" />
                  <span>Reset Demo Controls</span>
                </button>
              )}
            </div>

            <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-4 text-xs">
              <h4 className="font-semibold text-rose-900 mb-1">Restore Factory Defaults</h4>
              <p className="text-[#687386] text-[11px] mb-3">
                Wipes all stored local browser preferences and restores original baseline values.
              </p>
              {confirmRestoreDefaults ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      restoreDefaults();
                      setConfirmRestoreDefaults(false);
                    }}
                    className="rounded bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
                  >
                    Confirm Wipe
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRestoreDefaults(false)}
                    className="rounded border border-[#E3E8F0] bg-white px-3 py-1.5 text-xs text-[#687386]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmRestoreDefaults(true)}
                  className="inline-flex items-center gap-1.5 rounded border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                  <span>Restore Defaults</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

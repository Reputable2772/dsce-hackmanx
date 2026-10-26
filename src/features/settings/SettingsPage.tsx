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

export const SettingsPage: React.FC = () => {
  const {
    theme,
    reducedMotion,
    density,
    demoMode,
    showParticles,
    showNodeLabels,
    autoRotateCamera,
    setTheme,
    setReducedMotion,
    setDensity,
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
    // Generates a sample CSV following Agent C's agreed schema
    const headers = 'timestamp_iso,timestamp_epoch,node_id,interface_id,metric_id,value,unit,quality,source,labels_json\n';
    const sampleRow = `${new Date().toISOString()},${Date.now()},spine-01,eth0,rtt_ms,14.2,ms,good,demo_fixture,"{""role"":""spine""}"\n`;
    const blob = new Blob([headers, sampleRow], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `precursor_telemetry_demo_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportNotice('Demo CSV exported using agreed schema (timestamp_iso,node_id,metric_id,value...).');
    setTimeout(() => setExportNotice(null), 4000);
  };

  const handleExportDemoJson = () => {
    // Generates a sample structured run archive JSON following Agent C's agreed schema
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
      subtitle="Configure visual appearance, reduced motion, 3D digital twin rendering, and demonstration behaviors."
    >
      <div className="space-y-6 max-w-5xl">
        {/* Notice Banner if export triggered */}
        {exportNotice && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span>{exportNotice}</span>
          </div>
        )}

        {/* Section 1: Visual Appearance */}
        <div className="rounded-xl border border-precursor-border bg-precursor-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="h-5 w-5 text-precursor-purple" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
              Visual Appearance & Display
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Theme Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Color Theme
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTheme('cyberpunk-navy')}
                  className={`rounded-lg border p-3 text-left transition-all ${
                    theme === 'cyberpunk-navy'
                      ? 'border-precursor-purple bg-precursor-purple/15 text-white shadow-glow-purple/20'
                      : 'border-precursor-border bg-precursor-surface/40 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold text-xs text-white">Cyberpunk Navy</div>
                  <div className="text-[11px] text-slate-400 mt-1">Deep navy, violet glow, cyan highlights</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('dark-slate')}
                  className={`rounded-lg border p-3 text-left transition-all ${
                    theme === 'dark-slate'
                      ? 'border-cyan-400 bg-cyan-500/15 text-white shadow-glow-cyan/20'
                      : 'border-precursor-border bg-precursor-surface/40 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold text-xs text-white">Dark Slate</div>
                  <div className="text-[11px] text-slate-400 mt-1">Industrial slate, crisp monochrome edges</div>
                </button>
              </div>
            </div>

            {/* Layout Density */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Layout Density
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDensity('comfortable')}
                  className={`rounded-lg border p-3 text-left transition-all ${
                    density === 'comfortable'
                      ? 'border-precursor-purple bg-precursor-purple/15 text-white'
                      : 'border-precursor-border bg-precursor-surface/40 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold text-xs text-white">Comfortable</div>
                  <div className="text-[11px] text-slate-400 mt-1">Spacious padding & metric margins</div>
                </button>

                <button
                  type="button"
                  onClick={() => setDensity('compact')}
                  className={`rounded-lg border p-3 text-left transition-all ${
                    density === 'compact'
                      ? 'border-precursor-purple bg-precursor-purple/15 text-white'
                      : 'border-precursor-border bg-precursor-surface/40 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold text-xs text-white">Compact</div>
                  <div className="text-[11px] text-slate-400 mt-1">Higher information density for NOC walls</div>
                </button>
              </div>
            </div>
          </div>

          {/* Reduced Motion Switch */}
          <div className="mt-6 pt-6 border-t border-precursor-border flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-white flex items-center gap-2">
                <span>Reduced Motion</span>
                {reducedMotion && (
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-mono text-amber-300">
                    Active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 max-w-xl">
                Suppresses high-frequency particle animations, camera transitions, and pulsating glows. Recommended for users sensitive to motion or when operating on low-power devices.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReducedMotion(!reducedMotion)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-precursor-purple ${
                reducedMotion ? 'bg-precursor-purple' : 'bg-slate-700'
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
        <div className="rounded-xl border border-precursor-border bg-precursor-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Compass className="h-5 w-5 text-cyan-400" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
              3D Digital Twin & Demonstration Preferences
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            {/* Demonstration Mode Selection */}
            <div className="flex items-center justify-between py-2 border-b border-precursor-border">
              <div>
                <div className="font-semibold text-slate-200">Demonstration Mode</div>
                <div className="text-slate-400 text-[11px] mt-0.5">
                  Select between guided step-by-step failure tours and open operational exploration.
                </div>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <button
                  type="button"
                  onClick={() => setDemoMode('guided_demo')}
                  className={`rounded px-3 py-1.5 text-xs font-semibold ${
                    demoMode === 'guided_demo'
                      ? 'bg-precursor-purple text-white shadow-glow-purple/20'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Guided Demo
                </button>
                <button
                  type="button"
                  onClick={() => setDemoMode('explore')}
                  className={`rounded px-3 py-1.5 text-xs font-semibold ${
                    demoMode === 'explore'
                      ? 'bg-precursor-purple text-white shadow-glow-purple/20'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Free Explore
                </button>
              </div>
            </div>

            {/* Show/Hide Traffic Particles */}
            <div className="flex items-center justify-between py-2 border-b border-precursor-border">
              <div>
                <div className="font-semibold text-slate-200">Illustrative 3D Traffic Particles</div>
                <div className="text-slate-400 text-[11px] mt-0.5">
                  Renders light pulses along spine-leaf links and ambient particle depth in Network World.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowParticles(!showParticles)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  showParticles ? 'bg-cyan-500' : 'bg-slate-700'
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
            <div className="flex items-center justify-between py-2 border-b border-precursor-border">
              <div>
                <div className="font-semibold text-slate-200">3D Node Billboard Labels</div>
                <div className="text-slate-400 text-[11px] mt-0.5">
                  Displays hostname, role tags, and IP labels floating above datacenter switches.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNodeLabels(!showNodeLabels)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  showNodeLabels ? 'bg-cyan-500' : 'bg-slate-700'
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
                <div className="font-semibold text-slate-200">Orbit Camera Auto-Rotation</div>
                <div className="text-slate-400 text-[11px] mt-0.5">
                  Slow cinematic orbit around the digital twin topology when idle.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAutoRotateCamera(!autoRotateCamera)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  autoRotateCamera ? 'bg-cyan-500' : 'bg-slate-700'
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
        <div className="rounded-xl border border-precursor-border bg-precursor-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Download className="h-5 w-5 text-emerald-400" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
              Data Export & Integration Schema
            </h3>
          </div>

          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Download client demonstration telemetry runs matching the schema agreed with the Python backend daemon.
            When the backend is active, these buttons trigger live downloads from <code className="font-mono text-cyan-300">/api/export/csv</code> and <code className="font-mono text-cyan-300">/api/export/json</code>.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExportDemoCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all"
            >
              <Download className="h-4 w-4" />
              <span>Export Sample CSV Telemetry</span>
            </button>

            <button
              type="button"
              onClick={handleExportDemoJson}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-400 hover:bg-cyan-500/20 transition-all"
            >
              <Download className="h-4 w-4" />
              <span>Export Sample Structured JSON Run</span>
            </button>
          </div>
        </div>

        {/* Section 4: Data & Privacy Honesty Notice */}
        <div className="rounded-xl border border-precursor-border bg-precursor-card p-6">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-5 w-5 text-precursor-lavender" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
              Data Privacy & Local Storage Disclosure
            </h3>
          </div>

          <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
            <p>
              • <strong>Zero External Telemetry:</strong> All network metrics, topology layouts, and incident logs rendered in this app are deterministic local fixtures. No data is sent to external cloud servers.
            </p>
            <p>
              • <strong>Local Browser Persistence:</strong> Your UI preferences (theme, motion, density, 3D flags) are saved in your browser&apos;s <code className="font-mono text-slate-300">localStorage</code>. Clearing your browser data will restore default values.
            </p>
            <p>
              • <strong>Offline LLM Boundary:</strong> AI Copilot operates purely on local template heuristics in this frontend build. When backend integration is established, it interfaces solely with a local Ollama instance on your localhost.
            </p>
          </div>

          {/* Reset Actions with Confirmations */}
          <div className="mt-6 pt-6 border-t border-precursor-border flex flex-wrap items-center gap-4">
            {/* Reset Demo Preferences */}
            {confirmResetDemo ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-300 font-semibold">Confirm Reset Demo Flags?</span>
                <button
                  type="button"
                  onClick={() => {
                    resetDemoPreferences();
                    setConfirmResetDemo(false);
                  }}
                  className="rounded bg-amber-500 px-3 py-1 text-xs font-bold text-slate-950 hover:bg-amber-400"
                >
                  Yes, Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmResetDemo(false)}
                  className="rounded bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmResetDemo(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Demo Preferences</span>
              </button>
            )}

            {/* Restore Default Settings */}
            {confirmRestoreDefaults ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-300 font-semibold">Confirm Full Reset?</span>
                <button
                  type="button"
                  onClick={() => {
                    restoreDefaults();
                    setConfirmRestoreDefaults(false);
                  }}
                  className="rounded bg-rose-500 px-3 py-1 text-xs font-bold text-white hover:bg-rose-400"
                >
                  Yes, Restore All Defaults
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRestoreDefaults(false)}
                  className="rounded bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmRestoreDefaults(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Restore Default Settings</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

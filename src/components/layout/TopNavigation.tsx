import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Globe2,
  Activity,
  Zap,
  AlertOctagon,
  Bot,
  FlaskConical,
  Server,
  Settings,
  Menu,
  X,
  Info,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { NetworkBrandMark } from '@/components/ui/NetworkBrandMark';
import { ConnectionStatus } from '@/components/status/ConnectionStatus';
import { ReliabilityStatusBadge } from '@/components/status/ReliabilityStatusBadge';
import { useAppStore } from '@/stores/useAppStore';
import { useSettingsStore } from '@/stores/useSettingsStore';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { name: 'Network World', path: '/', icon: Globe2 },
  { name: 'Telemetry', path: '/telemetry', icon: Activity },
  { name: 'Predictions', path: '/predictions', icon: Zap },
  { name: 'Incidents', path: '/incidents', icon: AlertOctagon },
  { name: 'Copilot', path: '/copilot', icon: Bot },
  { name: 'Simulation Lab', path: '/simulation', icon: FlaskConical },
  { name: 'System Status', path: '/status', icon: Server },
];

export const TopNavigation: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoTooltipOpen, setDemoTooltipOpen] = useState(false);
  const { connectionState, gateState } = useAppStore();
  const { demoMode } = useSettingsStore();

  // Derive system health chip from reliability gate state
  const healthLabel = gateState === 'PREDICT' ? 'Optimal' : gateState === 'DEGRADED' ? 'Degraded' : 'Critical';
  const HealthIcon = gateState === 'PREDICT' ? CheckCircle2 : gateState === 'DEGRADED' ? AlertTriangle : ShieldAlert;
  const healthColors =
    gateState === 'PREDICT'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
      : gateState === 'DEGRADED'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
      : 'border-rose-500/30 bg-rose-500/10 text-rose-400';

  return (
    <header className="sticky top-0 z-50 border-b border-precursor-border bg-precursor-navy/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <NavLink
            to="/"
            className="group flex items-center gap-2.5 transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-precursor-purple rounded-lg"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-precursor-border-active bg-precursor-surface p-1 shadow-glow-purple/20">
              <NetworkBrandMark size={24} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-base font-extrabold tracking-wider text-white">
                  PRECURSOR
                </span>
              </div>
              <p className="hidden text-[10px] font-medium tracking-tight text-slate-400 sm:block">
                Reliability-Gated Network Intelligence
              </p>
            </div>
          </NavLink>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1 xl:flex" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-precursor-purple ${
                    isActive
                      ? 'border border-precursor-purple/40 bg-precursor-violet/60 text-white shadow-glow-purple/20'
                      : 'text-slate-400 hover:bg-precursor-surface/60 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Right Status Indicators & Quick Actions */}
        <div className="hidden items-center gap-2 lg:flex">
          {/* Demo Mode Chip with Explanatory Tooltip */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDemoTooltipOpen(!demoTooltipOpen)}
              onMouseEnter={() => setDemoTooltipOpen(true)}
              onMouseLeave={() => setDemoTooltipOpen(false)}
              className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 font-mono text-[10px] font-bold text-cyan-400 hover:bg-cyan-500/20 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
              aria-label="Demonstration Mode Info"
            >
              <Info className="h-3 w-3" />
              <span>DEMO FIXTURES</span>
            </button>

            {demoTooltipOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-precursor-border bg-precursor-card p-3 shadow-2xl z-50 text-[11px] text-slate-300 leading-relaxed">
                <div className="font-semibold text-white mb-1">Demonstration Mode Active</div>
                <p className="text-slate-400">
                  Using local deterministic fixtures ({demoMode.replace('_', ' ')}). No real network hardware or external backend connected.
                </p>
              </div>
            )}
          </div>

          {/* System Health Chip */}
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] font-bold ${healthColors}`}
            title={`System Health: ${healthLabel}`}
          >
            <HealthIcon className="h-3 w-3" />
            <span>{healthLabel.toUpperCase()}</span>
          </span>

          {/* Reliability Gate Badge */}
          <ReliabilityStatusBadge state={gateState} />

          {/* Connection Status Badge */}
          <ConnectionStatus state={connectionState} />

          {/* Quick Settings Icon Button */}
          <NavLink
            to="/settings"
            title="Settings & Preferences"
            className={({ isActive }) =>
              `flex h-8 w-8 items-center justify-center rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-precursor-purple ${
                isActive
                  ? 'border-precursor-purple bg-precursor-purple/20 text-white'
                  : 'border-precursor-border bg-precursor-surface/60 text-slate-400 hover:text-white hover:bg-precursor-surface'
              }`
            }
          >
            <Settings className="h-4 w-4" />
          </NavLink>
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center gap-2 xl:hidden">
          <NavLink
            to="/settings"
            className="rounded-lg border border-precursor-border bg-precursor-surface p-2 text-slate-400 hover:text-white"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </NavLink>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg border border-precursor-border bg-precursor-surface p-2 text-slate-400 hover:text-white"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-precursor-border bg-precursor-card px-4 py-4 xl:hidden">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                      isActive
                        ? 'border border-precursor-border-active bg-precursor-violet/40 text-white'
                        : 'text-slate-400 hover:bg-precursor-surface/60 hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
            <NavLink
              to="/settings"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `inline-flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                  isActive
                    ? 'border border-precursor-border-active bg-precursor-violet/40 text-white'
                    : 'text-slate-400 hover:bg-precursor-surface/60 hover:text-white'
                }`
              }
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </NavLink>
          </nav>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-precursor-border pt-4">
            <span className={`inline-flex items-center gap-1 rounded border px-2 py-1 font-mono text-[10px] font-bold ${healthColors}`}>
              <HealthIcon className="h-3 w-3" />
              <span>{healthLabel.toUpperCase()}</span>
            </span>
            <ReliabilityStatusBadge state={gateState} />
            <ConnectionStatus state={connectionState} />
          </div>
        </div>
      )}
    </header>
  );
};

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
  Menu,
  X,
} from 'lucide-react';
import { NetworkBrandMark } from '@/components/ui/NetworkBrandMark';
import { ConnectionStatus } from '@/components/status/ConnectionStatus';
import { ReliabilityStatusBadge } from '@/components/status/ReliabilityStatusBadge';
import { useAppStore } from '@/stores/useAppStore';

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
  const { connectionState, gateState } = useAppStore();

  return (
    <header className="sticky top-0 z-50 border-b border-precursor-border bg-precursor-navy/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <NavLink to="/" className="group flex items-center gap-3 transition-transform hover:scale-[1.02]">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-precursor-border-active bg-precursor-surface p-1 shadow-glow-purple/20">
              <NetworkBrandMark size={24} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-lg font-extrabold tracking-wider text-white">
                  PRECURSOR
                </span>
                <span className="rounded bg-precursor-purple/20 px-1 py-0.2 font-mono text-[9px] font-bold text-precursor-purple">
                  v0.1
                </span>
              </div>
              <p className="hidden text-[10px] font-medium tracking-tight text-slate-400 sm:block">
                Reliability-Gated Network Intelligence
              </p>
            </div>
          </NavLink>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    isActive
                      ? 'border border-precursor-border-active bg-precursor-violet/40 text-white shadow-glow-purple/10'
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

        {/* Right Status Indicators */}
        <div className="hidden items-center gap-2.5 sm:flex">
          <ReliabilityStatusBadge state={gateState} />
          <ConnectionStatus state={connectionState} />
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center gap-2 lg:hidden">
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
        <div className="border-b border-precursor-border bg-precursor-card px-4 py-4 lg:hidden">
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
          </nav>
          <div className="mt-4 flex flex-col gap-2 border-t border-precursor-border pt-4 sm:hidden">
            <ReliabilityStatusBadge state={gateState} />
            <ConnectionStatus state={connectionState} />
          </div>
        </div>
      )}
    </header>
  );
};

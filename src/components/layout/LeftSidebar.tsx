import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Globe2,
  Activity,
  Zap,
  AlertOctagon,
  Bot,
  FlaskConical,
  History,
  X
} from 'lucide-react';
import { NetworkBrandMark } from '@/components/ui/NetworkBrandMark';
import { LiveSystemStatusPanel } from './LiveSystemStatusPanel';

interface LeftSidebarProps {
  onCloseMobile?: () => void;
}

interface NavDestination {
  name: string;
  path: string;
  icon: React.ElementType;
}

// Primary operations destinations
const primaryDestinations: NavDestination[] = [
  { name: 'Network World', path: '/', icon: Globe2 },
  { name: 'Telemetry', path: '/telemetry', icon: Activity },
  { name: 'Predictions', path: '/predictions', icon: Zap },
  { name: 'Incidents', path: '/incidents', icon: AlertOctagon },
  { name: 'History', path: '/history', icon: History },
  { name: 'Copilot', path: '/copilot', icon: Bot },
];

// Utility and secondary destinations
const utilityDestinations: NavDestination[] = [
  { name: 'Simulation Lab', path: '/simulation', icon: FlaskConical },
];

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ onCloseMobile }) => {
  return (
    <aside className="flex h-screen w-64 flex-col border-r border-[#E3E8F0] bg-white text-[#202938]">
      {/* Top Branding Section: Prominent PRECURSOR Wordmark */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#E3E8F0] px-4">
        <NavLink
          to="/"
          onClick={onCloseMobile}
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90 focus:outline-none"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5267D8] text-white shadow-sm">
            <NetworkBrandMark size={20} />
          </div>
          <div>
            <span className="font-mono text-base font-extrabold tracking-wider text-[#202938]">
              PRECURSOR
            </span>
            <p className="text-[10px] font-medium tracking-tight text-[#687386]">
              Network Intelligence
            </p>
          </div>
        </NavLink>

        {/* Mobile close button */}
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1 text-[#687386] hover:bg-slate-100 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Middle Navigation Section */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Primary Operations Destinations */}
        <div>
          <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
            Operations
          </div>
          <nav className="space-y-1">
            {primaryDestinations.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-[#EEF2FF] text-[#5267D8] shadow-sm'
                        : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#202938]'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Secondary Utility Destinations */}
        <div>
          <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
            Lab & Configuration
          </div>
          <nav className="space-y-1">
            {utilityDestinations.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-[#EEF2FF] text-[#5267D8] shadow-sm'
                        : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#202938]'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Persistent Left-Bottom Live System Status Panel */}
      <div className="shrink-0">
        <LiveSystemStatusPanel />
      </div>
    </aside>
  );
};

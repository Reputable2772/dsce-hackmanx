import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { LeftSidebar } from '@/components/layout/LeftSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { useAppStore } from '@/stores/useAppStore';

export const AppShell: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Mount live health polling against backend service
    const stopPolling = useAppStore.getState().startLivePolling(4000);
    return () => {
      stopPolling();
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-[#F6F8FB] text-[#202938]">
      {/* Desktop Persistent Left Sidebar */}
      <div className="hidden lg:flex shrink-0">
        <LeftSidebar />
      </div>

      {/* Mobile Drawer (Accessible overlay & slide-in) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Slide-in sidebar */}
          <div className="relative flex w-64 flex-col bg-white shadow-xl z-10">
            <LeftSidebar onCloseMobile={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Right Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header Bar */}
        <TopHeader onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>

        {/* Streamlined Operational Footer */}
        <footer className="border-t border-[#E3E8F0] bg-white py-2.5 px-4 text-center text-xs text-[#687386]">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 sm:flex-row sm:px-4">
            <p className="font-mono text-[11px] text-[#687386]">
              <span className="font-bold text-[#202938]">PRECURSOR</span> — Reliability-Gated Network Operations
            </p>
            <div className="flex items-center gap-2 font-mono text-[11px] text-[#687386]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Air-Gapped Copilot • Grounded Verification Runtime</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

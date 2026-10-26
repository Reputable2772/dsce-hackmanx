import React, { useState } from 'react';
import { Bot, Scale } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { CopilotWorkspace } from './components/CopilotWorkspace';
import { ClaimVerificationSection } from './components/ClaimVerificationSection';

export const CopilotPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'workspace' | 'verifier'>('workspace');

  return (
    <PageContainer
      title="Offline AI Copilot & Numerical Claim Verifier"
      subtitle="Deterministic offline troubleshooting guidance grounded in telemetry evidence, coupled with independent claim-to-metric verification."
    >
      <div className="space-y-6">
        {/* Sub-tab Navigation */}
        <div className="flex rounded-xl border border-white/[0.08] bg-precursor-card-glass p-1.5 backdrop-blur-xl shadow-glass-panel">
          <button
            onClick={() => setActiveTab('workspace')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-mono font-bold transition ${
              activeTab === 'workspace'
                ? 'bg-precursor-purple text-white shadow-glow-purple/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="h-4 w-4" />
            <span>Investigation Workspace</span>
          </button>

          <button
            onClick={() => setActiveTab('verifier')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-mono font-bold transition ${
              activeTab === 'verifier'
                ? 'bg-precursor-cyan text-navy-950 font-black shadow-glow-cyan/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale className="h-4 w-4" />
            <span>Numerical Claim Verifier</span>
            <span className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
              activeTab === 'verifier' ? 'bg-navy-900/40 text-navy-950' : 'bg-cyan-900/40 text-cyan-300'
            }`}>
              VERIFIED / CONTRADICTED
            </span>
          </button>
        </div>

        {/* Tab 1: Copilot Workspace */}
        {activeTab === 'workspace' && <CopilotWorkspace />}

        {/* Tab 2: Numerical Claim Verifier */}
        {activeTab === 'verifier' && <ClaimVerificationSection />}
      </div>
    </PageContainer>
  );
};

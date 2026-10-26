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
        <div className="flex rounded-xl border border-violet-900/40 bg-navy-900/60 p-1.5 backdrop-blur-md">
          <button
            onClick={() => setActiveTab('workspace')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-mono font-bold transition ${
              activeTab === 'workspace'
                ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(155,123,255,0.25)]'
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
                ? 'bg-cyan-500 text-navy-950 shadow-[0_0_12px_rgba(72,221,245,0.25)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale className="h-4 w-4" />
            <span>Numerical Claim Verifier</span>
            <span className="rounded bg-cyan-900/60 text-cyan-200 px-1.5 py-0.2 text-[9px]">
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

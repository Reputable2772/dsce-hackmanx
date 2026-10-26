import React, { useState } from 'react';
import { Bot, Scale, BookOpen } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { CopilotWorkspace } from './components/CopilotWorkspace';
import { ClaimVerificationSection } from './components/ClaimVerificationSection';
import { RunbookLibrarySection } from './components/RunbookLibrarySection';

export const CopilotPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'workspace' | 'verifier' | 'runbooks'>('workspace');

  return (
    <PageContainer
      title="Offline AI Copilot & Numerical Claim Verifier"
      subtitle="Deterministic offline troubleshooting guidance grounded in telemetry evidence, coupled with independent claim-to-metric verification."
    >
      <div className="space-y-6 text-[#202938]">
        {/* Sub-tab Navigation */}
        <div className="flex rounded-xl border border-[#E3E8F0] bg-white p-1.5 shadow-sm">
          <button
            onClick={() => setActiveTab('workspace')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-mono font-bold transition ${
              activeTab === 'workspace'
                ? 'bg-[#5267D8] text-white shadow-xs'
                : 'text-[#687386] hover:text-[#202938]'
            }`}
          >
            <Bot className="h-4 w-4" />
            <span>Investigation Workspace</span>
          </button>

          <button
            onClick={() => setActiveTab('verifier')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-mono font-bold transition ${
              activeTab === 'verifier'
                ? 'bg-[#5267D8] text-white shadow-xs'
                : 'text-[#687386] hover:text-[#202938]'
            }`}
          >
            <Scale className="h-4 w-4" />
            <span>Numerical Claim Verifier</span>
            <span className={`rounded px-1.5 py-0.2 text-[9px] font-bold border ${
              activeTab === 'verifier' 
                ? 'bg-white/20 text-white border-white/30' 
                : 'bg-teal-50 text-teal-700 border-teal-200'
            }`}>
              VERIFIED / CONTRADICTED
            </span>
          </button>

          <button
            onClick={() => setActiveTab('runbooks')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-mono font-bold transition ${
              activeTab === 'runbooks'
                ? 'bg-[#5267D8] text-white shadow-xs'
                : 'text-[#687386] hover:text-[#202938]'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Runbook Library</span>
            <span className={`rounded px-1.5 py-0.2 text-[9px] font-bold border ${
              activeTab === 'runbooks'
                ? 'bg-white/20 text-white border-white/30'
                : 'bg-indigo-50 text-[#5267D8] border-indigo-200'
            }`}>
              9 RUNBOOKS
            </span>
          </button>
        </div>

        {/* Tab 1: Copilot Workspace */}
        {activeTab === 'workspace' && <CopilotWorkspace />}

        {/* Tab 2: Numerical Claim Verifier */}
        {activeTab === 'verifier' && <ClaimVerificationSection />}

        {/* Tab 3: Runbook Library */}
        {activeTab === 'runbooks' && <RunbookLibrarySection />}
      </div>
    </PageContainer>
  );
};

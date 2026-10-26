import React from 'react';
import { Bot } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { EmptyState } from '@/components/ui/EmptyState';

export const CopilotPage: React.FC = () => {
  return (
    <PageContainer
      title="Offline AI Copilot & Runbooks"
      subtitle="Local Ollama LLM integration paired with automated Numerical Claim Verification."
    >
      <EmptyState
        icon={Bot}
        title="Local Ollama Bridge Disconnected"
        description="The local AI copilot and numerical claim verifier are unconfigured in Phase 1. Once connected, diagnostic commands and hallucination-guarded explanations will be active."
        badgeText="OLLAMA AI OFFLINE"
      />
    </PageContainer>
  );
};

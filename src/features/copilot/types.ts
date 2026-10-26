export type ClaimStatus = 'VERIFIED' | 'CONTRADICTED' | 'UNVERIFIED';

export interface ClaimVerificationRecord {
  id: string;
  claimText: string;
  metricId: string;
  claimedValue: string;
  actualValue: string | null;
  status: ClaimStatus;
  explanation: string;
  limitations: string;
  evidenceTimestamp: string;
}

export interface CopilotEvidenceItem {
  label: string;
  value: string;
  context: string;
}

export interface CopilotHypothesis {
  title: string;
  detail: string;
  confidence: 'High' | 'Moderate' | 'Low';
}

export interface CopilotDiagnosticCommand {
  step: number;
  command: string;
  explanation: string;
}

export interface CopilotRunbookRef {
  id: string;
  title: string;
  source: string;
  sampleOnly: true;
}

export interface CopilotStructuredResponse {
  summary: string;
  observedEvidence: CopilotEvidenceItem[];
  hypotheses: CopilotHypothesis[];
  diagnosticSteps: CopilotDiagnosticCommand[];
  riskAndImpact: string;
  verificationSteps: string[];
  rollbackConsiderations: string;
  runbookReferences: CopilotRunbookRef[];
  claims: ClaimVerificationRecord[];
  modelUsed: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'copilot';
  timestamp: string;
  text: string;
  structuredResponse?: CopilotStructuredResponse;
  isDemo: boolean;
}

export interface SuggestedPrompt {
  id: string;
  title: string;
  category: 'Investigation' | 'Remediation' | 'Verification' | 'Drift';
  prompt: string;
  incidentId?: string;
}

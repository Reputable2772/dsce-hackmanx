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

export type HypothesisStatus = 'VALIDATED' | 'REFUTED' | 'UNVERIFIED';
export type AssumptionStatus = 'VALIDATED' | 'VIOLATED' | 'UNTESTABLE';

export interface AuditedAssumption {
  id?: string;
  statement: string;
  metric_id?: string | null;
  operator?: string | null;
  expected_value?: number | null;
  actual_value?: number | null;
  status: AssumptionStatus;
  explanation?: string;
}

export interface VerifiedHypothesis {
  id: string;
  statement: string;
  confidence: number;
  rationale?: string;
  supporting_assumptions?: string[];
  status: HypothesisStatus;
  entailment_explanation?: string;
}

export interface CopilotHypothesis {
  title: string;
  detail: string;
  confidence: 'High' | 'Moderate' | 'Low';
  id?: string;
  status?: HypothesisStatus;
  supporting_assumptions?: string[];
  entailment_explanation?: string;
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
  assumptions?: AuditedAssumption[];
  verifiedHypotheses?: VerifiedHypothesis[];
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

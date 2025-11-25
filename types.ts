export enum JobStatus {
  DETECTED = 'DETECTED',
  REPRODUCING = 'REPRODUCING',
  ANALYZING = 'ANALYZING',
  PATCHING = 'PATCHING',
  VERIFYING = 'VERIFYING',
  PR_READY = 'PR_READY',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export interface AnalysisResult {
  rootCause: string;
  confidence: number;
  suspectedFile: string;
  evidence: string;
}

export interface PatchProposal {
  explanation: string;
  file: string;
  diff: string; // Simplified unified diff string
  verificationTest: string;
}

export interface Job {
  id: string;
  repoName: string;
  branch: string;
  commitSha: string;
  failureStep: string;
  status: JobStatus;
  startedAt: string;
  logs: LogEntry[];
  analysis?: AnalysisResult;
  patch?: PatchProposal;
  prLink?: string;
}

export interface AgentConfig {
  autoApproveSafe: boolean;
  excludedFiles: string[];
  maxThinkingBudget: number;
}
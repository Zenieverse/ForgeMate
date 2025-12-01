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
  recurringPattern?: string;
  architecturalSuggestion?: string;
  flakyTestDetected?: boolean;
  dependencyStatus?: string;
  regressionRisk?: string;
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
  blockedFilePatterns: string[];
  requireApprovalFor: {
      infraChanges: boolean;
      dependencyUpdates: boolean;
      largeDiffs: boolean; // > 50 lines
      deletedFiles: boolean;
  };
  sensitivePatterns: string[]; // Regex strings for secret detection
}

export interface AppSettings {
  model: string;
  budget: number;
  notifications: {
    slack: boolean;
    email: boolean;
    prComments: boolean;
  };
  sandboxImage: string;
}
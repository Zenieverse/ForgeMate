import * as React from 'react';
import { Job, JobStatus, LogEntry, AppSettings, AgentConfig } from '../types';
import LogViewer from './LogViewer';
import DiffViewer from './DiffViewer';
import { analyzeFailure, generatePatch } from '../services/geminiService';
import { CheckCircle2, Circle, Loader2, GitPullRequest, AlertCircle, FileCode, Search, History, Box, ShieldAlert, TrendingUp, Shuffle } from 'lucide-react';

interface JobDetailProps {
  job: Job;
  onUpdateJob: (updatedJob: Job) => void;
  onBack: () => void;
  settings: AppSettings;
  config: AgentConfig;
}

const steps = [
  { status: JobStatus.DETECTED, label: 'Failure Detected' },
  { status: JobStatus.REPRODUCING, label: 'Sandbox Reproduction' },
  { status: JobStatus.ANALYZING, label: 'Root Cause Analysis' },
  { status: JobStatus.PATCHING, label: 'Generate Patch' },
  { status: JobStatus.VERIFYING, label: 'Verify Fix' },
  { status: JobStatus.PR_READY, label: 'Open PR' },
];

const JobDetail: React.FC<JobDetailProps> = ({ job, onUpdateJob, onBack, settings, config }) => {
  const [activeTab, setActiveTab] = React.useState<'logs' | 'analysis' | 'patch'>('logs');
  const [processing, setProcessing] = React.useState(false);

  // Simulation loop
  React.useEffect(() => {
    if (job.status === JobStatus.COMPLETED || job.status === JobStatus.PR_READY || job.status === JobStatus.FAILED) return;
    
    let isMounted = true;

    // Simulate progression if not stuck/failed
    const processJob = async () => {
        if (!isMounted) return;
        setProcessing(true);

        // Track local logs to avoid closure staleness during async steps within one status
        let currentLogs = [...job.logs];

        const addLog = (msg: string, level: LogEntry['level'] = 'info') => {
            const newLog: LogEntry = {
                timestamp: new Date().toLocaleTimeString(),
                level,
                message: msg
            };
            currentLogs = [...currentLogs, newLog];
            onUpdateJob({
                ...job,
                logs: currentLogs
            });
        };

        // State Machine Logic
        if (job.status === JobStatus.DETECTED) {
            await new Promise(r => setTimeout(r, 1000));
            addLog('[Tool: Git] Cloning repository at commit ' + job.commitSha.substring(0,7) + '...', 'info');
            await new Promise(r => setTimeout(r, 1000));
            addLog(`[Tool: Docker] Creating isolated sandbox using ${settings.sandboxImage}...`, 'info');
            await new Promise(r => setTimeout(r, 800));
            addLog('[Tool: Docker] Sandbox ready. ID: container-xyz-123', 'info');
            onUpdateJob({ ...job, logs: currentLogs, status: JobStatus.REPRODUCING });
        } 
        else if (job.status === JobStatus.REPRODUCING) {
            await new Promise(r => setTimeout(r, 1500));
            addLog(`[Tool: Shell] Executing failing step: ${job.failureStep}`, 'info');
            await new Promise(r => setTimeout(r, 1500));
            addLog('stderr: TypeError: Cannot read properties of undefined (reading "amount")', 'error');
            addLog('Exit code: 1', 'error');
            addLog('Failure reproduced successfully in sandbox.', 'success');
            onUpdateJob({ ...job, logs: currentLogs, status: JobStatus.ANALYZING });
        }
        else if (job.status === JobStatus.ANALYZING) {
            if (!job.analysis) {
                addLog(`Sending logs and repo context to ${settings.model} for reasoning...`, 'info');
                
                await new Promise(r => setTimeout(r, 800));
                addLog('[Analysis] Querying historical run database for recurring patterns...', 'info');
                
                await new Promise(r => setTimeout(r, 800));
                addLog('[Tool: DepCheck] Scanning dependency tree for CVEs and staleness...', 'info');

                await new Promise(r => setTimeout(r, 800));
                addLog('[Analysis] Running statistical flakiness detector (Bayesian)...', 'info');

                await new Promise(r => setTimeout(r, 800));
                addLog('[Analysis] Evaluating architectural coherence and code coupling...', 'info');

                await new Promise(r => setTimeout(r, 800));
                addLog('[Analysis] Calculating regression prediction score based on file coupling...', 'info');
                
                // Simulate log content for analysis
                const logContent = currentLogs.map(l => l.message).join('\n');
                const analysis = await analyzeFailure(logContent, "TypeScript React Project, using Vite.", settings.model);
                
                // Append completion log
                const completionLog = { timestamp: new Date().toLocaleTimeString(), level: 'success' as const, message: `Analysis Complete: ${analysis.rootCause}` };
                
                onUpdateJob({
                    ...job,
                    analysis: analysis,
                    logs: [...currentLogs, completionLog],
                    status: JobStatus.PATCHING
                });
            } else {
                 onUpdateJob({ ...job, status: JobStatus.PATCHING });
            }
        }
        else if (job.status === JobStatus.PATCHING) {
             if (job.analysis && !job.patch) {
                addLog(`[Tool: Analysis] Suspected file: ${job.analysis.suspectedFile}`, 'info');
                
                // Check Guardrails before generation (Basic Client-Side check, Agent also checks)
                const isBlocked = config.blockedFilePatterns.some(pattern => {
                    // Simple glob check simulation
                    if (pattern.startsWith('*')) return job.analysis?.suspectedFile.endsWith(pattern.slice(1));
                    return job.analysis?.suspectedFile.includes(pattern);
                });

                if (isBlocked) {
                    addLog(`[GUARDRAIL] Intervention: File ${job.analysis.suspectedFile} matches blocked pattern. Aborting patch.`, 'error');
                    onUpdateJob({ ...job, status: JobStatus.FAILED, logs: [...currentLogs, { timestamp: new Date().toLocaleTimeString(), level: 'error', message: 'Patch generation halted by Guardrails.' }] });
                    setProcessing(false);
                    return;
                }

                addLog('Generating minimal, safe patch...', 'info');
                
                // Simulate flaky test check during patch gen
                await new Promise(r => setTimeout(r, 600));
                if (job.analysis.flakyTestDetected) {
                    addLog('[Analysis] Flakiness detected. Injecting retry logic pattern...', 'warn');
                } else {
                    addLog('[Analysis] Verifying test determinism...', 'info');
                }

                // Mock code context for the prompt
                const mockCode = `
                function calculateTotal(items: any[]) {
                    return items.reduce((acc, item) => acc + item.price, 0);
                }
                `;
                // Pass config to service
                const patch = await generatePatch(job.analysis, mockCode, settings.model, settings.budget, config);
                
                // Append completion log
                const completionLog = { timestamp: new Date().toLocaleTimeString(), level: 'success' as const, message: `Patch generated.` };

                onUpdateJob({
                    ...job,
                    patch: patch,
                    logs: [...currentLogs, completionLog],
                    status: JobStatus.VERIFYING
                });
             } else {
                 onUpdateJob({ ...job, status: JobStatus.VERIFYING });
             }
        }
        else if (job.status === JobStatus.VERIFYING) {
            await new Promise(r => setTimeout(r, 1500));
            addLog(`[Tool: Filesystem] Applying patch to ${job.patch?.file}...`, 'info');
            await new Promise(r => setTimeout(r, 1000));
            addLog('[Tool: Filesystem] Creating verification test file...', 'info');
            addLog(`[Tool: Shell] Running: npm test -- ${job.patch?.file}`, 'info');
            await new Promise(r => setTimeout(r, 2000));
            addLog('Tests passed: 1 passed, 0 failed.', 'success');
            onUpdateJob({ ...job, logs: currentLogs, status: JobStatus.PR_READY });
        }
        setProcessing(false);
    };

    processJob();
    return () => { isMounted = false; };
  }, [job.status, job.id]); // Re-run when status changes

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 font-sans">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
        <div>
          <button 
            onClick={onBack}
            className="text-slate-500 hover:text-white mb-2 text-sm flex items-center"
          >
            ← Back to Dashboard
          </button>
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white tracking-tight">{job.repoName}</h1>
            <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-mono text-slate-400 border border-slate-700">
              {job.commitSha.substring(0, 8)}
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1 flex items-center">
            <GitPullRequest size={14} className="mr-1"/> 
            {job.branch}
          </p>
        </div>
        <div className="flex items-center space-x-2">
            {job.status === JobStatus.PR_READY ? (
                <a href={job.prLink || '#'} target="_blank" rel="noreferrer" className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold flex items-center shadow-lg shadow-green-900/20 transition-all">
                    <CheckCircle2 className="mr-2" size={18} />
                    View Pull Request
                </a>
            ) : (
                <div className="flex items-center space-x-2 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
                    <Loader2 className="animate-spin text-blue-500" size={18} />
                    <span className="text-sm font-medium text-blue-400 animate-pulse">
                        Agent Active: {job.status.replace('_', ' ')}
                    </span>
                </div>
            )}
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="px-6 py-4 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 w-full h-0.5 bg-slate-800 -z-0"></div>
          {steps.map((step, idx) => {
            const isCompleted = steps.findIndex(s => s.status === job.status) > idx || job.status === JobStatus.PR_READY;
            const isCurrent = job.status === step.status;
            
            return (
              <div key={step.status} className="flex flex-col items-center relative z-10 bg-slate-950 px-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isCompleted ? 'bg-green-500 border-green-500 text-white' :
                  isCurrent ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-[0_0_15px_rgba(37,99,235,0.5)]' :
                  'bg-slate-900 border-slate-700 text-slate-600'
                }`}>
                  {isCompleted ? <CheckCircle2 size={16} /> : <Circle size={10} fill="currentColor" />}
                </div>
                <span className={`text-xs mt-2 font-medium ${
                  isCurrent ? 'text-blue-400' : isCompleted ? 'text-green-500' : 'text-slate-600'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Panel: Tabs & Content */}
        <div className="flex-1 flex flex-col border-r border-slate-800 bg-slate-900">
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'logs' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              Live Logs
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              disabled={!job.analysis}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'analysis' 
                    ? 'border-blue-500 text-white' 
                    : !job.analysis 
                        ? 'opacity-50 cursor-not-allowed text-slate-600' 
                        : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              Deep Analysis
            </button>
            <button
              onClick={() => setActiveTab('patch')}
              disabled={!job.patch}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'patch' 
                    ? 'border-blue-500 text-white' 
                    : !job.patch 
                        ? 'opacity-50 cursor-not-allowed text-slate-600' 
                        : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              Patch & Diff
            </button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto bg-slate-900">
            {activeTab === 'logs' && (
              <LogViewer logs={job.logs} title={`Agent Execution Log - ${job.id}`} />
            )}

            {activeTab === 'analysis' && job.analysis && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Primary Root Cause Card */}
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
                  <h3 className="text-sm uppercase tracking-wider text-slate-400 mb-2 flex items-center">
                    <Search className="mr-2" size={16} /> Primary Root Cause
                  </h3>
                  <p className="text-xl text-white font-medium leading-relaxed">
                    {job.analysis.rootCause}
                  </p>
                  
                  <div className="mt-6 p-4 bg-slate-950 rounded-lg border border-slate-800/50 font-mono text-sm text-red-300 overflow-x-auto">
                    {job.analysis.evidence}
                  </div>

                  <div className="mt-4 flex items-center space-x-6 text-sm">
                    <div className="flex items-center text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                      Confidence: <span className="text-white ml-1 font-bold">{(job.analysis.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center text-slate-400">
                      <FileCode size={14} className="mr-2 text-slate-500" />
                      Suspect: <span className="text-blue-400 ml-1 font-mono">{job.analysis.suspectedFile}</span>
                    </div>
                  </div>
                </div>

                {/* Advanced Insights Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Recurring Pattern */}
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                        <div className="flex items-center mb-2 text-purple-400">
                            <History size={16} className="mr-2" />
                            <h4 className="font-semibold text-sm">Recurring Pattern</h4>
                        </div>
                        <p className="text-sm text-slate-300">
                            {job.analysis.recurringPattern || "No historical patterns detected."}
                        </p>
                    </div>

                    {/* Architectural Suggestion */}
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                        <div className="flex items-center mb-2 text-indigo-400">
                            <Box size={16} className="mr-2" />
                            <h4 className="font-semibold text-sm">Architectural Insight</h4>
                        </div>
                        <p className="text-sm text-slate-300">
                            {job.analysis.architecturalSuggestion || "Structure appears sound."}
                        </p>
                    </div>

                    {/* Dependency Status */}
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                        <div className="flex items-center mb-2 text-orange-400">
                            <ShieldAlert size={16} className="mr-2" />
                            <h4 className="font-semibold text-sm">Dependency Health</h4>
                        </div>
                        <p className="text-sm text-slate-300">
                            {job.analysis.dependencyStatus || "Dependencies are stable."}
                        </p>
                    </div>

                    {/* Regression Risk */}
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                        <div className="flex items-center mb-2 text-cyan-400">
                            <TrendingUp size={16} className="mr-2" />
                            <h4 className="font-semibold text-sm">Regression Risk</h4>
                        </div>
                        <p className="text-sm text-slate-300">
                            {job.analysis.regressionRisk || "Calculating risk profile..."}
                        </p>
                    </div>
                </div>

                {/* Flaky Test Warning */}
                {job.analysis.flakyTestDetected && (
                    <div className="bg-yellow-900/20 border border-yellow-700/50 p-4 rounded-lg flex items-start">
                        <Shuffle className="text-yellow-500 mt-0.5 mr-3 shrink-0" size={18} />
                        <div>
                            <h4 className="text-yellow-500 font-semibold text-sm">Flaky Test Detected</h4>
                            <p className="text-yellow-200/70 text-sm mt-1">
                                This failure appears non-deterministic. The generated patch includes retry logic or isolation wrappers to mitigate this.
                            </p>
                        </div>
                    </div>
                )}
              </div>
            )}

            {activeTab === 'patch' && job.patch && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="bg-slate-800 p-5 rounded-lg border border-slate-700">
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">Agent Reasoning</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{job.patch.explanation}</p>
                 </div>

                 <DiffViewer diff={job.patch.diff} file={job.patch.file} />

                 <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                    <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
                        <span className="text-xs font-mono text-green-400">Verification Test</span>
                        <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">Generated</span>
                    </div>
                    <pre className="p-4 text-sm text-slate-300 font-mono overflow-x-auto">
                        {job.patch.verificationTest}
                    </pre>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
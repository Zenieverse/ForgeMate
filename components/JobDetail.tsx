import React, { useState, useEffect } from 'react';
import { Job, JobStatus, LogEntry } from '../types';
import LogViewer from './LogViewer';
import DiffViewer from './DiffViewer';
import { analyzeFailure, generatePatch } from '../services/geminiService';
import { CheckCircle2, Circle, Loader2, GitPullRequest, AlertCircle, FileCode, Search } from 'lucide-react';

interface JobDetailProps {
  job: Job;
  onUpdateJob: (updatedJob: Job) => void;
  onBack: () => void;
}

const steps = [
  { status: JobStatus.DETECTED, label: 'Failure Detected' },
  { status: JobStatus.REPRODUCING, label: 'Sandbox Reproduction' },
  { status: JobStatus.ANALYZING, label: 'Root Cause Analysis' },
  { status: JobStatus.PATCHING, label: 'Generate Patch' },
  { status: JobStatus.VERIFYING, label: 'Verify Fix' },
  { status: JobStatus.PR_READY, label: 'Open PR' },
];

const JobDetail: React.FC<JobDetailProps> = ({ job, onUpdateJob, onBack }) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'analysis' | 'patch'>('logs');
  const [processing, setProcessing] = useState(false);

  // Simulation loop
  useEffect(() => {
    if (job.status === JobStatus.COMPLETED || job.status === JobStatus.PR_READY) return;
    
    // Simulate progression if not stuck/failed
    const processJob = async () => {
        setProcessing(true);

        const addLog = (msg: string, level: LogEntry['level'] = 'info') => {
            const newLog: LogEntry = {
                timestamp: new Date().toLocaleTimeString(),
                level,
                message: msg
            };
            // Functional update to avoid closure staleness issues in simulation
            onUpdateJob({
                ...job,
                logs: [...job.logs, newLog]
            });
        };

        // State Machine Logic
        if (job.status === JobStatus.DETECTED) {
            await new Promise(r => setTimeout(r, 1000));
            addLog('[Tool: Git] Cloning repository at commit ' + job.commitSha.substring(0,7) + '...', 'info');
            await new Promise(r => setTimeout(r, 1000));
            addLog('[Tool: Docker] Creating isolated sandbox (Node.js 18-alpine)...', 'info');
            await new Promise(r => setTimeout(r, 800));
            addLog('[Tool: Docker] Sandbox ready. ID: container-xyz-123', 'info');
            onUpdateJob({ ...job, status: JobStatus.REPRODUCING });
        } 
        else if (job.status === JobStatus.REPRODUCING) {
            await new Promise(r => setTimeout(r, 1500));
            addLog(`[Tool: Shell] Executing failing step: ${job.failureStep}`, 'info');
            await new Promise(r => setTimeout(r, 1500));
            addLog('stderr: TypeError: Cannot read properties of undefined (reading "amount")', 'error');
            addLog('Exit code: 1', 'error');
            addLog('Failure reproduced successfully in sandbox.', 'success');
            onUpdateJob({ ...job, status: JobStatus.ANALYZING });
        }
        else if (job.status === JobStatus.ANALYZING) {
            if (!job.analysis) {
                addLog('Sending logs and repo context to Gemini 2.5 Flash for reasoning...', 'info');
                // Simulate log content for analysis
                const logContent = job.logs.map(l => l.message).join('\n');
                const analysis = await analyzeFailure(logContent, "TypeScript React Project, using Vite.");
                
                onUpdateJob({
                    ...job,
                    analysis: analysis,
                    logs: [...job.logs, 
                        { timestamp: new Date().toLocaleTimeString(), level: 'success', message: `Analysis Complete: ${analysis.rootCause}` }
                    ],
                    status: JobStatus.PATCHING
                });
            }
        }
        else if (job.status === JobStatus.PATCHING) {
             if (job.analysis && !job.patch) {
                addLog(`[Tool: Analysis] Suspected file: ${job.analysis.suspectedFile}`, 'info');
                addLog('Generating minimal, safe patch...', 'info');
                // Mock code context for the prompt
                const mockCode = `
                function calculateTotal(items: any[]) {
                    return items.reduce((acc, item) => acc + item.price, 0);
                }
                `;
                const patch = await generatePatch(job.analysis, mockCode);
                
                onUpdateJob({
                    ...job,
                    patch: patch,
                    logs: [...job.logs, 
                        { timestamp: new Date().toLocaleTimeString(), level: 'success', message: `Patch generated.` }
                    ],
                    status: JobStatus.VERIFYING
                });
             }
        }
        else if (job.status === JobStatus.VERIFYING) {
            await new Promise(r => setTimeout(r, 1500));
            addLog(`[Tool: Filesystem] Applying patch to ${job.patch?.file}...`, 'info');
            await new Promise(r => setTimeout(r, 1000));
            addLog('[Tool: Filesystem] Creating verification test file...', 'info');
            addLog(`[Tool: Shell] Running: npm test -- ${job.patch?.file}`, 'info');
            await new Promise(r => setTimeout(r, 1500));
            addLog('Test Suite: PASS', 'success');
            addLog('Fix verified in sandbox.', 'success');
            onUpdateJob({ ...job, status: JobStatus.PR_READY });
        }

        setProcessing(false);
    };

    // A simple debounce/check to prevent infinite loops in this mock
    const timer = setTimeout(() => {
        processJob();
    }, 1000);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.status]); 

  // Auto-switch tabs based on progress
  useEffect(() => {
    if (job.status === JobStatus.ANALYZING || job.status === JobStatus.PATCHING) {
        setActiveTab('analysis');
    } else if (job.status === JobStatus.PR_READY) {
        setActiveTab('patch');
    }
  }, [job.status]);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="h-16 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors">
            ← Back
          </button>
          <div>
            <h1 className="text-lg font-bold flex items-center">
              {job.repoName} <span className="mx-2 text-slate-600">/</span> #{job.id}
            </h1>
            <div className="flex items-center text-xs text-slate-400 space-x-3">
              <span className="flex items-center"><GitPullRequest size={12} className="mr-1"/> {job.branch}</span>
              <span className="flex items-center font-mono bg-slate-800 px-1.5 rounded">{job.commitSha.substring(0,7)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
            {job.status === JobStatus.PR_READY ? (
                <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center shadow-lg shadow-green-900/20">
                    <GitPullRequest size={16} className="mr-2" />
                    View Pull Request
                </button>
            ) : (
                <div className="flex items-center text-blue-400 bg-blue-400/10 px-3 py-1.5 rounded-full text-xs font-medium border border-blue-400/20">
                    <Loader2 size={14} className="animate-spin mr-2" />
                    ForgeMate Active
                </div>
            )}
        </div>
      </div>

      {/* Progress Pipeline */}
      <div className="bg-slate-950 border-b border-slate-800 py-6 px-8">
        <div className="flex items-center justify-between relative">
            {/* Connecting Line */}
            <div className="absolute left-0 top-1/2 w-full h-0.5 bg-slate-800 -z-0"></div>
            
            {steps.map((step, idx) => {
                const isCompleted = steps.findIndex(s => s.status === job.status) > idx || job.status === JobStatus.PR_READY;
                const isCurrent = step.status === job.status && job.status !== JobStatus.PR_READY;
                
                return (
                    <div key={step.status} className="relative z-10 flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${
                            isCompleted ? 'bg-green-500 border-green-500 text-slate-900' :
                            isCurrent ? 'bg-blue-600 border-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' :
                            'bg-slate-900 border-slate-700 text-slate-600'
                        }`}>
                            {isCompleted ? <CheckCircle2 size={16} /> : 
                             isCurrent ? <Loader2 size={16} className="animate-spin" /> :
                             <Circle size={12} />}
                        </div>
                        <span className={`mt-2 text-xs font-medium ${
                            isCompleted ? 'text-green-400' : 
                            isCurrent ? 'text-blue-400' : 
                            'text-slate-600'
                        }`}>{step.label}</span>
                    </div>
                );
            })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Detail Tabs/Content */}
        <div className="flex-1 flex flex-col min-w-0">
             {/* Tab Bar */}
            <div className="flex border-b border-slate-800 bg-slate-900/50">
                <button 
                    onClick={() => setActiveTab('logs')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'logs' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                >
                    Exec Logs
                </button>
                <button 
                    onClick={() => setActiveTab('analysis')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'analysis' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                >
                    AI Analysis
                </button>
                <button 
                    onClick={() => setActiveTab('patch')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'patch' ? 'border-blue-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                >
                    Patch & Diff
                </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto bg-slate-900">
                {activeTab === 'logs' && (
                    <LogViewer logs={job.logs} title="Sandbox Execution Logs" />
                )}

                {activeTab === 'analysis' && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        {!job.analysis ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                <Search size={48} className="mb-4 opacity-20" />
                                <p>Waiting for failure reproduction...</p>
                            </div>
                        ) : (
                            <>
                                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-lg">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-xl font-semibold text-white flex items-center">
                                            <AlertCircle className="mr-2 text-red-400" />
                                            Root Cause Analysis
                                        </h2>
                                        <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
                                            Confidence: {(job.analysis.confidence * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                    <p className="text-slate-300 text-lg leading-relaxed mb-6">
                                        {job.analysis.rootCause}
                                    </p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-900/50 p-4 rounded border border-slate-700">
                                            <span className="text-xs text-slate-500 uppercase font-bold block mb-2">Suspected File</span>
                                            <code className="text-blue-300">{job.analysis.suspectedFile}</code>
                                        </div>
                                        <div className="bg-slate-900/50 p-4 rounded border border-slate-700">
                                            <span className="text-xs text-slate-500 uppercase font-bold block mb-2">Evidence</span>
                                            <code className="text-red-300 text-xs break-all">{job.analysis.evidence}</code>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'patch' && (
                    <div className="max-w-5xl mx-auto space-y-6">
                         {!job.patch ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                <FileCode size={48} className="mb-4 opacity-20" />
                                <p>Waiting for analysis to complete...</p>
                            </div>
                        ) : (
                            <>
                                <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                                    <h3 className="text-lg font-medium text-white mb-2">Proposed Solution</h3>
                                    <p className="text-slate-300 mb-6">{job.patch.explanation}</p>
                                    
                                    <div className="mb-6">
                                        <DiffViewer diff={job.patch.diff} file={job.patch.file} />
                                    </div>

                                    <div className="bg-slate-950 p-4 rounded border border-slate-800">
                                        <h4 className="text-xs font-mono text-slate-500 uppercase mb-3">Verification Test</h4>
                                        <pre className="text-sm text-green-300 overflow-x-auto">
                                            <code>{job.patch.verificationTest}</code>
                                        </pre>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
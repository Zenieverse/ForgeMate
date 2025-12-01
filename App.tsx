import * as React from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import JobDetail from './components/JobDetail';
import Guardrails from './components/Guardrails';
import Settings from './components/Settings';
import { Job, JobStatus, LogEntry, AgentConfig, AppSettings } from './types';
import { Bot, MessageSquare } from 'lucide-react';
import { chatWithAgent } from './services/geminiService';

// Initial Mock Data
const INITIAL_JOBS: Job[] = [
  {
    id: 'job-1023',
    repoName: 'acme-inc/payments-service',
    branch: 'feat/stripe-integration',
    commitSha: 'a1b2c3d4',
    failureStep: 'run_tests',
    status: JobStatus.PR_READY,
    startedAt: '10:45 AM',
    logs: [
        {timestamp: '10:45:00', level: 'info', message: 'Workflow triggered by push to feat/stripe-integration'},
        {timestamp: '10:45:02', level: 'info', message: '[Tool: Git] Checking out code...'},
        {timestamp: '10:45:10', level: 'info', message: '[Tool: Docker] Dependencies installed.'},
        {timestamp: '10:45:15', level: 'error', message: 'TypeError: Cannot read properties of undefined (reading "amount") at PaymentService.ts:45'}
    ],
    analysis: {
        rootCause: 'Null pointer exception when handling empty API response payload.',
        confidence: 0.95,
        suspectedFile: 'src/services/PaymentService.ts',
        evidence: 'TypeError: Cannot read properties of undefined (reading "amount")',
        recurringPattern: 'Detected 2 similar failures in the last 24h. Likely a new API contract change.',
        architecturalSuggestion: 'Consider using a Zod schema validation layer for all external API responses.',
        dependencyStatus: 'All critical dependencies up to date.',
        regressionRisk: 'Low. Change is isolated to the payment adapter.',
        flakyTestDetected: false
    },
    patch: {
        file: 'src/services/PaymentService.ts',
        explanation: 'Added optional chaining and null check for response object.',
        diff: `@@ -42,7 +42,7 @@\n- const total = response.data.amount;\n+ const total = response?.data?.amount ?? 0;`,
        verificationTest: 'it("should handle empty response", () => { expect(calculateTotal(null)).toBe(0) });'
    }
  }
];

const INITIAL_CONFIG: AgentConfig = {
    autoApproveSafe: false,
    blockedFilePatterns: [
        '*.tf', 
        'Dockerfile', 
        '*.pem', 
        '.env*', 
        'k8s/*.yaml', 
        '.github/workflows/*'
    ],
    requireApprovalFor: {
        infraChanges: true,
        dependencyUpdates: true,
        largeDiffs: true,
        deletedFiles: true
    },
    sensitivePatterns: ['AWS_ACCESS_KEY', 'PRIVATE KEY']
};

const INITIAL_SETTINGS: AppSettings = {
    model: 'gemini-2.5-flash',
    budget: 20000,
    notifications: {
        slack: true,
        email: false,
        prComments: true
    },
    sandboxImage: 'node:18-alpine'
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = React.useState('dashboard');
  const [jobs, setJobs] = React.useState<Job[]>(INITIAL_JOBS);
  const [selectedJobId, setSelectedJobId] = React.useState<string | null>(null);
  const [config, setConfig] = React.useState<AgentConfig>(INITIAL_CONFIG);
  const [settings, setSettings] = React.useState<AppSettings>(INITIAL_SETTINGS);
  
  // Chat State
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [chatHistory, setChatHistory] = React.useState<{role: 'user' | 'model', content: string}[]>([]);
  const [chatInput, setChatInput] = React.useState('');
  const [chatLoading, setChatLoading] = React.useState(false);

  const handleSelectJob = (job: Job) => {
    setSelectedJobId(job.id);
    setCurrentView('job-detail');
  };

  const handleUpdateJob = (updatedJob: Job) => {
    setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
  };

  const handleCreateJob = () => {
    // In a real app, this would come from a webhook. Here we simulate a new failure.
    const newJob: Job = {
        id: `job-${Math.floor(Math.random() * 10000)}`,
        repoName: 'acme-inc/frontend-app',
        branch: 'fix/login-modal',
        commitSha: Math.random().toString(16).substr(2, 8),
        failureStep: 'integration_tests',
        status: JobStatus.DETECTED,
        startedAt: new Date().toLocaleTimeString(),
        logs: [
            { timestamp: new Date().toLocaleTimeString(), level: 'info', message: 'Detected pipeline failure on GitHub Actions.' }
        ]
    };
    setJobs(prev => [...prev, newJob]);
    handleSelectJob(newJob);
  };

  const getActiveJobContext = () => {
    // If a job is selected, use that.
    if (selectedJobId) return jobs.find(j => j.id === selectedJobId);
    // Otherwise try to find an active job, or just the most recent one.
    return jobs.find(j => j.status !== JobStatus.COMPLETED && j.status !== JobStatus.PR_READY) || jobs[0];
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newHistory = [...chatHistory, { role: 'user' as const, content: chatInput }];
    setChatHistory(newHistory);
    setChatInput('');
    setChatLoading(true);

    // Build context string
    const jobContext = getActiveJobContext();
    let contextString = "No active job context available.";
    if (jobContext) {
        contextString = `
          Current Job ID: ${jobContext.id}
          Repository: ${jobContext.repoName}
          Branch: ${jobContext.branch}
          Commit: ${jobContext.commitSha}
          Status: ${jobContext.status}
          Failure Step: ${jobContext.failureStep}
          Latest Log Message: ${jobContext.logs[jobContext.logs.length - 1]?.message}
          Analysis Root Cause: ${jobContext.analysis?.rootCause || 'Not yet analyzed'}
          Suggested File: ${jobContext.analysis?.suspectedFile || 'N/A'}
          Recurring Pattern: ${jobContext.analysis?.recurringPattern || 'None'}
          Architectural Suggestion: ${jobContext.analysis?.architecturalSuggestion || 'None'}
          Flaky Test Detected: ${jobContext.analysis?.flakyTestDetected ? 'Yes' : 'No'}
          Dependency Status: ${jobContext.analysis?.dependencyStatus || 'Unknown'}
          Regression Risk: ${jobContext.analysis?.regressionRisk || 'Unknown'}
        `;
    }

    const response = await chatWithAgent(newHistory, chatInput, contextString);
    
    setChatHistory([...newHistory, { role: 'model' as const, content: response }]);
    setChatLoading(false);
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
      <Sidebar currentView={currentView} setView={(view) => {
          setCurrentView(view);
          setSelectedJobId(null);
      }} />
      
      <main className="flex-1 relative">
        {currentView === 'dashboard' && (
          <Dashboard jobs={jobs} onSelectJob={handleSelectJob} onCreateJob={handleCreateJob} />
        )}
        
        {currentView === 'job-detail' && selectedJobId && (
          <JobDetail 
            job={jobs.find(j => j.id === selectedJobId)!} 
            onUpdateJob={handleUpdateJob}
            onBack={() => {
                setSelectedJobId(null);
                setCurrentView('dashboard');
            }}
            settings={settings}
            config={config}
          />
        )}
        
        {currentView === 'jobs' && <Dashboard jobs={jobs} onSelectJob={handleSelectJob} onCreateJob={handleCreateJob} />}
        
        {currentView === 'guardrails' && (
            <Guardrails config={config} onUpdateConfig={setConfig} />
        )}

        {currentView === 'settings' && (
            <Settings settings={settings} onUpdateSettings={setSettings} />
        )}
      </main>

      {/* Floating Chat Agent */}
      <div className={`fixed bottom-6 right-6 flex flex-col items-end transition-all z-50 ${isChatOpen ? 'w-96' : 'w-auto'}`}>
        {isChatOpen && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl mb-4 w-full h-[500px] flex flex-col overflow-hidden">
                <div className="bg-slate-900 p-3 border-b border-slate-700 flex justify-between items-center">
                    <span className="font-semibold text-sm flex items-center">
                        <Bot className="mr-2 w-4 h-4 text-blue-400" /> Agent Assistant
                    </span>
                    <button onClick={() => setIsChatOpen(false)} className="text-slate-500 hover:text-white">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
                    {chatHistory.length === 0 && (
                        <div className="text-center text-slate-500 text-sm mt-10 space-y-2">
                             <p>Ask me about active jobs, logs, or general debugging tips.</p>
                             {selectedJobId && <p className="text-xs text-blue-400">Context: {jobs.find(j => j.id === selectedJobId)?.repoName}</p>}
                        </div>
                    )}
                    {chatHistory.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                                msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'
                            }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {chatLoading && (
                        <div className="flex justify-start">
                            <div className="bg-slate-700 rounded-lg px-3 py-2 text-xs text-slate-400 animate-pulse">
                                Thinking...
                            </div>
                        </div>
                    )}
                </div>
                <form onSubmit={handleChatSubmit} className="p-3 border-t border-slate-700 bg-slate-900">
                    <input 
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-white"
                        placeholder="Ask ForgeMate..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                    />
                </form>
            </div>
        )}
        <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110 flex items-center justify-center"
        >
            <MessageSquare size={24} />
        </button>
      </div>
    </div>
  );
};

export default App;
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import JobDetail from './components/JobDetail';
import { Job, JobStatus, LogEntry } from './types';
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
        evidence: 'TypeError: Cannot read properties of undefined (reading "amount")'
    },
    patch: {
        file: 'src/services/PaymentService.ts',
        explanation: 'Added optional chaining and null check for response object.',
        diff: `@@ -42,7 +42,7 @@\n- const total = response.data.amount;\n+ const total = response?.data?.amount ?? 0;`,
        verificationTest: 'it("should handle empty response", () => { expect(calculateTotal(null)).toBe(0) });'
    }
  }
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [jobs, setJobs] = useState<Job[]>(INITIAL_JOBS);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  
  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

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

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newHistory = [...chatHistory, { role: 'user' as const, content: chatInput }];
    setChatHistory(newHistory);
    setChatInput('');
    setChatLoading(true);

    const response = await chatWithAgent(newHistory, chatInput);
    
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
          />
        )}
        
        {currentView === 'jobs' && <Dashboard jobs={jobs} onSelectJob={handleSelectJob} onCreateJob={handleCreateJob} />}
        
        {(currentView === 'settings' || currentView === 'guardrails') && (
            <div className="flex items-center justify-center h-full text-slate-500">
                <div className="text-center">
                    <Bot size={64} className="mx-auto mb-4 opacity-50" />
                    <h2 className="text-xl font-medium">Coming Soon</h2>
                    <p>Settings configuration not available in this demo.</p>
                </div>
            </div>
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
                        <p className="text-center text-slate-500 text-sm mt-10">
                            Ask me about active jobs, logs, or general debugging tips.
                        </p>
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
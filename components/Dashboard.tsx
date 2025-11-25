import React from 'react';
import { Job, JobStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Activity, CheckCircle, XCircle, Clock } from 'lucide-react';

interface DashboardProps {
  jobs: Job[];
  onSelectJob: (job: Job) => void;
  onCreateJob: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ jobs, onSelectJob, onCreateJob }) => {
  const stats = {
    total: jobs.length,
    active: jobs.filter(j => j.status !== JobStatus.COMPLETED && j.status !== JobStatus.PR_READY && j.status !== JobStatus.FAILED).length,
    fixed: jobs.filter(j => j.status === JobStatus.PR_READY).length,
    failed: jobs.filter(j => j.status === JobStatus.FAILED).length,
  };

  const chartData = [
    { name: 'Mon', success: 12, fail: 2 },
    { name: 'Tue', success: 15, fail: 1 },
    { name: 'Wed', success: 8, fail: 3 },
    { name: 'Thu', success: 18, fail: 1 },
    { name: 'Fri', success: 14, fail: 2 },
    { name: 'Sat', success: 5, fail: 0 },
    { name: 'Sun', success: 7, fail: 0 },
  ];

  return (
    <div className="p-8 space-y-8 h-full overflow-y-auto bg-slate-900 text-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Mission Control</h1>
          <p className="text-slate-400 mt-1">Monitoring active pipelines and agent health.</p>
        </div>
        <button 
          onClick={onCreateJob}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-medium flex items-center shadow-lg shadow-blue-900/20 transition-all hover:scale-105"
        >
          <Plus size={18} className="mr-2" />
          Simulate CI Failure
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700/50 relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Active Fixes</p>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white">{stats.active}</span>
            <span className="text-xs text-blue-400 flex items-center"><Activity size={12} className="mr-1"/> processing</span>
          </div>
        </div>
        
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700/50 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-green-500/10 rounded-bl-full -mr-4 -mt-4"></div>
          <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">PRs Opened</p>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white">{stats.fixed}</span>
            <span className="text-xs text-green-400 flex items-center"><CheckCircle size={12} className="mr-1"/> +12% this week</span>
          </div>
        </div>

        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700/50 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/10 rounded-bl-full -mr-4 -mt-4"></div>
          <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Avg Fix Time</p>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white">4m 12s</span>
            <span className="text-xs text-indigo-400 flex items-center"><Clock size={12} className="mr-1"/> -30s improvement</span>
          </div>
        </div>

        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700/50 relative overflow-hidden">
             <div className="absolute right-0 top-0 w-24 h-24 bg-red-500/10 rounded-bl-full -mr-4 -mt-4"></div>
          <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Unresolved</p>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white">{stats.failed}</span>
            <span className="text-xs text-red-400 flex items-center"><XCircle size={12} className="mr-1"/> manual triage needed</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-slate-800 p-6 rounded-xl border border-slate-700/50">
          <h2 className="text-lg font-bold text-white mb-6">Agent Performance History</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                    cursor={{fill: '#334155', opacity: 0.4}}
                />
                <Bar dataKey="success" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fail" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Jobs List */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700/50 flex flex-col">
          <h2 className="text-lg font-bold text-white mb-4">Recent Invocations</h2>
          <div className="flex-1 overflow-y-auto space-y-3">
            {jobs.slice().reverse().map(job => (
              <div 
                key={job.id}
                onClick={() => onSelectJob(job)}
                className="group p-3 rounded-lg bg-slate-900/50 border border-slate-700 hover:border-blue-500/50 hover:bg-slate-900 transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-sm text-slate-200 group-hover:text-blue-400 transition-colors">{job.repoName}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                        job.status === JobStatus.PR_READY ? 'bg-green-500/10 text-green-400' :
                        job.status === JobStatus.DETECTED ? 'bg-slate-500/10 text-slate-400' :
                        'bg-blue-500/10 text-blue-400'
                    }`}>
                        {job.status === JobStatus.PR_READY ? 'PR OPEN' : 'ACTIVE'}
                    </span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500 font-mono">
                    <span>{job.branch}</span>
                    <span>{job.startedAt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
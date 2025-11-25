import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface LogViewerProps {
  logs: LogEntry[];
  title?: string;
}

const LogViewer: React.FC<LogViewerProps> = ({ logs, title = "System Logs" }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div className="bg-slate-950 rounded-lg border border-slate-800 flex flex-col h-full overflow-hidden shadow-2xl">
      <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">{title}</span>
        <div className="flex space-x-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1">
        {logs.length === 0 && (
            <div className="text-slate-600 italic">Waiting for logs...</div>
        )}
        {logs.map((log, index) => (
          <div key={index} className="flex space-x-3 hover:bg-slate-900/50 p-0.5 rounded">
            <span className="text-slate-600 shrink-0 select-none w-20">{log.timestamp}</span>
            <span className={`break-all ${
              log.level === 'error' ? 'text-red-400' :
              log.level === 'warn' ? 'text-yellow-400' :
              log.level === 'success' ? 'text-green-400' :
              'text-slate-300'
            }`}>
              {log.level === 'error' && <span className="font-bold mr-2">[ERR]</span>}
              {log.level === 'success' && <span className="font-bold mr-2">[OK]</span>}
              {log.message}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default LogViewer;
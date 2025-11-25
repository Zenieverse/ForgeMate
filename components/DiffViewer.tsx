import React from 'react';

interface DiffViewerProps {
  diff: string;
  file: string;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ diff, file }) => {
  const lines = diff.split('\n');

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950 overflow-hidden font-mono text-sm">
      <div className="bg-slate-900 px-4 py-2 border-b border-slate-700 text-slate-300 font-medium flex justify-between">
        <span>{file}</span>
        <span className="text-xs text-slate-500 uppercase">Patch Preview</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => {
              const isAdd = line.startsWith('+');
              const isRem = line.startsWith('-');
              const isHeader = line.startsWith('@@');

              return (
                <tr key={idx} className={`${
                  isAdd ? 'bg-green-900/20' : isRem ? 'bg-red-900/20' : ''
                }`}>
                  <td className="w-8 px-2 text-right select-none text-slate-600 border-r border-slate-800 bg-slate-900/30">
                    {idx + 1}
                  </td>
                  <td className={`px-4 py-0.5 whitespace-pre ${
                    isAdd ? 'text-green-400' : isRem ? 'text-red-400' : isHeader ? 'text-purple-400' : 'text-slate-300'
                  }`}>
                    {line}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DiffViewer;
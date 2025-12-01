import * as React from 'react';
import { AgentConfig } from '../types';
import { Shield, Lock, FileWarning, AlertTriangle, Check, Plus, X, Save } from 'lucide-react';

interface GuardrailsProps {
  config: AgentConfig;
  onUpdateConfig: (config: AgentConfig) => void;
}

const Guardrails: React.FC<GuardrailsProps> = ({ config, onUpdateConfig }) => {
  const [localConfig, setLocalConfig] = React.useState<AgentConfig>(config);
  const [newPattern, setNewPattern] = React.useState('');

  const handleToggle = (category: keyof AgentConfig['requireApprovalFor']) => {
    setLocalConfig(prev => ({
      ...prev,
      requireApprovalFor: {
        ...prev.requireApprovalFor,
        [category]: !prev.requireApprovalFor[category]
      }
    }));
  };

  const handleAddPattern = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPattern && !localConfig.blockedFilePatterns.includes(newPattern)) {
      setLocalConfig(prev => ({
        ...prev,
        blockedFilePatterns: [...prev.blockedFilePatterns, newPattern]
      }));
      setNewPattern('');
    }
  };

  const handleRemovePattern = (pattern: string) => {
    setLocalConfig(prev => ({
      ...prev,
      blockedFilePatterns: prev.blockedFilePatterns.filter(p => p !== pattern)
    }));
  };

  const handleSave = () => {
    onUpdateConfig(localConfig);
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-900 text-slate-100">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center">
            <Shield className="mr-3 text-blue-500" size={32} />
            Safety Guardrails
          </h1>
          <p className="text-slate-400 mt-2 max-w-2xl">
            Configure the boundaries for the autonomous agent. These rules enforce what files ForgeMate can modify and when human intervention is explicitly required.
          </p>
        </div>
        <button 
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-bold flex items-center shadow-lg shadow-blue-900/20 transition-all hover:scale-105"
        >
          <Save size={18} className="mr-2" />
          Save Policy
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Intervention Rules */}
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <Lock className="mr-2 text-yellow-500" size={20} />
            Human Intervention Rules
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <div>
                <p className="font-semibold text-slate-200">Infrastructure Changes</p>
                <p className="text-sm text-slate-500">Terraform, Docker, K8s manifests</p>
              </div>
              <button 
                onClick={() => handleToggle('infraChanges')}
                className={`w-12 h-6 rounded-full transition-colors relative ${localConfig.requireApprovalFor.infraChanges ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${localConfig.requireApprovalFor.infraChanges ? 'translate-x-6' : ''}`}></div>
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <div>
                <p className="font-semibold text-slate-200">Dependency Upgrades</p>
                <p className="text-sm text-slate-500">package.json, go.mod, requirements.txt</p>
              </div>
              <button 
                onClick={() => handleToggle('dependencyUpdates')}
                className={`w-12 h-6 rounded-full transition-colors relative ${localConfig.requireApprovalFor.dependencyUpdates ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${localConfig.requireApprovalFor.dependencyUpdates ? 'translate-x-6' : ''}`}></div>
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <div>
                <p className="font-semibold text-slate-200">Large Patch Diffs</p>
                <p className="text-sm text-slate-500">Changes exceeding 50 lines of code</p>
              </div>
              <button 
                onClick={() => handleToggle('largeDiffs')}
                className={`w-12 h-6 rounded-full transition-colors relative ${localConfig.requireApprovalFor.largeDiffs ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${localConfig.requireApprovalFor.largeDiffs ? 'translate-x-6' : ''}`}></div>
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <div>
                <p className="font-semibold text-slate-200">File Deletions</p>
                <p className="text-sm text-slate-500">Prevent accidental removal of source files</p>
              </div>
              <button 
                onClick={() => handleToggle('deletedFiles')}
                className={`w-12 h-6 rounded-full transition-colors relative ${localConfig.requireApprovalFor.deletedFiles ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${localConfig.requireApprovalFor.deletedFiles ? 'translate-x-6' : ''}`}></div>
              </button>
            </div>
          </div>
        </div>

        {/* Blocked Files */}
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-6 flex flex-col">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <FileWarning className="mr-2 text-red-500" size={20} />
            Restricted File Patterns
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            The agent is strictly prohibited from modifying files matching these patterns.
          </p>
          
          <div className="flex-1 space-y-2 mb-4">
            {localConfig.blockedFilePatterns.map((pattern, idx) => (
              <div key={idx} className="flex justify-between items-center bg-slate-900/50 px-3 py-2 rounded border border-slate-700 group hover:border-red-500/50 transition-colors">
                <span className="font-mono text-sm text-slate-300">{pattern}</span>
                <button 
                  onClick={() => handleRemovePattern(pattern)}
                  className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddPattern} className="flex space-x-2 mt-auto pt-4 border-t border-slate-700">
            <input 
              type="text" 
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              placeholder="e.g. *.env, /secrets/*"
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
            <button 
              type="submit"
              disabled={!newPattern}
              className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white p-2 rounded transition-colors"
            >
              <Plus size={20} />
            </button>
          </form>
        </div>

        {/* Global Sensitivity */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700/50 p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <AlertTriangle className="mr-2 text-orange-500" size={20} />
                Secret Detection & Hard Stops
            </h2>
            <div className="bg-orange-900/10 border border-orange-700/30 rounded-lg p-4 text-orange-200/80 text-sm">
                <p className="mb-2 font-semibold text-orange-400">Active Hard-Stop Rules:</p>
                <ul className="list-disc list-inside space-y-1 font-mono text-xs opacity-90">
                    <li>AWS_ACCESS_KEY_ID detection (Regex)</li>
                    <li>Private Key block detection (Regex)</li>
                    <li>Database Connection String detection (Heuristic)</li>
                    <li>Modifications to .github/workflows/*.yml</li>
                </ul>
                <p className="mt-3 text-xs opacity-70">
                    * These rules are hardcoded into the agent's core safety kernel and cannot be disabled via UI.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Guardrails;
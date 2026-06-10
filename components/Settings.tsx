import * as React from 'react';
import { Bot, Cpu, Bell, Box, Save, Check } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onUpdateSettings }) => {
  const [localSettings, setLocalSettings] = React.useState<AppSettings>(settings);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  const handleChange = (updates: Partial<AppSettings>) => {
    setLocalSettings(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleNotificationChange = (key: keyof AppSettings['notifications']) => {
    setLocalSettings(prev => ({
        ...prev,
        notifications: {
            ...prev.notifications,
            [key]: !prev.notifications[key]
        }
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
    setHasChanges(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-900 text-slate-100">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center">
            <Cpu className="mr-3 text-blue-500" size={32} />
            Agent Settings
          </h1>
          <p className="text-slate-400 mt-2 max-w-2xl">
            Configure default settings for pipeline analysis, thinking budgets, and remote sandbox environments.
          </p>
        </div>
        <button 
          onClick={handleSave}
          disabled={!hasChanges}
          className={`px-6 py-2.5 rounded-lg font-bold flex items-center shadow-lg transition-all ${
            hasChanges 
              ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer hover:scale-105 shadow-blue-900/20' 
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
          }`}
        >
          {saveSuccess ? (
            <>
              <Check size={18} className="mr-2 text-green-400 animate-bounce" />
              Settings Saved
            </>
          ) : (
            <>
              <Save size={18} className="mr-2" />
              Save Settings
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Model Configuration */}
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <Bot className="mr-2 text-blue-400" size={20} />
            Model & Cognitive Configuration
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Core Gemini Model</label>
              <select 
                value={localSettings.model}
                onChange={(e) => handleChange({ model: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="gemini-3.5-flash">gemini-3.5-flash (Fast & Accurate - Recommended)</option>
                <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Advanced Reasoning)</option>
                <option value="gemini-2.5-flash">gemini-2.5-flash (Legacy Default)</option>
              </select>
              <p className="text-xs text-slate-500 mt-2">
                The AI model used for log analysis, failure root-cause reasoning, and programmatic patch creations.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Thinking Budget (Character Count/Tokens)</label>
              <input 
                type="number"
                value={localSettings.budget}
                onChange={(e) => handleChange({ budget: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                min="0"
                max="64000"
                step="1000"
              />
              <p className="text-xs text-slate-500 mt-2">
                Set thinking limits for complex multi-turn reasoning steps. Zero disables thinking budget controls.
              </p>
            </div>
          </div>
        </div>

        {/* Sandbox Settings */}
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <Box className="mr-2 text-indigo-400" size={20} />
            Sandbox Environment
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Docker Sandbox Image</label>
              <input 
                type="text"
                value={localSettings.sandboxImage}
                onChange={(e) => handleChange({ sandboxImage: e.target.value })}
                placeholder="e.g. node:18-alpine"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 font-mono"
              />
              <p className="text-xs text-slate-500 mt-2">
                Container image used when replicating workflow failures, running verification suites, and isolating patch testing.
              </p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700/50 p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <Bell className="mr-2 text-yellow-500" size={20} />
            Notifications & Integrations
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <div>
                <p className="font-semibold text-slate-200">Slack Alerts</p>
                <p className="text-sm text-slate-500">Post patch drafts to Slack channels</p>
              </div>
              <button 
                onClick={() => handleNotificationChange('slack')}
                className={`w-12 h-6 rounded-full transition-colors relative ${localSettings.notifications.slack ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${localSettings.notifications.slack ? 'translate-x-6' : ''}`}></div>
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <div>
                <p className="font-semibold text-slate-200">Email Digest</p>
                <p className="text-sm text-slate-500">Daily reports of automated patches</p>
              </div>
              <button 
                onClick={() => handleNotificationChange('email')}
                className={`w-12 h-6 rounded-full transition-colors relative ${localSettings.notifications.email ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${localSettings.notifications.email ? 'translate-x-6' : ''}`}></div>
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <div>
                <p className="font-semibold text-slate-200">Pull Request Comments</p>
                <p className="text-sm text-slate-500">Directly post comments onto GitHub PRs</p>
              </div>
              <button 
                onClick={() => handleNotificationChange('prComments')}
                className={`w-12 h-6 rounded-full transition-colors relative ${localSettings.notifications.prComments ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${localSettings.notifications.prComments ? 'translate-x-6' : ''}`}></div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

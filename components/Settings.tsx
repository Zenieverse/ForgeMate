
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
    onUpdateSettings(
import React, { createContext, useContext } from 'react';
import { SystemSettings, StatusConfigItem } from '../types/settings';
import { dataService } from '../services/dataService';
import { useAuth } from './AuthContext';
import { RequestStatus } from '../types/request';
import { useSyncedState } from '../hooks/useSyncedState';

interface SystemContextType {
  settings: SystemSettings;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  getStatusConfig: (status: RequestStatus) => StatusConfigItem;
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export const SystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [settings, setSettingsState] = useSyncedState<SystemSettings>(() => dataService.getSettings());

  const updateSettings = (newSettings: Partial<SystemSettings>) => {
    const updated = dataService.updateSettings(newSettings, currentUser);
    setSettingsState(updated);
  };

  const getStatusConfig = (status: RequestStatus): StatusConfigItem => {
    const found = settings?.statusConfigs?.find(s => s.key === status);
    if (found) return found;
    return {
      key: status,
      label: status.replace(/_/g, ' ').toUpperCase(),
      badgeBg: 'bg-slate-100 dark:bg-slate-800',
      badgeText: 'text-slate-700 dark:text-slate-300',
      badgeBorder: 'border-slate-300 dark:border-slate-700',
      description: status
    };
  };

  return (
    <SystemContext.Provider value={{ settings, updateSettings, getStatusConfig }}>
      {children}
    </SystemContext.Provider>
  );
};

export const useSystem = () => {
  const context = useContext(SystemContext);
  if (!context) {
    throw new Error('useSystem must be used within a SystemProvider');
  }
  return context;
};

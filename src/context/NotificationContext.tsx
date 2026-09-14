import React, { createContext, useContext, useState, useEffect } from 'react';
import { Notification } from '../types/notification';
import { dataService } from '../services/dataService';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  refreshNotifications: () => void;
  selectedEmailPreview: Notification['emailPreview'] | null;
  openEmailPreview: (preview: Notification['emailPreview']) => void;
  closeEmailPreview: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedEmailPreview, setSelectedEmailPreview] = useState<Notification['emailPreview'] | null>(null);

  const refreshNotifications = () => {
    const all = dataService.getNotifications();
    // Filter relevant notifications for current user or admin/role broadcasts.
    // Stage-transition "Approval Required" notices are broadcast to
    // 'approvers_' + roleName.toLowerCase() (see dataService.processApprovalStep) —
    // must match that exact pattern for any approver (Executive/Manager/HOD/President) to see them.
    const roleBroadcastId = 'approvers_' + currentUser.roleName.toLowerCase().replace(/\s+/g, '_');
    const relevant = all.filter(n =>
      n.userId === currentUser.id ||
      n.userId === 'all_admins' ||
      n.userId === roleBroadcastId ||
      (currentUser.roleName === 'Executive' && n.userId === 'all_executives')
    );
    setNotifications(relevant);
  };

  useEffect(() => {
    refreshNotifications();
  }, [currentUser]);

  const markAsRead = (id: string) => {
    dataService.markNotificationAsRead(id);
    refreshNotifications();
  };

  const markAllAsRead = () => {
    dataService.markAllNotificationsAsRead();
    refreshNotifications();
  };

  const clearAll = () => {
    dataService.clearAllNotifications();
    refreshNotifications();
  };

  const openEmailPreview = (preview: Notification['emailPreview']) => {
    setSelectedEmailPreview(preview);
  };

  const closeEmailPreview = () => {
    setSelectedEmailPreview(null);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
        refreshNotifications,
        selectedEmailPreview,
        openEmailPreview,
        closeEmailPreview
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

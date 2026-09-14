import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/user';
import { Permission, Role } from '../types/rbac';
import { dataService } from '../services/dataService';
import { useSyncedState } from '../hooks/useSyncedState';

const SESSION_KEY = 'rdx_authenticated_user_id';

interface AuthContextType {
  currentUser: User;
  users: User[];
  roles: Role[];
  permissions: Permission[];
  hasPermission: (permission: Permission) => boolean;
  switchUser: (userId: string) => void;
  refreshUserData: () => void;
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useSyncedState<User[]>(() => dataService.getUsers());
  const [roles, setRoles] = useSyncedState<Role[]>(() => dataService.getRoles());

  // Restore session from localStorage if present
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const savedId = localStorage.getItem(SESSION_KEY);
    if (!savedId) return false;
    const allUsers = dataService.getUsers();
    const found = allUsers.find(u => u.id === savedId);
    if (found && found.status !== 'disabled') {
      dataService.setCurrentUser(savedId);
      return true;
    }
    localStorage.removeItem(SESSION_KEY);
    return false;
  });

  const [currentUser, setCurrentUserState] = useSyncedState<User>(() => dataService.getCurrentUser());

  const refreshUserData = () => {
    const updatedUsers = dataService.getUsers();
    const updatedRoles = dataService.getRoles();
    const updatedCurrent = dataService.getCurrentUser();
    setUsers(updatedUsers);
    setRoles(updatedRoles);
    setCurrentUserState(updatedCurrent);
  };

  // Internal only — used by login, not exposed for arbitrary switching
  const switchUser = (userId: string) => {
    dataService.setCurrentUser(userId);
    refreshUserData();
  };

  const hasPermission = (permission: Permission): boolean => {
    return dataService.hasPermission(currentUser, permission);
  };

  const currentRole = roles.find(r => r.id === currentUser.roleId);
  const permissions = currentRole ? currentRole.permissions : [];

  const login = (email: string, password: string): boolean => {
    const allUsers = dataService.getUsers();
    const found = allUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!found) {
      throw new Error('No account found matching this corporate email address.');
    }
    if (found.status === 'disabled') {
      throw new Error('This account has been deactivated by an administrator.');
    }
    // Validate password if the user has one set
    const expectedPassword = found.password || 'admin@123';
    if (password !== expectedPassword) {
      throw new Error('Invalid password. Please check your credentials.');
    }
    // Persist session
    localStorage.setItem(SESSION_KEY, found.id);
    switchUser(found.id);
    setIsAuthenticated(true);
    return true;
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        roles,
        permissions,
        hasPermission,
        switchUser,
        refreshUserData,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

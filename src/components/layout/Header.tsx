import React, { useEffect, useState } from 'react';
import {
  Sun,
  Moon,
  Bell,
  Search,
  ChevronDown,
  UserCheck,
  Shield,
  LogOut,
  Mail,
  ExternalLink,
  Menu,
  CloudOff,
  RefreshCw
} from 'lucide-react';
import type { ApiSyncErrorDetail } from '../../services/apiService';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { useSystem } from '../../context/SystemContext';
import { Button } from '../common/Button';

interface HeaderProps {
  onOpenCommandPalette: () => void;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCommandPalette, onToggleSidebar }) => {
  const { currentUser, users, switchUser, roles, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead, openEmailPreview } = useNotifications();
  const { settings } = useSystem();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  // Surfaces background PostgreSQL sync failures (fire-and-forget writes from
  // dataService) so a broken connection isn't silent — see apiService.ts.
  const [syncErrorCount, setSyncErrorCount] = useState(0);
  const [lastSyncError, setLastSyncError] = useState<string>('');
  const [bootstrapFailed, setBootstrapFailed] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleRetrySync = async () => {
    setIsSyncing(true);
    try {
      await dataService.syncFromDatabase();
      setSyncErrorCount(0);
      setBootstrapFailed(false);
    } catch {
      // handled
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ApiSyncErrorDetail>).detail;
      setSyncErrorCount(c => c + 1);
      setLastSyncError(detail?.label || 'unknown action');
    };
    const bootstrapHandler = () => setBootstrapFailed(true);
    window.addEventListener('api-sync-error', handler);
    window.addEventListener('api-bootstrap-error', bootstrapHandler);
    return () => {
      window.removeEventListener('api-sync-error', handler);
      window.removeEventListener('api-bootstrap-error', bootstrapHandler);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-3 sm:px-6 bg-card/85 backdrop-blur-md border-b border-border/80 transition-colors shrink-0">
      {/* Left: Hamburger (mobile) + Branding & Search shortcut */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="md:hidden p-2 -ml-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors focus:outline-none"
          title="Open Menu"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 min-w-0">
          {/* Logo: white bg in light mode so red logo pops; dark bg container in dark mode */}
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-black flex items-center justify-center shadow-sm border border-border/40 shrink-0">
            <img src="/rdx-logo.png" alt="RDX" className="w-8 h-8 object-contain" />
          </div>
          <div className="hidden sm:block truncate">
            <h1 className="text-sm font-bold text-foreground leading-tight tracking-tight truncate">
              {settings.branding.companyName}
            </h1>
            <p className="text-[11px] text-muted-foreground font-medium truncate">
              {settings.branding.appTitle}
            </p>
          </div>
        </div>

        {/* Global Quick Search Button (Ctrl+K) */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted border border-border/60 text-xs text-muted-foreground hover:text-foreground transition-all ml-2"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Quick search or command...</span>
          <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-background border border-border text-muted-foreground ml-2 shadow-xs">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right controls: Theme, Notifications, Persona Switcher, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Database unreachable — the app is showing local/demo data, not live data */}
        {bootstrapFailed && (
          <button
            type="button"
            onClick={handleRetrySync}
            disabled={isSyncing}
            title="Could not reach the PostgreSQL database on load. You're viewing local/demo data. Click to retry connecting."
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-semibold border border-destructive/30 transition-colors disabled:opacity-50"
          >
            <CloudOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isSyncing ? 'Connecting...' : 'DB unreachable — retry'}</span>
            <RefreshCw className={`w-3 h-3 ml-0.5 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
        )}

        {/* Background DB sync failure indicator */}
        {syncErrorCount > 0 && (
          <button
            type="button"
            onClick={handleRetrySync}
            disabled={isSyncing}
            title={`${syncErrorCount} background save${syncErrorCount > 1 ? 's' : ''} failed to sync (last: ${lastSyncError}). Click to retry synchronizing with database.`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold border border-amber-500/30 transition-colors disabled:opacity-50"
          >
            <CloudOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isSyncing ? 'Retrying sync...' : 'Sync issue'}</span>
            <span>({syncErrorCount})</span>
            <RefreshCw className={`w-3 h-3 ml-0.5 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
        )}

        {/* Mobile Search Icon */}
        <button
          onClick={onOpenCommandPalette}
          className="sm:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
          title="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Light/Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifMenu(!showNotifMenu);
              setShowUserMenu(false);
            }}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg relative transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] sm:w-96 max-w-sm rounded-2xl bg-card border border-border shadow-xl z-50 overflow-hidden animate-fade-in">
              <div className="p-3.5 border-b border-border/80 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No active notifications
                  </div>
                ) : (
                  notifications.slice(0, 10).map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 text-xs transition-colors hover:bg-muted/40 cursor-pointer ${
                        !notif.read ? 'bg-primary/[0.03]' : ''
                      }`}
                      onClick={() => markAsRead(notif.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-foreground">{notif.title}</span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-0.5 leading-relaxed">{notif.message}</p>
                      
                      {/* If notification includes simulated enterprise email */}
                      {notif.emailPreview && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEmailPreview(notif.emailPreview);
                            setShowNotifMenu(false);
                          }}
                          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                        >
                          <Mail className="w-3 h-3" />
                          View Simulated Email
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

    
        

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] sm:w-72 max-w-xs rounded-2xl bg-card border border-border shadow-xl z-50 overflow-hidden animate-fade-in">
              <div className="p-3.5 border-b border-border/80 bg-muted/20">
                <p className="text-xs font-bold text-foreground">Interactive Persona Switcher</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Instantly simulate any enterprise role & test dynamic RBAC:
                </p>
              </div>

              <div className="p-2 max-h-72 overflow-y-auto space-y-1">
                {users.map((u) => {
                  const isSelected = u.id === currentUser.id;
                  const role = roles.find(r => r.id === u.roleId);
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u.id);
                        setShowUserMenu(false);
                      }}
                      className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left text-xs transition-all ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-semibold border border-primary/20'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="w-7 h-7 rounded-lg object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="truncate font-medium">{u.name}</span>
                          {isSelected && <UserCheck className="w-3.5 h-3.5 text-primary" />}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: role?.color || '#6366f1' }}
                          />
                          <span>{u.roleName}</span>
                          {u.teamName && <span>• {u.teamName}</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-2.5 border-t border-border/80 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                  <span>Signed in as <strong>{currentUser.roleName}</strong></span>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out to Login Page</span>
                </button>
              </div>
            </div>
          )}
      

        {/* Header Direct Log Out Button */}
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-semibold border border-destructive/20 transition-all cursor-pointer"
          title="Sign out of current account"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Log Out</span>
        </button>
      </div>
    </header>
  );
};

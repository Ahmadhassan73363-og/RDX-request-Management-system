import React from 'react';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Users2,
  DollarSign,
  FormInput,
  FileSpreadsheet,
  BarChart3,
  History,
  UserCog,
  Settings,
  ShieldCheck,
  ChevronRight,
  SendHorizontal,
  Truck,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSystem } from '../../context/SystemContext';
import { dataService } from '../../services/dataService';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPath, onNavigate, onCloseMobile }) => {
  const { hasPermission, currentUser, logout } = useAuth();
  const { settings } = useSystem();

  // Get count of pending approvals for badge — must match ApprovalsQueuePage's own filter
  const pendingApprovalsCount = dataService.getRequests().filter(r =>
    ['submitted', 'under_review', 'pending_executive', 'pending_manager', 'pending_hod', 'pending_assistant', 'pending_president'].includes(r.status)
  ).length;

  // Active shipments count (not yet delivered)
  const activeShipmentsCount = dataService.getRequests().filter(r =>
    (r.status === 'approved' || r.shipmentStatus) && r.shipmentStatus !== 'delivered'
  ).length;

  // Active team budget snippet
  const teams = dataService.getTeams();
  const userTeam = teams.find(t => t.id === currentUser.teamId) || teams[0];
  const userTeamRemaining = userTeam ? (userTeam.remainingBudget || 0) : 0;
  const userTeamAllocated = userTeam ? (userTeam.allocatedBudget || 1) : 1;
  const userTeamSpent = userTeam ? (userTeam.spentBudget || 0) : 0;
  const userTeamPct = userTeamAllocated > 0 ? Math.round((userTeamSpent / userTeamAllocated) * 100) : 0;

  const navItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      permission: 'dashboard:view' as const,
    },
    {
      label: 'Requests',
      path: '/requests',
      icon: <FileText className="w-4 h-4" />,
      badge: 'Multi-View',
    },
    {
      label: 'Shipment Tracking',
      path: '/shipments',
      icon: <Truck className="w-4 h-4" />,
      count: activeShipmentsCount > 0 ? activeShipmentsCount : undefined,
      countColor: 'bg-blue-600 text-white',
    },
    {
      label: 'Approvals Queue',
      path: '/approvals',
      icon: <CheckSquare className="w-4 h-4" />,
      count: pendingApprovalsCount,
      countColor: 'bg-primary text-primary-foreground',
      permission: 'approvals:approve' as const,
    },
    {
      label: 'Team Management',
      path: '/teams',
      icon: <Users2 className="w-4 h-4" />,
    },
    {
      label: 'Budget Tracking',
      path: '/budgets',
      icon: <DollarSign className="w-4 h-4" />,
      permission: 'budgets:view' as const,
    },
    {
      label: 'Form Builder',
      path: '/forms',
      icon: <FormInput className="w-4 h-4" />,
      badge: 'No-Code',
    },
    {
      label: 'Form Assignments',
      path: '/form-assignments',
      icon: <SendHorizontal className="w-4 h-4" />,
    },
    {
      label: 'Reports & Analytics',
      path: '/reports',
      icon: <BarChart3 className="w-4 h-4" />,
      permission: 'reports:view' as const,
    },
    {
      label: 'Audit Trail',
      path: '/audit',
      icon: <History className="w-4 h-4" />,
    },
    {
      label: 'User Directory & RBAC',
      path: '/users',
      icon: <UserCog className="w-4 h-4" />,
      permission: 'users:view' as const,
    },
    {
      label: 'System Settings',
      path: '/settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-full h-full bg-sidebar flex flex-col justify-between p-4 select-none overflow-y-auto">
      <div className="space-y-6">
        {/* Navigation list */}
        <div className="space-y-1">
          <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-sidebar-muted">
            Core Modules
          </div>
          {navItems.map((item) => {
            const isAccessible = !item.permission || hasPermission(item.permission);
            const isActive = currentPath === item.path;

            if (!isAccessible) {
              return null; // hide or could show disabled
            }

            return (
              <button
                key={item.path}
                onClick={() => {
                  onNavigate(item.path);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25 font-semibold'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`${isActive ? 'text-white' : 'text-sidebar-muted group-hover:text-foreground transition-colors'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.badge && !isActive && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-accent text-accent-foreground font-semibold">
                      {item.badge}
                    </span>
                  )}
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : item.countColor
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sidebar Footer: Team Budget Health Card */}
      <div className="pt-4 border-t border-sidebar-border mt-6">
        <div className="p-3 rounded-xl bg-card border border-border/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-foreground truncate">
              {userTeam.name}
            </span>
            <span className="text-[10px] font-mono font-semibold text-primary">
              ${userTeamRemaining.toLocaleString()} Left
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                userTeamPct >= 90
                  ? 'bg-rose-500'
                  : userTeamPct >= 75
                  ? 'bg-amber-500'
                  : 'bg-primary'
              }`}
              style={{ width: `${Math.min(100, userTeamPct)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Burn Rate: {userTeamPct}%</span>
            <span>Limit: ${userTeamAllocated.toLocaleString()}</span>
          </div>
        </div>

        {/* Sidebar Log Out Button */}
        <button
          onClick={logout}
          className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-semibold border border-destructive/20 transition-all cursor-pointer"
          title="Sign out of current account"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};

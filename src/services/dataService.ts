import { storage } from './storage';
import {
  INITIAL_ROLES,
  INITIAL_USERS,
  INITIAL_TEAMS,
  INITIAL_REQUESTS,
  INITIAL_FORMS,
  INITIAL_FORM_ASSIGNMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SETTINGS,
  INITIAL_BUDGET_TRANSACTIONS,
  INITIAL_ADDITIONAL_FIELDS
} from './mockData';
import { Role, Permission } from '../types/rbac';
import { User } from '../types/user';
import { Team } from '../types/team';
import { RequestRecord, RequestStatus, RequestPriority, SkuItem, ShipmentStatus, AdditionalField } from '../types/request';
import { FormSchema, FormAssignment, FormSubmission } from '../types/form';
import { BudgetTransaction, BudgetActionType } from '../types/budget';
import { Notification, NotificationType } from '../types/notification';
import { AuditLog, AuditActionType } from '../types/audit';
import { SystemSettings } from '../types/settings';
import { ApprovalActionType, ApprovalHistoryEntry } from '../types/approval';

import { api } from './apiService';

class DataService {
  constructor() {
    this.initStorage();
    this.syncFromDatabase();
  }

  public async syncFromDatabase() {
    try {
      const data = await api.getBootstrap();
      if (!data) return;

      if (Array.isArray(data.roles) && data.roles.length) storage.set('roles', data.roles);
      if (Array.isArray(data.users) && data.users.length) {
        // The users table has no password column, so DB rows never carry one.
        // Preserve the previously-known local/demo password instead of wiping it out.
        const existingUsers = this.getUsers();
        const usersWithPasswords = data.users.map((u: User) => {
          const existing = existingUsers.find(eu => eu.id === u.id || eu.email?.toLowerCase() === u.email?.toLowerCase());
          const initMatch = INITIAL_USERS.find(iu => iu.id === u.id || iu.email.toLowerCase() === u.email?.toLowerCase());
          return { ...u, password: u.password || existing?.password || initMatch?.password || 'admin@123' };
        });
        storage.set('users', usersWithPasswords);
      }
      if (Array.isArray(data.teams) && data.teams.length) storage.set('teams', data.teams);
      if (Array.isArray(data.requests) && data.requests.length) storage.set('requests', data.requests);
      if (Array.isArray(data.forms) && data.forms.length) storage.set('forms', data.forms);
      if (Array.isArray(data.formAssignments) && data.formAssignments.length) storage.set('form_assignments', data.formAssignments);
      if (Array.isArray(data.budgetTransactions) && data.budgetTransactions.length) storage.set('budget_transactions', data.budgetTransactions);
      if (Array.isArray(data.notifications) && data.notifications.length) storage.set('notifications', data.notifications);
      if (Array.isArray(data.auditLogs) && data.auditLogs.length) storage.set('audit_logs', data.auditLogs);
      if (data.settings) storage.set('settings', data.settings);
      if (Array.isArray(data.additionalFields)) storage.set('additional_fields', data.additionalFields);
      console.log('✨ Synchronized state with local PostgreSQL database (rdx_request_db)');
    } catch (err) {
      console.warn('Database sync skipped (offline or server starting)', err);
    }
  }

  private initStorage() {
    if (!storage.get('initialized', false)) {
      storage.set('roles', INITIAL_ROLES);
      storage.set('users', INITIAL_USERS);
      storage.set('teams', INITIAL_TEAMS);
      storage.set('requests', INITIAL_REQUESTS);
      storage.set('forms', INITIAL_FORMS);
      storage.set('form_assignments', INITIAL_FORM_ASSIGNMENTS);
      storage.set('form_submissions', []);
      storage.set('notifications', INITIAL_NOTIFICATIONS);
      storage.set('audit_logs', INITIAL_AUDIT_LOGS);
      storage.set('settings', INITIAL_SETTINGS);
      storage.set('budget_transactions', INITIAL_BUDGET_TRANSACTIONS);
      storage.set('additional_fields', INITIAL_ADDITIONAL_FIELDS);
      storage.set('current_user_id', 'usr-1'); // Alexander Vance (Super Admin)
      storage.set('initialized', true);
    }

    // Schema v2 migration: if teams have old wrong field name (totalAllocatedBudget),
    // reset them to fresh mock data so toLocaleString never crashes on undefined allocatedBudget
    const storedTeams = storage.get<any[]>('teams', []);
    if (storedTeams.length > 0 && storedTeams[0]?.totalAllocatedBudget !== undefined) {
      console.log('🔄 Migrating stale team data (v1→v2 schema fix)...');
      storage.set('teams', INITIAL_TEAMS);
    }
    // Also ensure any team missing allocatedBudget is patched with 0 (defensive)
    const teams = storage.get<any[]>('teams', INITIAL_TEAMS);
    const patched = teams.map(t => ({
      ...t,
      allocatedBudget: t.allocatedBudget ?? t.totalAllocatedBudget ?? 0,
      spentBudget: t.spentBudget ?? 0,
      remainingBudget: t.remainingBudget ?? Math.max(0, (t.allocatedBudget ?? t.totalAllocatedBudget ?? 0) - (t.spentBudget ?? 0)),
      active: t.active ?? true,
      memberCount: t.memberCount ?? 0,
      currency: t.currency ?? '$',
      code: t.code ?? 'TEAM',
      leadName: t.leadName ?? '',
    }));
    storage.set('teams', patched);

    // Branding migration: force-patch stale names to RDX Request & Budget Management System
    const currentSettings = storage.get<SystemSettings>('settings', INITIAL_SETTINGS);
    if (
      currentSettings?.branding?.companyName === 'OmniCorp Enterprise Systems' ||
      currentSettings?.branding?.companyName === 'OmniCorp' ||
      currentSettings?.branding?.appTitle === 'Enterprise Gift & Budget Management' ||
      currentSettings?.branding?.appTitle === 'Gift & Budget Management System'
    ) {
      storage.set('settings', {
        ...currentSettings,
        branding: {
          ...currentSettings.branding,
          companyName: 'RDX',
          appTitle: 'Request & Budget Management System',
        }
      });
    }

    // Role synchronization: ensure all 7 INITIAL_ROLES exist and system roles have full permissions
    const storedRoles = storage.get<Role[]>('roles', INITIAL_ROLES);
    const updatedRoles = INITIAL_ROLES.map(initRole => {
      const existing = storedRoles.find(r => r.id === initRole.id || r.name === initRole.name);
      if (!existing) return initRole;
      if (existing.isSystem) {
        return {
          ...existing,
          permissions: initRole.permissions,
          color: initRole.color,
          name: initRole.name,
          description: initRole.description
        };
      }
      return existing;
    });
    storedRoles.forEach(r => {
      if (!updatedRoles.some(u => u.id === r.id)) {
        updatedRoles.push(r);
      }
    });
    storage.set('roles', updatedRoles);

    // User synchronization: ensure all 7 INITIAL_USERS exist with credentials and assigned roles
    const storedUsers = storage.get<User[]>('users', INITIAL_USERS);
    const mergedUsers = [...storedUsers];
    INITIAL_USERS.forEach(initUser => {
      const idx = mergedUsers.findIndex(u => u.id === initUser.id || u.email.toLowerCase() === initUser.email.toLowerCase());
      if (idx >= 0) {
        mergedUsers[idx] = {
          ...mergedUsers[idx],
          password: initUser.password || 'admin@123',
          roleId: initUser.roleId,
          roleName: initUser.roleName
        };
      } else {
        mergedUsers.push(initUser);
      }
    });
    storage.set('users', mergedUsers);
  }



  // --- Audit Logging ---
  public logAudit(
    action: AuditActionType,
    entityType: AuditLog['entityType'],
    entityId: string,
    description: string,
    user: User,
    oldValue?: string,
    newValue?: string
  ) {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: 'audit-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.roleName,
      action,
      entityType,
      entityId,
      description,
      oldValue,
      newValue,
      ipAddress: '192.168.1.' + (100 + Math.floor(Math.random() * 50)),
      browser: 'Enterprise Web Client (Chrome/Edge)',
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog);
    storage.set('audit_logs', logs.slice(0, 500));
    api.addAuditLog(newLog).catch(() => {});
  }

  public getAuditLogs(): AuditLog[] {
    return storage.get<AuditLog[]>('audit_logs', INITIAL_AUDIT_LOGS);
  }

  // --- Notifications ---
  public getNotifications(): Notification[] {
    return storage.get<Notification[]>('notifications', INITIAL_NOTIFICATIONS);
  }

  public notify(
    userId: string,
    title: string,
    message: string,
    type: NotificationType,
    entityId?: string,
    entityType?: Notification['entityType'],
    actionUrl?: string,
    emailPreviewSubject?: string,
    emailPreviewHtml?: string
  ) {
    const notifs = this.getNotifications();
    const newNotif: Notification = {
      id: 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      userId,
      title,
      message,
      type,
      entityId,
      entityType,
      actionUrl,
      read: false,
      createdAt: new Date().toISOString(),
      emailPreview: emailPreviewSubject ? {
        to: userId,
        subject: emailPreviewSubject,
        htmlBody: emailPreviewHtml || `<p>${message}</p>`
      } : undefined
    };
    notifs.unshift(newNotif);
    storage.set('notifications', notifs);
    api.addNotification(newNotif).catch(() => {});
    return newNotif;
  }

  public markNotificationAsRead(id: string) {
    const notifs = this.getNotifications().map(n => n.id === id ? { ...n, read: true } : n);
    storage.set('notifications', notifs);
    api.markNotificationRead(id, true).catch(() => {});
  }

  public markAllNotificationsAsRead() {
    const notifs = this.getNotifications();
    const unread = notifs.filter(n => !n.read);
    storage.set('notifications', notifs.map(n => ({ ...n, read: true })));
    unread.forEach(n => api.markNotificationRead(n.id, true).catch(() => {}));
  }

  public clearAllNotifications() {
    storage.set('notifications', []);
  }

  // --- Users & Session ---
  public getCurrentUser(): User {
    const currentId = storage.get<string>('current_user_id', 'usr-1');
    const users = this.getUsers();
    return users.find(u => u.id === currentId) || users[0];
  }

  public setCurrentUser(userId: string) {
    storage.set('current_user_id', userId);
    const user = this.getUsers().find(u => u.id === userId);
    if (user) {
      this.logAudit('USER_LOGIN', 'User', user.id, `User persona switched to ${user.name} (${user.roleName})`, user);
    }
  }

  public getUsers(): User[] {
    return storage.get<User[]>('users', INITIAL_USERS);
  }

  public saveUser(userData: Partial<User> & { name: string; email: string; roleId: string }, actor: User): User {
    const users = this.getUsers();
    const roles = this.getRoles();
    const role = roles.find(r => r.id === userData.roleId);
    const teams = this.getTeams();
    const team = teams.find(t => t.id === userData.teamId);

    let savedUser: User;
    if (userData.id) {
      const index = users.findIndex(u => u.id === userData.id);
      const oldUser = users[index];
      savedUser = {
        ...oldUser,
        ...userData,
        roleName: role ? role.name : (oldUser.roleName || 'Viewer'),
        teamName: team ? team.name : oldUser.teamName
      };
      users[index] = savedUser;
      this.logAudit('USER_UPDATE', 'User', savedUser.id, `Updated user details for ${savedUser.name}`, actor, JSON.stringify(oldUser), JSON.stringify(savedUser));
    } else {
      savedUser = {
        id: 'usr-' + Date.now(),
        name: userData.name,
        email: userData.email,
        roleId: userData.roleId,
        roleName: role ? role.name : 'Viewer',
        teamId: userData.teamId,
        teamName: team ? team.name : undefined,
        title: userData.title || 'Staff Member',
        department: userData.department || 'Operations',
        status: userData.status || 'active',
        password: userData.password || 'admin@123',
        phone: userData.phone || '',
        emailVerified: true,
        createdAt: new Date().toISOString()
      };
      users.push(savedUser);
      this.logAudit('USER_CREATE', 'User', savedUser.id, `Created new enterprise user ${savedUser.name} (${savedUser.email})`, actor, undefined, JSON.stringify(savedUser));
    }
    storage.set('users', users);
    api.saveUser(savedUser).catch(() => {});
    return savedUser;
  }

  public toggleUserStatus(userId: string, actor: User): User {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    const oldStatus = user.status;
    user.status = user.status === 'active' ? 'disabled' : 'active';
    storage.set('users', users);
    api.saveUser(user).catch(() => {});
    this.logAudit('USER_DISABLE', 'User', user.id, `Changed status of ${user.name} from ${oldStatus} to ${user.status}`, actor);
    return user;
  }

  public deleteUser(userId: string, actor: User) {
    if (userId === actor.id) {
      throw new Error('You cannot delete your own active user account.');
    }
    let users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    users = users.filter(u => u.id !== userId);
    storage.set('users', users);
    api.deleteUser(userId).catch(() => {});
    this.logAudit('USER_DELETE', 'User', userId, `Deleted user account ${user.name} (${user.email})`, actor);
  }

  // --- Roles & Dynamic RBAC ---
  public getRoles(): Role[] {
    return storage.get<Role[]>('roles', INITIAL_ROLES);
  }

  public saveRole(roleData: Partial<Role> & { name: string; permissions: Permission[] }, actor: User): Role {
    const roles = this.getRoles();
    let savedRole: Role;
    if (roleData.id) {
      const idx = roles.findIndex(r => r.id === roleData.id);
      const oldRole = roles[idx];
      savedRole = {
        ...oldRole,
        ...roleData
      };
      roles[idx] = savedRole;
      this.logAudit('ROLE_UPDATE', 'Role', savedRole.id, `Updated permissions for role ${savedRole.name}`, actor, JSON.stringify(oldRole), JSON.stringify(savedRole));
    } else {
      savedRole = {
        id: 'role-' + Date.now(),
        name: roleData.name,
        description: roleData.description || 'Custom configured role',
        permissions: roleData.permissions,
        color: roleData.color || '#6366f1',
        isSystem: false,
        createdAt: new Date().toISOString()
      };
      roles.push(savedRole);
      this.logAudit('ROLE_CREATE', 'Role', savedRole.id, `Created dynamic role ${savedRole.name} with ${savedRole.permissions.length} permissions`, actor, undefined, JSON.stringify(savedRole));
    }
    storage.set('roles', roles);
    api.saveRole(savedRole).catch(() => {});
    return savedRole;
  }

  public deleteRole(roleId: string, actor: User) {
    let roles = this.getRoles();
    const role = roles.find(r => r.id === roleId);
    if (!role || role.isSystem) {
      throw new Error('System roles cannot be deleted');
    }
    roles = roles.filter(r => r.id !== roleId);
    storage.set('roles', roles);
    api.deleteRole(roleId).catch(() => {});
    this.logAudit('ROLE_UPDATE', 'Role', roleId, `Deleted custom role ${role.name}`, actor);
  }

  public hasPermission(user: User, permission: Permission): boolean {
    if (user.roleName === 'Super Admin' || user.id === 'usr-1') return true;
    const roles = this.getRoles();
    const role = roles.find(r => r.id === user.roleId || r.name === user.roleName);
    if (!role) return false;
    return role.permissions.includes(permission);
  }

  // --- Teams & Budgets ---
  public getTeams(): Team[] {
    return storage.get<Team[]>('teams', INITIAL_TEAMS);
  }

  public saveTeam(teamData: Partial<Team> & { name: string; allocatedBudget: number }, actor: User): Team {
    const teams = this.getTeams();
    let savedTeam: Team;
    if (teamData.id) {
      const idx = teams.findIndex(t => t.id === teamData.id);
      const oldTeam = teams[idx];
      const budgetDiff = teamData.allocatedBudget !== undefined ? teamData.allocatedBudget - oldTeam.allocatedBudget : 0;
      
      savedTeam = {
        ...oldTeam,
        ...teamData,
        remainingBudget: oldTeam.remainingBudget + budgetDiff
      };
      teams[idx] = savedTeam;

      if (budgetDiff !== 0) {
        this.addBudgetTransaction({
          teamId: savedTeam.id,
          teamName: savedTeam.name,
          type: budgetDiff > 0 ? 'BUDGET_INCREASE' : 'BUDGET_DECREASE',
          amount: Math.abs(budgetDiff),
          balanceBefore: oldTeam.remainingBudget,
          balanceAfter: savedTeam.remainingBudget,
          reason: `Team budget allocation adjustment by ${actor.name}`,
          performedByUserId: actor.id,
          performedByUserName: actor.name
        });
      }

      this.logAudit('TEAM_UPDATE', 'Team', savedTeam.id, `Updated team details for ${savedTeam.name}`, actor, JSON.stringify(oldTeam), JSON.stringify(savedTeam));
    } else {
      const initialBudget = Number(teamData.allocatedBudget) || 0;
      savedTeam = {
        id: 'team-' + Date.now(),
        name: teamData.name,
        code: teamData.code || teamData.name.substring(0, 4).toUpperCase(),
        description: teamData.description || 'Enterprise functional team',
        leadId: teamData.leadId || actor.id,
        leadName: teamData.leadName || actor.name,
        leadEmail: teamData.leadEmail || actor.email,
        allocatedBudget: initialBudget,
        spentBudget: 0,
        remainingBudget: initialBudget,
        active: true,
        memberCount: 1,
        currency: '$',
        color: teamData.color || '#3b82f6',
        createdAt: new Date().toISOString()
      };
      teams.push(savedTeam);

      this.addBudgetTransaction({
        teamId: savedTeam.id,
        teamName: savedTeam.name,
        type: 'INITIAL_ALLOCATION',
        amount: initialBudget,
        balanceBefore: 0,
        balanceAfter: initialBudget,
        reason: 'Initial team budget setup',
        performedByUserId: actor.id,
        performedByUserName: actor.name
      });

      this.logAudit('TEAM_CREATE', 'Team', savedTeam.id, `Created new team ${savedTeam.name} with initial budget $${initialBudget.toLocaleString()}`, actor, undefined, JSON.stringify(savedTeam));
    }
    storage.set('teams', teams);
    api.saveTeam(savedTeam).catch(() => {});
    return savedTeam;
  }

  public deleteTeam(teamId: string, actor: User) {
    let teams = this.getTeams();
    const team = teams.find(t => t.id === teamId);
    if (!team) throw new Error('Team not found');

    teams = teams.filter(t => t.id !== teamId);
    storage.set('teams', teams);
    api.deleteTeam(teamId).catch(() => {});

    // Update associated users
    const users = this.getUsers().map(u => {
      if (u.teamId === teamId) {
        return { ...u, teamId: undefined, teamName: undefined };
      }
      return u;
    });
    storage.set('users', users);

    this.logAudit('TEAM_DELETE', 'Team', teamId, `Deleted team ${team.name} (${team.code})`, actor);
  }

  public adjustTeamBudget(
    teamId: string,
    amount: number,
    type: 'BUDGET_INCREASE' | 'BUDGET_DECREASE',
    reason: string,
    actor: User
  ): Team {
    const teams = this.getTeams();
    const team = teams.find(t => t.id === teamId);
    if (!team) throw new Error('Team not found');

    const oldRemaining = team.remainingBudget;
    const oldAllocated = team.allocatedBudget;

    if (type === 'BUDGET_INCREASE') {
      team.allocatedBudget += amount;
      team.remainingBudget += amount;
    } else {
      if (team.remainingBudget < amount) {
        throw new Error('Cannot decrease budget below remaining available balance');
      }
      team.allocatedBudget -= amount;
      team.remainingBudget -= amount;
    }

    storage.set('teams', teams);
    api.saveTeam(team).catch(() => {});

    this.addBudgetTransaction({
      teamId: team.id,
      teamName: team.name,
      type,
      amount,
      balanceBefore: oldRemaining,
      balanceAfter: team.remainingBudget,
      reason,
      performedByUserId: actor.id,
      performedByUserName: actor.name
    });

    this.logAudit('BUDGET_ADJUST', 'Budget', team.id, `${type === 'BUDGET_INCREASE' ? 'Increased' : 'Decreased'} budget of ${team.name} by $${amount.toLocaleString()}. Reason: ${reason}`, actor, JSON.stringify({ allocated: oldAllocated, remaining: oldRemaining }), JSON.stringify({ allocated: team.allocatedBudget, remaining: team.remainingBudget }));

    return team;
  }

  public getBudgetTransactions(teamId?: string): BudgetTransaction[] {
    const txns = storage.get<BudgetTransaction[]>('budget_transactions', INITIAL_BUDGET_TRANSACTIONS);
    if (teamId) {
      return txns.filter(t => t.teamId === teamId);
    }
    return txns;
  }

  private addBudgetTransaction(txn: Omit<BudgetTransaction, 'id' | 'createdAt'>) {
    const txns = this.getBudgetTransactions();
    const newTxn: BudgetTransaction = {
      ...txn,
      id: 'txn-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      createdAt: new Date().toISOString()
    };
    txns.unshift(newTxn);
    storage.set('budget_transactions', txns);
    api.addBudgetTransaction(newTxn).catch(() => {});
  }

  // --- Requests & Approvals ---
  public getRequests(filters?: {
    teamId?: string;
    status?: RequestStatus;
    search?: string;
    priority?: RequestPriority;
  }): RequestRecord[] {
    let requests = storage.get<RequestRecord[]>('requests', INITIAL_REQUESTS);
    if (!filters) return requests;

    if (filters.teamId) {
      requests = requests.filter(r => r.teamId === filters.teamId);
    }
    if (filters.status) {
      requests = requests.filter(r => r.status === filters.status);
    }
    if (filters.priority) {
      requests = requests.filter(r => r.priority === filters.priority);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      requests = requests.filter(r =>
        r.trackingNumber.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.customerCompany.toLowerCase().includes(q) ||
        r.requestItem.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
      );
    }
    return requests;
  }

  public getRequestById(id: string): RequestRecord | undefined {
    return this.getRequests().find(r => r.id === id);
  }

  public createRequest(
    payload: {
      date?: string;
      department?: string;
      agentOrTeamName?: string;
      businessName?: string;
      typeOfFoc?: string;
      systemInvoiceNo?: string | number;
      sampleSku?: string;
      sampleSkuQty?: number;
      sampleSkuCostPerUnit?: number;
      sampleSkuTotal?: number;
      skuItems?: SkuItem[];

      customerName?: string;
      customerCompany?: string;
      requestCategory?: string;
      requestItem?: string;
      discountPercentage?: number;
      requestValue?: number;
      teamId?: string;
      reason?: string;
      priority?: RequestPriority;
      deliveryTargetDate?: string;
      attachments?: { name: string; size: number; type: string }[];

      // Dynamic Form Linkage
      formId?: string;
      formTitle?: string;
      customFields?: Record<string, any>;
    },
    actor: User
  ): RequestRecord {
    const teams = this.getTeams();
    const team = teams.find(t => t.id === payload.teamId) || teams.find(t => t.id === actor.teamId) || teams[0];
    if (!team) throw new Error('No team allocated');

    // Calculate sample SKU cost or retail discount value
    const hasMultiSku = Array.isArray(payload.skuItems) && payload.skuItems.length > 0;
    const multiSkuTotal = hasMultiSku
      ? Math.round(payload.skuItems!.reduce((acc, item) => acc + (Number(item.sampleSkuTotal) || 0), 0) * 100) / 100
      : 0;
    const multiSkuQty = hasMultiSku
      ? payload.skuItems!.reduce((acc, item) => acc + (Number(item.sampleSkuQty) || 0), 0)
      : 0;
    const multiSkuSummary = hasMultiSku
      ? payload.skuItems!.map(item => item.sampleSku).filter(Boolean).join(', ')
      : '';

    const numQty = hasMultiSku && multiSkuQty > 0 ? multiSkuQty : (Number(payload.sampleSkuQty) || 0);
    const numCostPerUnit = Number(payload.sampleSkuCostPerUnit) || 0;
    const calculatedSkuTotal = hasMultiSku && multiSkuTotal > 0
      ? multiSkuTotal
      : (payload.sampleSkuTotal !== undefined
        ? Number(payload.sampleSkuTotal)
        : Math.round(numQty * numCostPerUnit * 100) / 100);

    const discountMultiplier = Math.max(0, 1 - ((payload.discountPercentage || 0) / 100));
    const discountBudgetAmount = Math.round((Number(payload.requestValue) || 0) * discountMultiplier * 100) / 100;

    const budgetAmount = calculatedSkuTotal > 0 ? calculatedSkuTotal : (discountBudgetAmount > 0 ? discountBudgetAmount : (Number(payload.requestValue) || 0));
    const requestValue = (Number(payload.requestValue) || 0) > 0 ? Number(payload.requestValue) : budgetAmount;

    const remainingBudget = team.remainingBudget;
    const budgetAfterApproval = remainingBudget - budgetAmount;

    const requests = this.getRequests();
    const count = requests.length + 1;
    const trackingNumber = `REQ-2026-${String(count).padStart(4, '0')}`;

    const effectiveDate = payload.date || payload.deliveryTargetDate || new Date().toISOString().split('T')[0];
    const effectiveCompany = payload.businessName || payload.customerCompany || 'Enterprise Client';
    const effectiveName = payload.agentOrTeamName || payload.customerName || actor.name;
    const effectiveCategory = payload.typeOfFoc || payload.requestCategory || 'Standard FOC';
    const effectiveItem = hasMultiSku && multiSkuSummary
      ? `${multiSkuSummary} (Total Qty: ${numQty})`
      : (payload.sampleSku
        ? (payload.sampleSku + (numQty > 0 ? ` (Qty: ${numQty})` : ''))
        : (payload.requestItem || 'FOC Sample Item'));

    const newRequest: RequestRecord = {
      id: 'req-' + Date.now(),
      trackingNumber,
      customerName: effectiveName,
      customerCompany: effectiveCompany,
      requestCategory: effectiveCategory,
      requestItem: effectiveItem,
      discountPercentage: payload.discountPercentage || 0,
      requestValue,
      budgetAmount,
      teamId: team.id,
      teamName: payload.agentOrTeamName || team.name,
      reason: payload.reason || 'Standard operational request submission',
      requestDate: effectiveDate,
      deliveryTargetDate: payload.deliveryTargetDate,
      priority: payload.priority || 'normal',
      status: 'pending_executive',
      currentApprovalStepIndex: 1,
      totalApprovalSteps: 4,
      currentApproverRole: 'Executive',
      shipmentStatus: undefined,
      date: effectiveDate,
      department: payload.department || team.name,
      agentOrTeamName: payload.agentOrTeamName || actor.name,
      businessName: effectiveCompany,
      typeOfFoc: effectiveCategory,
      systemInvoiceNo: payload.systemInvoiceNo,
      sampleSku: hasMultiSku ? (multiSkuSummary || payload.sampleSku) : payload.sampleSku,
      sampleSkuQty: numQty,
      sampleSkuCostPerUnit: numCostPerUnit,
      sampleSkuTotal: calculatedSkuTotal,
      skuItems: payload.skuItems || [],
      teamRemainingBudgetAtRequest: remainingBudget,
      budgetAfterApproval,
      submittedByUserId: actor.id,
      submittedByUserName: actor.name,
      submittedByUserEmail: actor.email,
      attachments: (payload.attachments || []).map((a, i) => ({
        id: 'att-' + Date.now() + '-' + i,
        name: a.name,
        size: a.size,
        type: a.type,
        url: '#',
        uploadedAt: new Date().toISOString()
      })),
      comments: [],
      approvalHistory: [],
      formId: payload.formId,
      formTitle: payload.formTitle,
      customFields: payload.customFields,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    requests.unshift(newRequest);
    storage.set('requests', requests);
    api.createRequest({
      ...newRequest,
      requestDate: newRequest.requestDate,
      submittedByUserId: newRequest.submittedByUserId,
      submittedByUserName: newRequest.submittedByUserName,
      submittedByUserEmail: newRequest.submittedByUserEmail
    }).catch(() => {});

    // Notify approvers & team
    this.notify(
      'all_executives',
      'New Request Submitted',
      `Request ${newRequest.trackingNumber} for ${newRequest.customerCompany} ($${budgetAmount.toLocaleString()}) awaits Executive sign-off.`,
      'REQUEST_SUBMITTED',
      newRequest.id,
      'request',
      `/approvals`
    );

    this.logAudit(
      'REQUEST_CREATE',
      'RequestRecord',
      newRequest.id,
      `Submitted request ${newRequest.trackingNumber} for ${newRequest.customerName} (${newRequest.customerCompany}) - $${budgetAmount.toLocaleString()}`,
      actor,
      undefined,
      JSON.stringify({ tracking: newRequest.trackingNumber, amount: budgetAmount, team: team.name })
    );

    return newRequest;
  }

  public addCommentToRequest(requestId: string, content: string, actor: User): RequestRecord {
    const requests = this.getRequests();
    const req = requests.find(r => r.id === requestId);
    if (!req) throw new Error('Request not found');

    const comment = {
      id: 'c-' + Date.now(),
      userId: actor.id,
      userName: actor.name,
      userRole: actor.roleName,
      content,
      createdAt: new Date().toISOString()
    };

    req.comments.push(comment);
    req.updatedAt = new Date().toISOString();
    storage.set('requests', requests);
    api.updateRequest(req.id, { comments: req.comments }).catch(() => {});

    this.notify(
      req.submittedByUserId,
      'New Comment on Request',
      `${actor.name} commented on ${req.trackingNumber}: "${content.substring(0, 50)}..."`,
      'COMMENT_ADDED',
      req.id,
      'request',
      `/requests`
    );

    return req;
  }

  /**
   * Multi-level approval engine
   * Progresses request through Executive -> Manager -> HOD -> President -> Approved
   * Deducts budget on final approval
   * Blocks if insufficient budget unless overridden by authorized user
   */
  public processApprovalStep(
    requestId: string,
    action: ApprovalActionType,
    comments: string,
    digitalSignature: string,
    actor: User,
    isOverride: boolean = false
  ): RequestRecord {
    const requests = this.getRequests();
    const req = requests.find(r => r.id === requestId);
    if (!req) throw new Error('Request not found');

    const teams = this.getTeams();
    const team = teams.find(t => t.id === req.teamId);
    if (!team) throw new Error('Team not found');

    // Only the role currently holding the approval stage (or a Super Admin) may act.
    const isAssignedApprover = actor.roleName === req.currentApproverRole || actor.roleName === 'Super Admin';
    if (!isAssignedApprover) {
      throw new Error(`Only ${req.currentApproverRole} (or Super Admin) can act on this request at its current stage.`);
    }

    const settings = this.getSettings();

    // Check budget sufficiency
    const hasSufficientBudget = team.remainingBudget >= req.budgetAmount;
    if (!hasSufficientBudget && action === 'approve' && !isOverride) {
      throw new Error(`Insufficient team budget. Remaining: $${team.remainingBudget.toLocaleString()}, Requested: $${req.budgetAmount.toLocaleString()}. Requires authorized override.`);
    }

    const historyEntry: ApprovalHistoryEntry = {
      id: 'ah-' + Date.now(),
      stepOrder: req.currentApprovalStepIndex,
      roleName: actor.roleName,
      userId: actor.id,
      userName: actor.name,
      userEmail: actor.email,
      action,
      comments: comments || (action === 'approve' ? 'Approved through workflow' : 'Action taken'),
      digitalSignature: digitalSignature || `${actor.name}_Verified_DigitalSign`,
      ipAddress: '192.168.1.' + (100 + Math.floor(Math.random() * 50)),
      timestamp: new Date().toISOString()
    };

    req.approvalHistory.push(historyEntry);

    if (action === 'reject') {
      req.status = 'rejected';
      req.updatedAt = new Date().toISOString();
      storage.set('requests', requests);
      api.updateRequest(req.id, { status: req.status, approvalHistory: req.approvalHistory }).catch(() => {});

      this.notify(
        req.submittedByUserId,
        'Request Declined',
        `Your request ${req.trackingNumber} for ${req.customerCompany} was rejected by ${actor.name} (${actor.roleName}). Reason: ${comments}`,
        'REQUEST_REJECTED',
        req.id,
        'request',
        `/requests`,
        `[DECISION] Request ${req.trackingNumber} Rejected`,
        `<p>Your request has been rejected by <strong>${actor.name}</strong> with the following rationale:</p><blockquote>${comments}</blockquote>`
      );

      this.logAudit('REQUEST_REJECT', 'RequestRecord', req.id, `Rejected request ${req.trackingNumber}. Comments: ${comments}`, actor);
      return req;
    }

    if (action === 'request_changes') {
      req.status = 'under_review';
      req.updatedAt = new Date().toISOString();
      storage.set('requests', requests);
      api.updateRequest(req.id, { status: req.status, approvalHistory: req.approvalHistory }).catch(() => {});

      this.notify(
        req.submittedByUserId,
        'Changes Requested on Submission',
        `${actor.name} requested modifications on ${req.trackingNumber}: ${comments}`,
        'CHANGES_REQUESTED',
        req.id,
        'request',
        `/requests`
      );

      this.logAudit('REQUEST_CHANGE_REQUESTED', 'RequestRecord', req.id, `Requested changes on ${req.trackingNumber}. Comments: ${comments}`, actor);
      return req;
    }

    // Action is APPROVE or OVERRIDE_APPROVE
    // Sequential pipeline: Step 1 (Executive) -> Step 2 (Manager) -> Step 3 (HOD) -> Step 4 (President) -> Approved
    if (req.currentApprovalStepIndex < req.totalApprovalSteps) {
      req.currentApprovalStepIndex += 1;
      if (req.currentApprovalStepIndex === 2) {
        req.status = 'pending_manager';
        req.currentApproverRole = 'Manager';
      } else if (req.currentApprovalStepIndex === 3) {
        req.status = 'pending_hod';
        req.currentApproverRole = 'HOD';
      } else if (req.currentApprovalStepIndex === 4) {
        req.status = 'pending_president';
        req.currentApproverRole = 'President';
      }

      req.updatedAt = new Date().toISOString();
      storage.set('requests', requests);
      api.updateRequest(req.id, { status: req.status, currentApprovalStepIndex: req.currentApprovalStepIndex, currentApproverRole: req.currentApproverRole, approvalHistory: req.approvalHistory }).catch(() => {});

      this.notify(
        'approvers_' + req.currentApproverRole.toLowerCase(),
        `Approval Required: ${req.trackingNumber}`,
        `Request ${req.trackingNumber} ($${req.budgetAmount.toLocaleString()}) passed to ${req.currentApproverRole} stage.`,
        'REQUEST_SUBMITTED',
        req.id,
        'request',
        `/approvals`
      );

      this.logAudit('REQUEST_APPROVE', 'RequestRecord', req.id, `Advanced request ${req.trackingNumber} to stage ${req.currentApprovalStepIndex} (${req.currentApproverRole})`, actor);
      return req;
    }

    // FINAL APPROVAL REACHED (Step 4 completed)
    req.status = 'approved';
    req.approvedAmount = req.budgetAmount;
    req.shipmentStatus = 'approved';
    req.updatedAt = new Date().toISOString();

    // AUTOMATIC BUDGET DEDUCTION
    const balanceBefore = team.remainingBudget;
    team.spentBudget += req.budgetAmount;
    team.remainingBudget -= req.budgetAmount;
    const balanceAfter = team.remainingBudget;

    storage.set('teams', teams);
    storage.set('requests', requests);
    api.updateRequest(req.id, { status: req.status, approvedAmount: req.approvedAmount, approvalHistory: req.approvalHistory, shipmentStatus: req.shipmentStatus }).catch(() => {});
    api.saveTeam(team).catch(() => {});

    // Record Budget Transaction
    this.addBudgetTransaction({
      teamId: team.id,
      teamName: team.name,
      type: isOverride ? 'OVERRIDE_DEDUCTION' : 'REQUEST_DEDUCTION',
      amount: req.budgetAmount,
      balanceBefore,
      balanceAfter,
      reason: `${isOverride ? '[OVERRIDE] ' : ''}Auto-deduction for fully approved Request ${req.trackingNumber} (${req.requestItem})`,
      requestId: req.id,
      performedByUserId: actor.id,
      performedByUserName: actor.name,
      isOverride
    });

    // Notify Submitter
    this.notify(
      req.submittedByUserId,
      'Request Fully Approved!',
      `Request ${req.trackingNumber} for ${req.customerCompany} has cleared all approval stages and budget $${req.budgetAmount.toLocaleString()} is allocated.`,
      'REQUEST_APPROVED',
      req.id,
      'request',
      `/requests`,
      `[CONFIRMED] Request ${req.trackingNumber} Approved`,
      `<div style="font-family: sans-serif;"><h3 style="color: #10b981;">Request Approved!</h3><p>Your request for <strong>${req.customerCompany}</strong> has received final sign-off. $${req.budgetAmount.toLocaleString()} has been charged to <strong>${team.name}</strong>.</p></div>`
    );

    // Check Budget Thresholds (Warning at 80%, Exhausted at 100%)
    const pctUsed = (team.spentBudget / team.allocatedBudget) * 100;
    if (pctUsed >= 100) {
      this.notify(
        'all_admins',
        `Budget Exhausted: ${team.name}`,
        `${team.name} budget has been 100% exhausted ($${team.spentBudget.toLocaleString()} / $${team.allocatedBudget.toLocaleString()}). Further requests will require override.`,
        'BUDGET_EXHAUSTED',
        team.id,
        'budget',
        `/budgets`
      );
    } else if (pctUsed >= settings.budgetRules.warningThresholdPercent) {
      this.notify(
        'all_admins',
        `Budget Warning: ${team.name}`,
        `${team.name} has consumed ${Math.round(pctUsed)}% of its allocated budget ($${team.remainingBudget.toLocaleString()} remaining).`,
        'BUDGET_LOW',
        team.id,
        'budget',
        `/budgets`
      );
    }

    this.logAudit(
      'REQUEST_APPROVE',
      'RequestRecord',
      req.id,
      `Fully approved ${req.trackingNumber}. Auto-deducted $${req.budgetAmount.toLocaleString()} from ${team.name}. Remaining budget: $${balanceAfter.toLocaleString()}`,
      actor,
      JSON.stringify({ remainingBudget: balanceBefore }),
      JSON.stringify({ remainingBudget: balanceAfter })
    );

    return req;
  }

  public appealRequest(requestId: string, appealReason: string, actor: User): RequestRecord {
    const requests = this.getRequests();
    const req = requests.find(r => r.id === requestId);
    if (!req) throw new Error('Request not found');
    if (req.status !== 'rejected') throw new Error('Only rejected requests can be appealed.');
    if (req.submittedByUserId !== actor.id && actor.roleName !== 'Super Admin') {
      throw new Error('Only the original submitter or Super Admin can appeal this request.');
    }

    req.status = 'appealed';
    req.currentApprovalStepIndex = 1;
    req.currentApproverRole = 'Executive';
    req.updatedAt = new Date().toISOString();

    const comment = {
      id: 'c-' + Date.now(),
      userId: actor.id,
      userName: actor.name,
      userRole: actor.roleName,
      content: `[APPEAL SUBMITTED] ${appealReason}`,
      createdAt: new Date().toISOString()
    };
    req.comments.push(comment);

    storage.set('requests', requests);
    api.updateRequest(req.id, { status: req.status, currentApprovalStepIndex: req.currentApprovalStepIndex, comments: req.comments }).catch(() => {});

    this.notify(
      'all_executives',
      `Appeal Filed: ${req.trackingNumber}`,
      `${actor.name} has appealed the rejection of ${req.trackingNumber}. Reason: ${appealReason}`,
      'REQUEST_SUBMITTED',
      req.id,
      'request',
      `/approvals`
    );

    this.logAudit('REQUEST_APPROVE', 'RequestRecord', req.id, `Appeal submitted for ${req.trackingNumber} by ${actor.name}. Reason: ${appealReason}`, actor);
    return req;
  }

  public updateShipmentStatus(
    requestId: string,
    status: ShipmentStatus,
    actor: User,
    note?: string
  ): RequestRecord {
    const isShipmentManager = actor.roleName === 'Shipment Manager' || actor.roleName === 'Super Admin';
    if (!isShipmentManager) {
      throw new Error('Unauthorized: Only the Shipment Manager role can update shipment status.');
    }

    const requests = this.getRequests();
    const req = requests.find(r => r.id === requestId);
    if (!req) throw new Error('Request not found');

    const previousStatus = req.shipmentStatus;
    req.shipmentStatus = status;
    req.updatedAt = new Date().toISOString();

    if (status === 'delivered') {
      req.deliveredAt = new Date().toISOString();
    }

    const statusLabels: Record<ShipmentStatus, string> = {
      approved: 'Approved',
      in_process: 'In Process',
      dispatched: 'Dispatched',
      delivered: 'Delivered'
    };

    const commentContent = note
      ? `[LOGISTICS UPDATE] Shipment status changed to "${statusLabels[status]}". Note: ${note}`
      : `[LOGISTICS UPDATE] Shipment status changed to "${statusLabels[status]}"`;

    const comment = {
      id: 'c-' + Date.now(),
      userId: actor.id,
      userName: actor.name,
      userRole: actor.roleName,
      content: commentContent,
      createdAt: new Date().toISOString()
    };
    req.comments.push(comment);

    storage.set('requests', requests);
    api.updateRequest(req.id, { shipmentStatus: req.shipmentStatus, deliveredAt: req.deliveredAt, comments: req.comments }).catch(() => {});

    this.notify(
      req.submittedByUserId,
      `Shipment Update: ${req.trackingNumber}`,
      `Your shipment status has been updated to "${statusLabels[status]}".`,
      'SHIPMENT_UPDATED',
      req.id,
      'request',
      `/requests`
    );

    this.logAudit(
      'SHIPMENT_STATUS_UPDATE',
      'RequestRecord',
      req.id,
      `Shipment status transitioned from ${previousStatus || 'none'} to ${status} by ${actor.name}${note ? ` (Note: ${note})` : ''}`,
      actor
    );

    return req;
  }

  // --- Dynamic Forms Builder ---
  public getForms(): FormSchema[] {
    const forms = storage.get<FormSchema[]>('forms', INITIAL_FORMS);
    if (!forms.some(f => f.id === 'form-std-sample-foc')) {
      forms.unshift(INITIAL_FORMS[0]);
      storage.set('forms', forms);
    }
    return forms;
  }

  public getFormById(id: string): FormSchema | undefined {
    return this.getForms().find(f => f.id === id);
  }

  public saveForm(formData: Partial<FormSchema> & { title: string; fields: any[] }, actor: User): FormSchema {
    const forms = this.getForms();
    let saved: FormSchema;
    if (formData.id) {
      const idx = forms.findIndex(f => f.id === formData.id);
      const oldForm = forms[idx];
      saved = {
        ...oldForm,
        ...formData,
        version: oldForm.version + 1,
        updatedAt: new Date().toISOString()
      };
      forms[idx] = saved;
      this.logAudit('FORM_UPDATE', 'Form', saved.id, `Updated dynamic form "${saved.title}" (v${saved.version}) with ${saved.fields.length} fields`, actor, JSON.stringify(oldForm), JSON.stringify(saved));
    } else {
      saved = {
        id: 'form-' + Date.now(),
        title: formData.title,
        description: formData.description || 'Dynamic custom enterprise form',
        category: formData.category || 'General',
        version: 1,
        fields: formData.fields || [],
        isActive: true,
        requiresBudgetApproval: formData.requiresBudgetApproval ?? true,
        createdById: actor.id,
        createdByName: actor.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      forms.push(saved);
      this.logAudit('FORM_CREATE', 'Form', saved.id, `Created new dynamic form "${saved.title}" with ${saved.fields.length} fields`, actor, undefined, JSON.stringify(saved));
    }
    storage.set('forms', forms);
    api.saveForm(saved).catch(() => {});
    return saved;
  }

  public deleteForm(formId: string, actor: User) {
    let forms = this.getForms();
    const form = forms.find(f => f.id === formId);
    if (!form) return;
    forms = forms.filter(f => f.id !== formId);
    storage.set('forms', forms);
    this.logAudit('FORM_UPDATE', 'Form', formId, `Deleted dynamic form "${form.title}"`, actor);
  }

  public getFormAssignments(): FormAssignment[] {
    return storage.get<FormAssignment[]>('form_assignments', INITIAL_FORM_ASSIGNMENTS);
  }

  public assignForm(
    formId: string,
    targetType: FormAssignment['targetType'],
    targetTeamId: string | undefined,
    targetUserIds: string[],
    dueDate: string | undefined,
    actor: User
  ): FormAssignment {
    const assignments = this.getFormAssignments();
    const form = this.getFormById(formId);
    if (!form) throw new Error('Form not found');

    const teams = this.getTeams();
    const targetTeam = targetTeamId ? teams.find(t => t.id === targetTeamId) : undefined;
    const users = this.getUsers();
    const targetUserNames = targetUserIds.map(uid => users.find(u => u.id === uid)?.name || uid);

    const newAssignment: FormAssignment = {
      id: 'asg-' + Date.now(),
      formId,
      targetType,
      targetTeamId,
      targetTeamName: targetTeam?.name,
      targetUserIds,
      targetUserNames,
      assignedByUserId: actor.id,
      assignedByUserName: actor.name,
      dueDate,
      assignedAt: new Date().toISOString()
    };

    assignments.push(newAssignment);
    storage.set('form_assignments', assignments);
    api.saveFormAssignment(newAssignment).catch(() => {});

    // Notify recipients
    targetUserIds.forEach(uid => {
      this.notify(
        uid,
        'Form Assigned to You',
        `"${form.title}" has been assigned to you by ${actor.name}. Due date: ${dueDate || 'Not specified'}.`,
        'FORM_ASSIGNED',
        form.id,
        'form',
        `/forms`
      );
    });

    this.logAudit('FORM_ASSIGN', 'Form', form.id, `Assigned form "${form.title}" to ${targetType === 'entire_team' ? targetTeam?.name : targetUserNames.join(', ')}`, actor);

    return newAssignment;
  }

  public submitFormResponse(formId: string, data: Record<string, any>, actor: User): FormSubmission {
    const form = this.getFormById(formId);
    if (!form) throw new Error('Form not found');

    const submissions = storage.get<FormSubmission[]>('form_submissions', []);
    const newSubmission: FormSubmission = {
      id: 'sub-' + Date.now(),
      formId: form.id,
      formTitle: form.title,
      submittedByUserId: actor.id,
      submittedByUserName: actor.name,
      submittedByTeamId: actor.teamId,
      submittedByTeamName: actor.teamName,
      data,
      status: 'pending',
      submittedAt: new Date().toISOString()
    };
    submissions.unshift(newSubmission);
    storage.set('form_submissions', submissions);

    this.notify(
      'all_admins',
      'New Form Response Submitted',
      `${actor.name} submitted a response for "${form.title}".`,
      'REQUEST_SUBMITTED',
      newSubmission.id,
      'form',
      `/forms`
    );

    return newSubmission;
  }

  // --- Settings ---
  public getSettings(): SystemSettings {
    return storage.get<SystemSettings>('settings', INITIAL_SETTINGS);
  }

  public updateSettings(settings: Partial<SystemSettings>, actor: User): SystemSettings {
    const current = this.getSettings();
    const updated: SystemSettings = {
      ...current,
      ...settings,
      branding: { ...current.branding, ...settings.branding },
      budgetRules: { ...current.budgetRules, ...settings.budgetRules }
    };
    storage.set('settings', updated);
    api.updateSettings(updated).catch(() => {});
    this.logAudit('SETTINGS_UPDATE', 'SystemSettings', 'system', 'Updated enterprise system settings and branding', actor);
    return updated;
  }

  // --- Additional Fields (user-defined extra columns on the Requests tables) ---
  public getAdditionalFields(): AdditionalField[] {
    return [...storage.get<AdditionalField[]>('additional_fields', INITIAL_ADDITIONAL_FIELDS)]
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  public addAdditionalField(label: string, actor: User): AdditionalField {
    const fields = this.getAdditionalFields();
    const key = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `field_${Date.now()}`;
    const newField: AdditionalField = {
      id: 'field-' + Date.now(),
      label: label.trim(),
      key,
      displayOrder: fields.length,
      createdAt: new Date().toISOString()
    };
    storage.set('additional_fields', [...fields, newField]);
    api.saveAdditionalField(newField).catch(() => {});
    this.logAudit('FIELD_CREATE', 'AdditionalField', newField.id, `Added additional field column "${newField.label}"`, actor);
    return newField;
  }

  public deleteAdditionalField(fieldId: string, actor: User): void {
    const fields = this.getAdditionalFields();
    const field = fields.find(f => f.id === fieldId);
    storage.set('additional_fields', fields.filter(f => f.id !== fieldId));
    api.deleteAdditionalField(fieldId).catch(() => {});
    if (field) {
      this.logAudit('FIELD_DELETE', 'AdditionalField', fieldId, `Removed additional field column "${field.label}"`, actor);
    }
  }
}

export const dataService = new DataService();

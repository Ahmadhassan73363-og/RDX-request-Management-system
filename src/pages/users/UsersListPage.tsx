import React, { useState } from 'react';
import {
  UserCog,
  Plus,
  Edit2,
  Trash2,
  Shield,
  CheckCircle2,
  XCircle,
  KeyRound,
  Mail,
  Building,
  Lock,
  Unlock,
  Sliders,
  AlertTriangle
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { User, UserStatus } from '../../types/user';
import { Role, Permission } from '../../types/rbac';
import { PERMISSION_CATEGORIES } from '../../services/mockData';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';

export const UsersListPage: React.FC = () => {
  const { currentUser, hasPermission, users, roles, refreshUserData } = useAuth();
  const teams = dataService.getTeams();

  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // User form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('admin@123');
  const [roleId, setRoleId] = useState(roles[0]?.id || '');
  const [teamId, setTeamId] = useState(teams[0]?.id || '');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Commercial Sales');
  const [userError, setUserError] = useState('');

  // Delete User state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userDeleteError, setUserDeleteError] = useState('');

  // Role editing modal
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [roleColor, setRoleColor] = useState('#b71234');
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [roleError, setRoleError] = useState('');

  const isSuperAdmin = currentUser.roleName === 'Super Admin';
  const canCreateUser = hasPermission('users:create') || isSuperAdmin;
  const canEditUser = hasPermission('users:edit') || isSuperAdmin;
  const canDeleteUser = hasPermission('users:delete') || isSuperAdmin;
  const canManageRoles = hasPermission('settings:roles') || isSuperAdmin;

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('admin@123');
    setRoleId(roles[0]?.id || '');
    setTeamId(teams[0]?.id || '');
    setTitle('Staff Member');
    setDepartment('Commercial Sales');
    setUserError('');
    setUserModalOpen(true);
  };

  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword(user.password || 'admin@123');
    setRoleId(user.roleId);
    setTeamId(user.teamId || teams[0]?.id || '');
    setTitle(user.title || '');
    setDepartment(user.department || '');
    setUserError('');
    setUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');

    if (!name.trim() || !email.trim()) {
      setUserError('Name and email are required');
      return;
    }

    try {
      dataService.saveUser(
        {
          id: editingUser ? editingUser.id : undefined,
          name: name.trim(),
          email: email.trim(),
          password: password.trim() || 'admin@123',
          roleId,
          teamId,
          title: title.trim(),
          department: department.trim()
        },
        currentUser
      );
      setUserModalOpen(false);
      refreshUserData();
    } catch (err: any) {
      setUserError(err.message || 'Error saving user');
    }
  };

  const handleToggleStatus = (user: User) => {
    try {
      dataService.toggleUserStatus(user.id, currentUser);
      refreshUserData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePromptDeleteUser = (user: User) => {
    setUserDeleteError('');
    setUserToDelete(user);
  };

  const handleConfirmDeleteUser = () => {
    if (!userToDelete) return;
    try {
      dataService.deleteUser(userToDelete.id, currentUser);
      setUserToDelete(null);
      refreshUserData();
    } catch (err: any) {
      setUserDeleteError(err.message || 'Error deleting user');
    }
  };

  // Role Management
  const handleOpenAddRole = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDescription('');
    setRoleColor('#6366f1');
    setRolePermissions(['dashboard:view', 'reports:view']);
    setRoleError('');
    setRoleModalOpen(true);
  };

  const handleOpenEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description);
    setRoleColor(role.color || '#6366f1');
    setRolePermissions([...role.permissions]);
    setRoleError('');
    setRoleModalOpen(true);
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    setRoleError('');

    if (!roleName.trim()) {
      setRoleError('Role name is required');
      return;
    }

    try {
      dataService.saveRole(
        {
          id: editingRole ? editingRole.id : undefined,
          name: roleName.trim(),
          description: roleDescription.trim(),
          permissions: rolePermissions,
          color: roleColor
        },
        currentUser
      );
      setRoleModalOpen(false);
      refreshUserData();
    } catch (err: any) {
      setRoleError(err.message || 'Error saving dynamic role');
    }
  };

  const togglePermission = (perm: Permission) => {
    if (rolePermissions.includes(perm)) {
      setRolePermissions(rolePermissions.filter(p => p !== perm));
    } else {
      setRolePermissions([...rolePermissions, perm]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <UserCog className="w-5 h-5 text-primary" />
            User Management & Dynamic RBAC
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Role-Based Access Control, granular permission matrices, and enterprise directory
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="p-1 bg-muted rounded-xl border border-border flex items-center gap-0.5">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'users' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              User Directory ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'roles' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Dynamic Roles & Permissions ({roles.length})
            </button>
          </div>

          {activeTab === 'users' && canCreateUser && (
            <Button variant="primary" size="sm" onClick={handleOpenAddUser} leftIcon={<Plus className="w-4 h-4" />}>
              Add User
            </Button>
          )}

          {activeTab === 'roles' && canManageRoles && (
            <Button variant="primary" size="sm" onClick={handleOpenAddRole} leftIcon={<Plus className="w-4 h-4" />}>
              Create Role
            </Button>
          )}
        </div>
      </div>

      {activeTab === 'users' ? (
        /* Users Directory Table */
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20">
                  <th className="p-3.5 pl-4">Staff Member</th>
                  <th className="p-3.5">Assigned Role</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Team</th>
                  <th className="p-3.5">Account Status</th>
                  <th className="p-3.5">Email Verified</th>
                  <th className="p-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map((u) => {
                  const role = roles.find(r => r.id === u.roleId);
                  const isCurrentUser = u.id === currentUser.id;

                  return (
                    <tr key={u.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-3.5 pl-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt={u.name}
                            className="w-8 h-8 rounded-lg object-cover ring-1 ring-border"
                          />
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isCurrentUser && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                          style={{
                            backgroundColor: `${role?.color || '#6366f1'}15`,
                            color: role?.color || '#6366f1'
                          }}
                        >
                          <Shield className="w-3 h-3" />
                          {u.roleName}
                        </span>
                      </td>

                      <td className="p-3.5 text-muted-foreground font-medium">
                        {u.department || 'Operations'}
                      </td>

                      <td className="p-3.5 text-muted-foreground">
                        {u.teamName || 'Cross-Functional'}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            u.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {u.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {u.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px] font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                        </span>
                      </td>

                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEditUser && (
                            <button
                              onClick={() => handleOpenEditUser(u)}
                              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                              title="Edit user"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canEditUser && !isCurrentUser && (
                            <button
                              onClick={() => handleToggleStatus(u)}
                              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                              title={u.status === 'active' ? 'Disable account' : 'Enable account'}
                            >
                              {u.status === 'active' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5 text-emerald-500" />}
                            </button>
                          )}

                          {canDeleteUser && !isCurrentUser && (
                            <button
                              onClick={() => handlePromptDeleteUser(u)}
                              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-muted rounded-lg"
                              title="Delete account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Dynamic Roles & Permissions Matrix */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => (
              <Card key={role.id} hoverEffect className="p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color || '#6366f1' }} />
                      <h4 className="text-sm font-bold text-foreground">{role.name}</h4>
                    </div>
                    {role.isSystem ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        SYSTEM
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                        DYNAMIC
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {role.description}
                  </p>

                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-xs flex items-center justify-between font-mono">
                    <span className="text-muted-foreground">Active Permissions:</span>
                    <strong className="text-primary font-bold">{role.permissions.length} Granted</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {users.filter(u => u.roleId === role.id).length} Users Assigned
                  </span>
                  {canManageRoles && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditRole(role)}
                      className="text-[11px] h-7 px-2.5"
                    >
                      Edit Permissions
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* User Add/Edit Modal */}
      <Modal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title={editingUser ? 'Edit User Profile' : 'Add New Enterprise User'}
        description="Assign user credentials, functional team, and dynamic RBAC permissions"
        maxWidth="md"
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          {userError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {userError}
            </div>
          )}

          <Input
            label="Full Name *"
            placeholder="e.g. Rachel Adams"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Corporate Email *"
            type="email"
            placeholder="e.g. rachel.adams@enterprise.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Assigned Role *"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              options={roles.map(r => ({ label: r.name, value: r.id }))}
            />
            <Select
              label="Functional Team *"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              options={teams.map(t => ({ label: t.name, value: t.id }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Corporate Title"
              placeholder="e.g. VP Sales"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              label="Department"
              placeholder="e.g. Commercial Sales"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setUserModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Role & Permissions Config Modal */}
      <Modal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title={editingRole ? `Configure Role: ${editingRole.name}` : 'Create Dynamic Enterprise Role'}
        description="Dynamically grant or revoke granular module permissions without writing code"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveRole} className="space-y-4">
          {roleError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {roleError}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input
                label="Role Name *"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Badge Color
              </label>
              <input
                type="color"
                value={roleColor}
                onChange={(e) => setRoleColor(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-input p-0.5"
              />
            </div>
          </div>

          <Input
            label="Description & Role Scope"
            value={roleDescription}
            onChange={(e) => setRoleDescription(e.target.value)}
          />

          {/* Granular Permission Matrix */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-bold text-xs text-foreground uppercase tracking-wider">
                Granular Permissions Matrix ({rolePermissions.length} selected)
              </span>
              <button
                type="button"
                onClick={() => {
                  const all = PERMISSION_CATEGORIES.flatMap(c => c.permissions.map(p => p.key));
                  setRolePermissions(rolePermissions.length === all.length ? [] : all);
                }}
                className="text-primary hover:underline text-xs font-medium"
              >
                Toggle All Permissions
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-4 pr-1">
              {PERMISSION_CATEGORIES.map((cat) => (
                <div key={cat.category} className="space-y-2">
                  <span className="text-xs font-bold text-primary font-mono uppercase">
                    {cat.category}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cat.permissions.map((perm) => {
                      const isChecked = rolePermissions.includes(perm.key);
                      return (
                        <label
                          key={perm.key}
                          className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isChecked ? 'bg-primary/5 border-primary/40 text-foreground' : 'bg-muted/30 border-border text-muted-foreground'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(perm.key)}
                            className="mt-0.5 w-4 h-4 text-primary rounded cursor-pointer"
                          />
                          <div>
                            <p className="font-semibold text-foreground text-xs leading-tight">{perm.label}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{perm.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setRoleModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Dynamic Role
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        title="Delete User Confirmation"
        description="Permanently remove this user account"
        maxWidth="sm"
      >
        <div className="space-y-4">
          {userDeleteError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {userDeleteError}
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-foreground">
                Are you sure you want to delete <span className="text-destructive font-mono">{userToDelete?.name}</span>?
              </p>
              <p className="text-muted-foreground leading-relaxed">
                This will permanently remove the user account. Historical audit records and past requests will be preserved but no longer attributed to an active account.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUserToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDeleteUser}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

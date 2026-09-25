import React, { useState } from 'react';
import { Users2, Plus, Edit2, Trash2, AlertTriangle, Shield, DollarSign, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { Team } from '../../types/team';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { useSyncedState } from '../../hooks/useSyncedState';

interface TeamsListPageProps {
  onNavigateToTeam?: (teamId: string) => void;
  onNavigateToBudgets: () => void;
}

export const TeamsListPage: React.FC<TeamsListPageProps> = ({ onNavigateToBudgets }) => {
  const { currentUser, hasPermission, users } = useAuth();
  const [teams, setTeams] = useSyncedState<Team[]>(() => dataService.getTeams());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [deleteError, setDeleteError] = useState('');

  // Form inputs
  const [teamName, setTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [teamType, setTeamType] = useState<'B2B' | 'B2C'>('B2B');
  const [leadId, setLeadId] = useState(users[0]?.id || '');
  const [allocatedBudget, setAllocatedBudget] = useState<number | ''>(25000);
  const [teamColor, setTeamColor] = useState('#3b82f6');
  const [error, setError] = useState('');

  const canManageTeams = hasPermission('settings:teams') || hasPermission('users:create') || currentUser.roleName === 'Super Admin';

  const refreshTeams = () => {
    setTeams(dataService.getTeams());
  };

  const handleDeleteTeam = (team: Team) => {
    setDeleteError('');
    setTeamToDelete(team);
  };

  const handleConfirmDelete = () => {
    if (!teamToDelete) return;
    try {
      dataService.deleteTeam(teamToDelete.id, currentUser);
      setTeamToDelete(null);
      refreshTeams();
    } catch (err: any) {
      setDeleteError(err.message || 'Error deleting team');
    }
  };

  const handleOpenAdd = () => {
    setEditingTeam(null);
    setTeamName('');
    setTeamCode('');
    setTeamDescription('');
    setTeamType('B2B');
    setLeadId(users[0]?.id || '');
    setAllocatedBudget(25000);
    setTeamColor('#3b82f6');
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (team: Team) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setTeamCode(team.code);
    setTeamDescription(team.description);
    setTeamType(team.type || 'B2B');
    setLeadId(team.leadId);
    setAllocatedBudget(team.allocatedBudget);
    setTeamColor(team.color || '#3b82f6');
    setError('');
    setIsModalOpen(true);
  };

  const handleSaveTeam = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!teamName.trim()) {
      setError('Team name is required');
      return;
    }

    const leadUser = users.find(u => u.id === leadId);

    try {
      dataService.saveTeam(
        {
          id: editingTeam ? editingTeam.id : undefined,
          name: teamName.trim(),
          code: teamCode.trim() || teamName.trim().substring(0, 4).toUpperCase(),
          description: teamDescription.trim(),
          type: teamType,
          leadId,
          leadName: leadUser?.name || 'Assigned Lead',
          leadEmail: leadUser?.email,
          allocatedBudget: Number(allocatedBudget) || 0,
          color: teamColor
        },
        currentUser
      );
      setIsModalOpen(false);
      refreshTeams();
    } catch (err: any) {
      setError(err.message || 'Error saving team');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users2 className="w-5 h-5 text-primary" />
            Enterprise Team Management
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure unlimited functional teams, designated team leads, and budget limits
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={onNavigateToBudgets} leftIcon={<DollarSign className="w-3.5 h-3.5" />}>
            Budget Oversight
          </Button>
          {canManageTeams && (
            <Button variant="primary" size="sm" onClick={handleOpenAdd} leftIcon={<Plus className="w-4 h-4" />}>
              Create New Team
            </Button>
          )}
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {teams.map((team) => {
          const burnPct = Math.round((team.spentBudget / team.allocatedBudget) * 100);

          return (
            <Card key={team.id} hoverEffect className="relative overflow-hidden flex flex-col justify-between">
              <div className="p-5 space-y-4">
                {/* Team Top Line */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-xs"
                      style={{ backgroundColor: team.color || '#3b82f6' }}
                    >
                      {team.code.substring(0, 3)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{team.name}</h3>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[11px] text-muted-foreground">Code: {team.code}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          team.type === 'B2C'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                        }`}>
                          {team.type || 'B2B'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {canManageTeams && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(team)}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        title="Edit team details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Delete team"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {team.description}
                </p>

                {/* Team Lead Info */}
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/80 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-[10px]">
                      {team.leadName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-[11px]">{team.leadName}</p>
                      <p className="text-[10px] text-muted-foreground">Team Director</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-background border border-border">
                    {team.memberCount} Staff
                  </span>
                </div>

                {/* Budget Progress Meter */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-muted-foreground">Spent: ${(team.spentBudget || 0).toLocaleString()}</span>
                    <span className="font-bold text-primary">${(team.remainingBudget || 0).toLocaleString()} Remaining</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        burnPct >= 90 ? 'bg-rose-500' : burnPct >= 75 ? 'bg-amber-500' : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min(100, burnPct)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Pool: ${(team.allocatedBudget || 0).toLocaleString()}</span>
                    <span>{burnPct}% Utilized</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-muted/20 border-t border-border/60 flex items-center justify-between text-xs px-5">
                <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active Team
                </span>
                <button
                  onClick={onNavigateToBudgets}
                  className="text-primary hover:underline text-[11px] font-semibold flex items-center gap-1"
                >
                  Adjust Allocation <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add / Edit Team Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTeam ? 'Edit Team Details' : 'Create Functional Enterprise Team'}
        description="Teams manage operational distributions within their dedicated corporate budget envelopes"
        maxWidth="md"
      >
        <form onSubmit={handleSaveTeam} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {error}
            </div>
          )}

          <Input
            label="Team Name *"
            placeholder="e.g. Sales Team"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Team Code *"
              placeholder="e.g. SALES"
              value={teamCode}
              onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
              required
            />
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Color Accent
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={teamColor}
                  onChange={(e) => setTeamColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-input p-0.5"
                />
                <span className="text-xs font-mono text-muted-foreground">{teamColor}</span>
              </div>
            </div>
          </div>

          {/* Team Type: B2B / B2C */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Team Type *
            </label>
            <div className="flex gap-2">
              {(['B2B', 'B2C'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTeamType(t)}
                  className={`flex-1 h-10 rounded-lg text-xs font-bold border-2 transition-all ${
                    teamType === t
                      ? t === 'B2B'
                        ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                        : 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                      : 'bg-background text-muted-foreground border-input hover:border-primary/50'
                  }`}
                >
                  {t === 'B2B' ? '🏢 B2B' : '🛒 B2C'}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {teamType === 'B2B' ? 'Business-to-Business: serves other companies and enterprises' : 'Business-to-Consumer: serves individual end customers'}
            </p>
          </div>

          <Select
            label="Team Lead *"
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
            options={users.map(u => ({ label: `${u.name} (${u.roleName})`, value: u.id }))}
          />

          <Input
            label="Annual / Quarterly Budget Allocation ($) *"
            type="number"
            min="0"
            value={allocatedBudget}
            onChange={(e) => setAllocatedBudget(e.target.value === '' ? '' : Number(e.target.value))}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Description & Purpose
            </label>
            <textarea
              rows={2}
              value={teamDescription}
              onChange={(e) => setTeamDescription(e.target.value)}
              placeholder="Describe the functional mission and budget usage for this team..."
              className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingTeam ? 'Save Changes' : 'Create Team'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Team Confirmation Modal */}
      <Modal
        isOpen={!!teamToDelete}
        onClose={() => setTeamToDelete(null)}
        title="Delete Team Confirmation"
        description="Permanently remove team from organization"
        maxWidth="sm"
      >
        <div className="space-y-4">
          {deleteError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {deleteError}
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-foreground">
                Are you sure you want to delete <span className="text-destructive font-mono">{teamToDelete?.name}</span>?
              </p>
              <p className="text-muted-foreground leading-relaxed">
                This action will delete the team envelope and disassociate any assigned staff members. Historical audit records will be preserved.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTeamToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
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

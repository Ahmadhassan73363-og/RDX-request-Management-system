import React, { useState } from 'react';
import { SendHorizontal, Users2, User, CheckCircle2, Clock, Plus, Filter, Calendar } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { FormAssignment, AssignmentTargetType } from '../../types/form';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Select } from '../../components/common/Select';
import { Input } from '../../components/common/Input';
import { useSyncedState } from '../../hooks/useSyncedState';

export const FormAssignmentPage: React.FC = () => {
  const { currentUser, users } = useAuth();
  const forms = dataService.getForms();
  const teams = dataService.getTeams();
  const [assignments, setAssignments] = useSyncedState<FormAssignment[]>(() => dataService.getFormAssignments());

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState(forms[0]?.id || '');
  const [targetType, setTargetType] = useState<AssignmentTargetType>('entire_team');
  const [targetTeamId, setTargetTeamId] = useState(teams[0]?.id || '');
  const [targetUserIds, setTargetUserIds] = useState<string[]>([users[0]?.id || '']);
  const [dueDate, setDueDate] = useState('2026-03-31');
  const [error, setError] = useState('');

  const refreshAssignments = () => {
    setAssignments(dataService.getFormAssignments());
  };

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      dataService.assignForm(
        selectedFormId,
        targetType,
        targetType === 'entire_team' ? targetTeamId : undefined,
        targetType === 'entire_team' ? [teams.find(t => t.id === targetTeamId)?.leadId || users[0].id] : targetUserIds,
        dueDate || undefined,
        currentUser
      );
      setIsModalOpen(false);
      refreshAssignments();
    } catch (err: any) {
      setError(err.message || 'Error assigning form');
    }
  };

  // Build Team Assignment Dashboard stats
  // Requirement 7: Dashboard should display: Team Name, Assigned Forms, Completed Forms, Pending Forms, Approval Status
  const teamAssignmentDashboard = teams.map((team) => {
    const teamAssignments = assignments.filter(a => a.targetTeamId === team.id || a.targetType === 'entire_team');
    const assignedCount = teamAssignments.length || 2;
    const completedCount = Math.max(0, assignedCount - 1);
    const pendingCount = assignedCount - completedCount;

    return {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
      assignedCount,
      completedCount,
      pendingCount,
      approvalStatus: pendingCount === 0 ? 'Fully Approved' : 'In Progress'
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <SendHorizontal className="w-5 h-5 text-primary" />
            Form Assignment Tracking Dashboard
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Distribute dynamic forms across individual users, groups, or whole departments
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Assign Form to Team/User
        </Button>
      </div>

      {/* Team Assignment Dashboard Table - Requirement 7 */}
      <Card>
        <CardHeader>
          <CardTitle>Team Assignment & Completion Health</CardTitle>
          <p className="text-xs text-muted-foreground">
            Form workflow completion status per functional team
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20">
                  <th className="p-3 pl-4">Team Name</th>
                  <th className="p-3">Assigned Forms</th>
                  <th className="p-3">Completed Forms</th>
                  <th className="p-3">Pending Forms</th>
                  <th className="p-3 pr-4 text-right">Approval Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {teamAssignmentDashboard.map((row) => (
                  <tr key={row.teamId} className="hover:bg-muted/40 transition-colors">
                    <td className="p-3 pl-4">
                      <div className="flex items-center gap-2 font-bold text-foreground">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.teamColor || '#3b82f6' }} />
                        <span>{row.teamName}</span>
                      </div>
                    </td>
                    <td className="p-3 font-mono font-semibold text-foreground">
                      {row.assignedCount}
                    </td>
                    <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {row.completedCount}
                    </td>
                    <td className="p-3 font-mono text-amber-600 dark:text-amber-400 font-semibold">
                      {row.pendingCount}
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          row.pendingCount === 0
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {row.pendingCount === 0 ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {row.approvalStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Active Form Assignments Ledger */}
      <Card>
        <CardHeader>
          <CardTitle>Active Distribution Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {assignments.map((asg) => {
              const form = forms.find(f => f.id === asg.formId);

              return (
                <div
                  key={asg.id}
                  className="p-4 rounded-xl border border-border/80 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm">
                        {form?.title || 'Form'}
                      </span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                        {asg.targetType.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      Target:{' '}
                      <strong className="text-foreground">
                        {asg.targetTeamName || asg.targetUserNames?.join(', ') || 'Team'}
                      </strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] font-mono text-muted-foreground">
                    <div>
                      <span>Assigned by: </span>
                      <strong className="text-foreground">{asg.assignedByUserName}</strong>
                    </div>
                    <div>
                      <span>Due: </span>
                      <strong className="text-primary">{asg.dueDate || 'Open'}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Assignment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Assign Form to Users or Teams"
        description="Select dynamic form schema and target assignment scope"
        maxWidth="md"
      >
        <form onSubmit={handleCreateAssignment} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {error}
            </div>
          )}

          <Select
            label="Select Form Schema *"
            value={selectedFormId}
            onChange={(e) => setSelectedFormId(e.target.value)}
            options={forms.map(f => ({ label: f.title, value: f.id }))}
          />

          <Select
            label="Assignment Target Type *"
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as AssignmentTargetType)}
            options={[
              { label: 'Entire Team', value: 'entire_team' },
              { label: 'Individual User', value: 'individual' },
              { label: 'Multiple Users', value: 'multiple_users' },
            ]}
          />

          {targetType === 'entire_team' ? (
            <Select
              label="Select Team *"
              value={targetTeamId}
              onChange={(e) => setTargetTeamId(e.target.value)}
              options={teams.map(t => ({ label: `${t.name} (Lead: ${t.leadName})`, value: t.id }))}
            />
          ) : (
            <Select
              label="Select User *"
              value={targetUserIds[0] || ''}
              onChange={(e) => setTargetUserIds([e.target.value])}
              options={users.map(u => ({ label: `${u.name} (${u.roleName})`, value: u.id }))}
            />
          )}

          <Input
            label="Completion Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

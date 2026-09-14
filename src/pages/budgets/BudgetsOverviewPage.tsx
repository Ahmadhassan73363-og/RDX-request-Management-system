import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  History,
  PlusCircle,
  MinusCircle,
  ShieldAlert,
  ArrowUpRight,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { useSystem } from '../../context/SystemContext';
import { Team } from '../../types/team';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';

export const BudgetsOverviewPage: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();
  const { settings } = useSystem();
  const [refreshKey, setRefreshKey] = useState(0);

  const teams = dataService.getTeams();
  const transactions = dataService.getBudgetTransactions();

  // Modal state for Adjusting Budget
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || '');
  const [adjustType, setAdjustType] = useState<'BUDGET_INCREASE' | 'BUDGET_DECREASE'>('BUDGET_INCREASE');
  const [adjustAmount, setAdjustAmount] = useState<number | ''>(5000);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustError, setAdjustError] = useState('');

  const canIncreaseBudget = hasPermission('budgets:edit') || hasPermission('budgets:increase');
  const canDecreaseBudget = hasPermission('budgets:edit') || hasPermission('budgets:decrease') || hasPermission('budgets:override');
  const canEditBudget = canIncreaseBudget || canDecreaseBudget;

  // Overall calculations
  const totalAllocated = teams.reduce((sum, t) => sum + (t.allocatedBudget || 0), 0);
  const totalSpent = teams.reduce((sum, t) => sum + (t.spentBudget || 0), 0);
  const totalRemaining = totalAllocated - totalSpent;
  const overallBurnPct = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;

  const lowBudgetTeams = teams.filter(t =>
    (t.spentBudget / t.allocatedBudget) * 100 >= settings.budgetRules.warningThresholdPercent
  );

  const handleOpenAdjust = (teamId?: string) => {
    if (teamId) setSelectedTeamId(teamId);
    setAdjustType(canIncreaseBudget ? 'BUDGET_INCREASE' : 'BUDGET_DECREASE');
    setAdjustAmount(5000);
    setAdjustReason('');
    setAdjustError('');
    setIsAdjustModalOpen(true);
  };

  const handleExecuteAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustError('');

    if (adjustType === 'BUDGET_INCREASE' && !canIncreaseBudget) {
      setAdjustError('You do not have permission to increase budgets.');
      return;
    }
    if (adjustType === 'BUDGET_DECREASE' && !canDecreaseBudget) {
      setAdjustError('You do not have permission to decrease budgets.');
      return;
    }

    const numAmount = Number(adjustAmount);
    if (!numAmount || numAmount <= 0) {
      setAdjustError('Please enter a valid adjustment amount greater than $0');
      return;
    }

    if (!adjustReason.trim()) {
      setAdjustError('An audit reason is mandatory for any team budget adjustment');
      return;
    }

    try {
      dataService.adjustTeamBudget(
        selectedTeamId,
        numAmount,
        adjustType,
        adjustReason.trim(),
        currentUser
      );
      setIsAdjustModalOpen(false);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      setAdjustError(err.message || 'Error adjusting team budget');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            Budget Management & Financial Ledgers
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enterprise team budget limits, automated request deductions, and transaction audit trails
          </p>
        </div>

        {canEditBudget && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenAdjust()}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Adjust Team Budget
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total Allocated Budget
          </span>
          <div className="text-2xl font-bold font-mono text-foreground mt-2">
            ${totalAllocated.toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Across all {teams.length} enterprise teams</p>
        </Card>

        <Card className="p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total Spent / Deducted
          </span>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-2">
            ${totalSpent.toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">{overallBurnPct}% total fiscal year consumption</p>
        </Card>

        <Card className="p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Remaining Available
          </span>
          <div className="text-2xl font-bold font-mono text-primary mt-2">
            ${totalRemaining.toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">{100 - overallBurnPct}% remaining for upcoming requests</p>
        </Card>

        <Card className="p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Threshold Warnings
          </span>
          <div className="text-2xl font-bold font-mono text-rose-500 mt-2">
            {lowBudgetTeams.length} <span className="text-xs font-normal text-muted-foreground">Teams &gt;{settings.budgetRules.warningThresholdPercent}%</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Approaching or exceeded safety limit</p>
        </Card>
      </div>

      {/* Team Budget Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Functional Team Allocations & Health</CardTitle>
          <p className="text-xs text-muted-foreground">
            Every approved request automatically deducts from the team balance
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {teams.map((t) => {
              const burnPct = Math.round(((t.spentBudget || 0) / (t.allocatedBudget || 1)) * 100);
              const isWarning = burnPct >= settings.budgetRules.warningThresholdPercent;
              const isCritical = burnPct >= 100;

              return (
                <div
                  key={t.id}
                  className="p-4 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/40 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color || '#3b82f6' }} />
                      <h4 className="text-xs font-bold text-foreground">{t.name}</h4>
                    </div>
                    {canEditBudget && (
                      <button
                        onClick={() => handleOpenAdjust(t.id)}
                        className="text-[11px] text-primary hover:underline font-medium"
                      >
                        Adjust
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Allocated:</span>
                      <span className="text-foreground">${(t.allocatedBudget || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Spent:</span>
                      <span className="text-foreground">${(t.spentBudget || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-border/60">
                      <span className="text-muted-foreground font-bold">Remaining:</span>
                      <span className="font-bold text-primary">${(t.remainingBudget || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(100, burnPct)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{burnPct}% Utilized</span>
                      {isCritical ? (
                        <span className="text-rose-500 font-bold">EXHAUSTED</span>
                      ) : isWarning ? (
                        <span className="text-amber-500 font-bold">LOW BALANCE</span>
                      ) : (
                        <span className="text-emerald-500 font-medium">HEALTHY</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Complete Budget Transaction Ledger */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                Complete Budget Transaction Ledger
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Full chronological history of allocations, increases, decreases, auto-deductions, and overrides
              </p>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {transactions.length} Total Entries
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20">
                  <th className="p-3 pl-4">Timestamp</th>
                  <th className="p-3">Team</th>
                  <th className="p-3">Transaction Type</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Balance Before</th>
                  <th className="p-3">Balance After</th>
                  <th className="p-3">Performed By</th>
                  <th className="p-3 pr-4">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {transactions.map((txn) => {
                  const isDeduction = txn.type === 'REQUEST_DEDUCTION' || txn.type === 'OVERRIDE_DEDUCTION';
                  const isIncrease = txn.type === 'BUDGET_INCREASE' || txn.type === 'INITIAL_ALLOCATION';

                  return (
                    <tr key={txn.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-3 pl-4 font-mono text-muted-foreground">
                        {new Date(txn.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="p-3 font-semibold text-foreground">
                        {txn.teamName}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            txn.isOverride
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : isDeduction
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {txn.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className={`p-3 font-mono font-bold ${isDeduction ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {isDeduction ? '-' : '+'}${(txn.amount || 0).toLocaleString()}
                      </td>
                      <td className="p-3 font-mono text-muted-foreground">
                        ${(txn.balanceBefore || 0).toLocaleString()}
                      </td>
                      <td className="p-3 font-mono font-semibold text-foreground">
                        ${(txn.balanceAfter || 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {txn.performedByUserName}
                      </td>
                      <td className="p-3 pr-4 text-foreground/80 max-w-xs truncate" title={txn.reason}>
                        {txn.reason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Adjust Budget Modal */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Adjust Team Budget Allocation"
        description="Modify allocated team funds with full ledger tracking and rationale log"
        maxWidth="md"
      >
        <form onSubmit={handleExecuteAdjustment} className="space-y-4">
          {adjustError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {adjustError}
            </div>
          )}

          <Select
            label="Target Team *"
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            options={teams.map(t => ({ label: `${t.name} (Current: $${t.remainingBudget.toLocaleString()} left)`, value: t.id }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Adjustment Action *"
              value={adjustType}
              onChange={(e) => setAdjustType(e.target.value as any)}
              options={[
                ...(canIncreaseBudget ? [{ label: 'Increase Funds (+)', value: 'BUDGET_INCREASE' }] : []),
                ...(canDecreaseBudget ? [{ label: 'Decrease Funds (-)', value: 'BUDGET_DECREASE' }] : []),
              ]}
            />
            <Input
              label="Adjustment Amount ($) *"
              type="number"
              min="1"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value === '' ? '' : Number(e.target.value))}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Audit Rationale / Reason *
            </label>
            <textarea
              rows={2}
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="e.g. Mid-quarter expansion allowance, executive reallocation, or error correction..."
              required
              className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAdjustModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Confirm Adjustment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

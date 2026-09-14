import React, { useState } from 'react';
import {
  Users2,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Sparkles,
  Plus,
  ArrowRight,
  Calendar,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSystem } from '../../context/SystemContext';
import { dataService } from '../../services/dataService';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge, StatusBadge, PriorityBadge } from '../../components/common/Badge';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
  onOpenNewRequest: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onOpenNewRequest }) => {
  const { currentUser, hasPermission } = useAuth();
  const { settings } = useSystem();

  const teams = dataService.getTeams();
  const requests = dataService.getRequests();
  const auditLogs = dataService.getAuditLogs().slice(0, 6);

  // Sort requests by Date descending (newest date at start)
  const sortedRequests = [...requests].sort((a, b) => {
    const dateA = a.date || a.requestDate || (a.createdAt ? a.createdAt.split('T')[0] : '');
    const dateB = b.date || b.requestDate || (b.createdAt ? b.createdAt.split('T')[0] : '');
    return dateB.localeCompare(dateA);
  });

  // Financial calculations
  const totalAllocated = teams.reduce((acc, t) => acc + (t.allocatedBudget || 0), 0);
  const totalSpent = teams.reduce((acc, t) => acc + (t.spentBudget || 0), 0);
  const totalRemaining = totalAllocated - totalSpent;
  const overallBurnPct = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;

  // Requests breakdown
  const totalRequests = requests.length;
  const pendingRequests = requests.filter(r =>
    ['submitted', 'under_review', 'pending_executive', 'pending_assistant', 'pending_president'].includes(r.status)
  ).length;
  const approvedRequests = requests.filter(r => r.status === 'approved' || r.status === 'completed').length;
  const rejectedRequests = requests.filter(r => r.status === 'rejected').length;

  // Active teams count
  const activeTeams = teams.filter(t => t.active).length;

  // Spending by team
  const topTeams = [...teams].sort((a, b) => b.spentBudget - a.spentBudget);

  // Category spending breakdown
  const categoryMap: Record<string, number> = {};
  requests.forEach(r => {
    categoryMap[r.requestCategory] = (categoryMap[r.requestCategory] || 0) + (r.budgetAmount || 0);
  });
  const categoryStats = Object.entries(categoryMap).map(([category, amount]) => ({
    category,
    amount,
    pct: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0
  })).sort((a, b) => b.amount - a.amount).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Banner with Executive Greeting & Quick Actions */}
 

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Budget Allocated */}
        <Card hoverEffect className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Budget Pool
              </span>
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                ${totalAllocated.toLocaleString()}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center">
                  <ArrowUpRight className="w-3.5 h-3.5" /> +12.5%
                </span>
                <span>vs previous quarter</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Spent vs Remaining */}
        <Card hoverEffect className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Budget Utilized
              </span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                ${totalSpent.toLocaleString()}
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 mt-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${overallBurnPct > 80 ? 'bg-rose-500' : 'bg-amber-500'
                    }`}
                  style={{ width: `${overallBurnPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5">
                <span>{overallBurnPct}% consumed</span>
                <span className="font-mono text-primary font-medium">${totalRemaining.toLocaleString()} remaining</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requests Activity */}
        <Card hoverEffect className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Requests
              </span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {totalRequests}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  {pendingRequests} pending
                </span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {approvedRequests} approved
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teams Active */}
        <Card hoverEffect className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active Teams
              </span>
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
                <Users2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {activeTeams} <span className="text-sm font-normal text-muted-foreground">/ {teams.length}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">100% compliant</span>
                <span>under budget rules</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Charts & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Budget Utilization Bars */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle>Team Budget Utilization</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Allocated vs actual spending across active functional departments
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('/budgets')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                className="self-start sm:self-auto shrink-0"
              >
                Manage Budgets
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-2">
              {topTeams.map((team) => {
                const burnPct = Math.round(((team.spentBudget || 0) / (team.allocatedBudget || 1)) * 100);
                const isWarning = burnPct >= settings.budgetRules.warningThresholdPercent;
                const isCritical = burnPct >= settings.budgetRules.criticalThresholdPercent;

                return (
                  <div key={team.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: team.color || '#3b82f6' }}
                        />
                        <span className="font-semibold text-foreground">{team.name}</span>
                        <span className="text-[11px] text-muted-foreground">Lead: {team.leadName}</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        <span className="text-muted-foreground">
                          ${(team.spentBudget || 0).toLocaleString()} / ${(team.allocatedBudget || 0).toLocaleString()}
                        </span>
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${isCritical
                            ? 'bg-rose-500/10 text-rose-500'
                            : isWarning
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-emerald-500/10 text-emerald-500'
                            }`}
                        >
                          {burnPct}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${isCritical
                          ? 'bg-rose-500'
                          : isWarning
                            ? 'bg-amber-500'
                            : 'bg-primary'
                          }`}
                        style={{ width: `${Math.min(100, burnPct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Spending by Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Distribution of approved request expenditures
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 pt-2">
              {categoryStats.map((item, idx) => (
                <div key={item.category} className="p-3 rounded-xl bg-muted/30 border border-border/60 flex items-center justify-between">
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <p className="text-xs font-semibold text-foreground truncate">{item.category}</p>
                    <p className="text-[10px] text-muted-foreground">{item.pct}% of total spend</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-xs font-bold text-foreground">
                      ${(item.amount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row: Recent Requests Table & Live Audit Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Requests */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle>Recent Requests</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Latest submissions moving through the multi-stage approval pipeline
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('/requests')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                className="self-start sm:self-auto shrink-0"
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
              <table className="w-full text-left border-collapse text-xs min-w-[760px]">
                <thead>
                  <tr className="border-b border-border/80 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20">
                    <th className="py-2.5 px-3 pl-3 text-primary font-bold">Date</th>
                    <th className="py-2.5 px-3">Agent Name</th>
                    <th className="py-2.5 px-3">Business Name</th>
                    <th className="py-2.5 px-3">Category (Sample/Request)</th>
                    <th className="py-2.5 px-3">Invoice No</th>
                    <th className="py-2.5 px-3">Sample SKU</th>
                    <th className="py-2.5 px-3 text-center">Total Qty</th>
                    <th className="py-2.5 px-3 text-right">Per Unit Cost</th>
                    <th className="py-2.5 px-3 text-right">Total Cost</th>
                    <th className="py-2.5 px-3 text-right pr-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {sortedRequests.slice(0, 7).map((req) => {
                    const reqDate = req.date || req.requestDate || (req.createdAt ? req.createdAt.split('T')[0] : '—');
                    const agentName = req.agentOrTeamName || req.customerName || req.submittedByUserName;
                    const business = req.businessName || req.customerCompany;
                    const category = req.typeOfFoc || req.requestCategory || 'Sample/Request';
                    const invoiceNo = req.systemInvoiceNo || '—';
                    const sampleSku = req.sampleSku || req.requestItem || '—';
                    const qty = req.sampleSkuQty || 1;
                    const unitCost = Number(req.sampleSkuCostPerUnit) || (req.budgetAmount ? Math.round((req.budgetAmount / qty) * 100) / 100 : 0);
                    const totalCost = Number(req.sampleSkuTotal) || req.budgetAmount || 0;

                    return (
                      <tr
                        key={req.id}
                        onClick={() => onNavigate(`/requests?id=${req.id}`)}
                        className="hover:bg-muted/40 cursor-pointer transition-colors group"
                      >
                        <td className="py-3 px-3 font-mono font-bold text-primary whitespace-nowrap">
                          {reqDate}
                        </td>
                        <td className="py-3 px-3 font-medium text-foreground whitespace-nowrap">
                          {agentName}
                        </td>
                        <td className="py-3 px-3 text-foreground whitespace-nowrap">
                          {business}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium border border-border/50">
                            {category}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-muted-foreground whitespace-nowrap">
                          {invoiceNo}
                        </td>
                        <td className="py-3 px-3 text-foreground font-medium truncate max-w-[140px]" title={sampleSku}>
                          {sampleSku}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-semibold">
                          {qty}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-muted-foreground whitespace-nowrap">
                          ${unitCost.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-foreground whitespace-nowrap">
                          ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right pr-3 whitespace-nowrap">
                          <StatusBadge status={req.status} size="sm" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Live Immutable Audit Stream */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Audit Activity Log</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Immutable enterprise event stream
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('/audit')}
                className="text-[11px] h-7 px-2"
              >
                Full Trail
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3.5 pt-1">
              {auditLogs.map((log) => (
                <div key={log.id} className="relative pl-5 border-l-2 border-primary/30 space-y-0.5 text-xs">
                  <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-primary ring-2 ring-background" />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{log.userName}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {log.description}
                  </p>
                  <div className="text-[10px] text-primary/80 font-mono">
                    {log.action} • {log.ipAddress}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

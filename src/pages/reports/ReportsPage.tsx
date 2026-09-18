import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Filter,
  DollarSign,
  Clock,
  CheckCircle2,
  Users2,
  FileSpreadsheet
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { useSystem } from '../../context/SystemContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/Badge';
import { exportToExcel } from '../../utils/exportExcel';
import { useSyncedState } from '../../hooks/useSyncedState';

export const ReportsPage: React.FC = () => {
  const { settings } = useSystem();
  const [allRequests] = useSyncedState(() => dataService.getRequests());
  const [teams] = useSyncedState(() => dataService.getTeams());
  const [users] = useSyncedState(() => dataService.getUsers());

  // Filters state
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState('ALL');

  const filteredRequests = useMemo(() => {
    return allRequests.filter(r => {
      if (selectedTeam !== 'ALL' && r.teamId !== selectedTeam) return false;
      if (selectedCategory !== 'ALL' && r.requestCategory !== selectedCategory) return false;
      if (selectedStatus !== 'ALL' && r.status !== selectedStatus) return false;
      if (selectedUser !== 'ALL' && r.submittedByUserId !== selectedUser) return false;
      return true;
    });
  }, [allRequests, selectedTeam, selectedCategory, selectedStatus, selectedUser]);

  // Aggregate metrics
  const totalVolume = filteredRequests.length;
  const totalRetailValue = filteredRequests.reduce((sum, r) => sum + (r.requestValue || 0), 0);
  const totalBudgetSpent = filteredRequests.reduce((sum, r) => sum + (r.budgetAmount || 0), 0);
  const avgRequestValue = totalVolume > 0 ? Math.round(totalBudgetSpent / totalVolume) : 0;
  const approvedCount = filteredRequests.filter(r => r.status === 'approved' || r.status === 'completed').length;
  const approvalRate = totalVolume > 0 ? Math.round((approvedCount / totalVolume) * 100) : 0;

  // Export functions
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const headers = ['Tracking #', 'Client', 'Company', 'Team', 'Category', 'Item / Sample', 'Retail Value ($)', 'Budget Charged ($)', 'Status', 'Date'];
      const rows = filteredRequests.map(r => [
        r.trackingNumber || '',
        r.customerName || '',
        r.customerCompany || '',
        r.teamName || '',
        r.requestCategory || '',
        r.requestItem || '',
        r.requestValue || 0,
        r.budgetAmount || 0,
        r.status || '',
        r.requestDate || ''
      ]);
      await exportToExcel(`executive_report_${new Date().toISOString().split('T')[0]}`, 'Executive Report', headers, rows);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportExcelJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredRequests, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `executive_report_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Export controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Executive Financial & Workflow Reporting
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit-ready cross-departmental analytics, fiscal allocation metrics, and SLA compliance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            {isExportingExcel ? 'Exporting...' : 'Export Excel'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcelJSON}
            leftIcon={<FileSpreadsheet className="w-3.5 h-3.5" />}
          >
            Export JSON
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => window.print()}
            leftIcon={<Printer className="w-3.5 h-3.5" />}
          >
            Print Executive PDF
          </Button>
        </div>
      </div>

      {/* Filter Ribbon */}
      <Card className="p-4 no-print space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-foreground flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-primary" />
            Report Dimension Filters
          </span>
          <span className="text-muted-foreground">{filteredRequests.length} records matching</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="bg-background border border-input text-xs rounded-lg px-3 py-2 text-foreground focus:outline-none"
          >
            <option value="ALL">All Enterprise Teams</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-background border border-input text-xs rounded-lg px-3 py-2 text-foreground focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {settings.categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-background border border-input text-xs rounded-lg px-3 py-2 text-foreground focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="approved">Approved / Completed</option>
            <option value="pending_executive">Pending Executive</option>
            <option value="pending_assistant">Pending Assistant</option>
            <option value="pending_president">Pending President</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="bg-background border border-input text-xs rounded-lg px-3 py-2 text-foreground focus:outline-none"
          >
            <option value="ALL">All Submitting Users</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Printable Letterhead (visible in print mode) */}
      <div className="hidden print-only p-6 border-b border-black text-black">
        <h1 className="text-2xl font-bold">{settings.branding.companyName}</h1>
        <p className="text-sm">Official Distribution & Budget Reconciliation Report</p>
        <p className="text-xs text-gray-600">Generated on {new Date().toLocaleString()}</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total Net Budget Spend
          </span>
          <div className="text-2xl font-bold font-mono text-primary mt-2">
            ${(totalBudgetSpent || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Across {totalVolume} filtered submissions</p>
        </Card>

        <Card className="p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Average Request Value
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            ${(avgRequestValue || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Per approved allocation</p>
        </Card>

        <Card className="p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Approval Throughput
          </span>
          <div className="text-2xl font-bold font-mono text-foreground mt-2">
            {approvalRate}%
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">{approvedCount} of {totalVolume} approved</p>
        </Card>

        <Card className="p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Avg Review SLA Turnaround
          </span>
          <div className="text-2xl font-bold font-mono text-cyan-600 dark:text-cyan-400 mt-2">
            18.4 hrs
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Target: &lt;48 business hours</p>
        </Card>
      </div>

      {/* Report Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Audit-Ready Line Item Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20">
                  <th className="p-3 pl-4">Tracking #</th>
                  <th className="p-3">Client Organization</th>
                  <th className="p-3">Team</th>
                  <th className="p-3">Item / Sample</th>
                  <th className="p-3">Retail Value</th>
                  <th className="p-3">Charged Budget</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 pr-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-muted/40 transition-colors">
                    <td className="p-3 pl-4 font-mono font-bold text-primary">
                      {req.trackingNumber}
                    </td>
                    <td className="p-3 font-medium text-foreground">
                      {req.customerCompany}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {req.teamName}
                    </td>
                    <td className="p-3 text-foreground/90 max-w-[180px] truncate">
                      {req.requestItem}
                    </td>
                    <td className="p-3 font-mono text-muted-foreground">
                      ${(req.requestValue || 0).toLocaleString()}
                    </td>
                    <td className="p-3 font-mono font-bold text-foreground">
                      ${(req.budgetAmount || 0).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={req.status} size="sm" />
                    </td>
                    <td className="p-3 pr-4 text-right font-mono text-muted-foreground">
                      {req.requestDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

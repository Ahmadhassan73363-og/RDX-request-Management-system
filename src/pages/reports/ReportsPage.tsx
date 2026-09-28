import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  Users2,
  FileSpreadsheet,
  RefreshCw,
  Globe,
  TrendingUp,
  Truck,
  DollarSign
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { currencyService, ExchangeRatesData } from '../../services/currencyService';
import { useSystem } from '../../context/SystemContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/Badge';
import { exportToExcel } from '../../utils/exportExcel';
import { useSyncedState } from '../../hooks/useSyncedState';
import { ShipmentStatus } from '../../types/request';

export const ReportsPage: React.FC = () => {
  const { settings } = useSystem();
  const [allRequests] = useSyncedState(() => dataService.getRequests());
  const [teams] = useSyncedState(() => dataService.getTeams());
  const [users] = useSyncedState(() => dataService.getUsers());

  // Real-time Forex State
  const [fxRates, setFxRates] = useState<ExchangeRatesData>(() => currencyService.getCachedRates());
  const [isLoadingFx, setIsLoadingFx] = useState(false);
  const [fxTimestamp, setFxTimestamp] = useState<string>(() => fxRates.timestamp);

  const fetchLiveFx = async (force = false) => {
    setIsLoadingFx(true);
    try {
      const data = await currencyService.getLiveRates(force);
      setFxRates(data);
      setFxTimestamp(data.timestamp);
    } catch (err) {
      console.warn('Failed to refresh live FX rates:', err);
    } finally {
      setIsLoadingFx(false);
    }
  };

  useEffect(() => {
    fetchLiveFx();
  }, []);

  // Filters state
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState('ALL');
  const [selectedShipment, setSelectedShipment] = useState('ALL');

  const filteredRequests = useMemo(() => {
    return allRequests.filter(r => {
      if (selectedTeam !== 'ALL' && r.teamId !== selectedTeam) return false;
      if (selectedCategory !== 'ALL' && r.requestCategory !== selectedCategory) return false;
      if (selectedStatus !== 'ALL' && r.status !== selectedStatus) return false;
      if (selectedUser !== 'ALL' && r.submittedByUserId !== selectedUser) return false;
      if (selectedShipment !== 'ALL' && (r.shipmentStatus || 'approved') !== selectedShipment) return false;
      return true;
    });
  }, [allRequests, selectedTeam, selectedCategory, selectedStatus, selectedUser, selectedShipment]);

  // Aggregate metrics (Pound Base)
  const totalVolume = filteredRequests.length;
  const totalBudgetSpentGbp = filteredRequests.reduce((sum, r) => sum + (r.sampleSkuTotal || r.budgetAmount || 0), 0);
  const avgRequestValueGbp = totalVolume > 0 ? Math.round(totalBudgetSpentGbp / totalVolume) : 0;
  const approvedCount = filteredRequests.filter(r => r.status === 'approved' || r.status === 'completed').length;
  const approvalRate = totalVolume > 0 ? Math.round((approvedCount / totalVolume) * 100) : 0;

  // Real-time aggregate conversions
  const totalUsd = Math.round(totalBudgetSpentGbp * (fxRates.rates.USD || 1.32) * 100) / 100;
  const totalEur = Math.round(totalBudgetSpentGbp * (fxRates.rates.EUR || 1.16) * 100) / 100;
  const totalAed = Math.round(totalBudgetSpentGbp * (fxRates.rates.AED || 4.85) * 100) / 100;

  // Export functions
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const headers = [
        'Tracking #',
        'Client',
        'Company',
        'Team',
        'Category',
        'Item / Sample',
        'Shipment Status',
        'Amount (£ GBP)',
        'Amount ($ USD)',
        'Amount (€ EUR)',
        'Amount (AED د.إ)',
        'Forex Valuation Type',
        'Status',
        'Date'
      ];

      const rows = filteredRequests.map(r => {
        const amountGbp = r.sampleSkuTotal || r.budgetAmount || 0;
        const hasDeliveredRates = !!r.deliveredCurrencyRates;
        const usdVal = hasDeliveredRates ? r.deliveredCurrencyRates!.totalUsd : Math.round(amountGbp * (fxRates.rates.USD || 1.32) * 100) / 100;
        const eurVal = hasDeliveredRates ? r.deliveredCurrencyRates!.totalEur : Math.round(amountGbp * (fxRates.rates.EUR || 1.16) * 100) / 100;
        const aedVal = hasDeliveredRates ? r.deliveredCurrencyRates!.totalAed : Math.round(amountGbp * (fxRates.rates.AED || 4.85) * 100) / 100;

        return [
          r.trackingNumber || '',
          r.customerName || '',
          r.customerCompany || '',
          r.teamName || '',
          r.requestCategory || '',
          r.requestItem || '',
          r.shipmentStatus || 'approved',
          amountGbp,
          usdVal,
          eurVal,
          aedVal,
          hasDeliveredRates ? `Delivered Rate (${r.deliveredCurrencyRates!.fetchedAt.split('T')[0]})` : 'Live Forex Rate',
          r.status || '',
          r.requestDate || ''
        ];
      });

      await exportToExcel(`executive_financial_report_${new Date().toISOString().split('T')[0]}`, 'Financial Report', headers, rows);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportExcelJSON = () => {
    const exportPayload = {
      generatedAt: new Date().toISOString(),
      liveForexRates: fxRates,
      totalVolume,
      totalSpendGbp: totalBudgetSpentGbp,
      conversions: {
        totalUsd,
        totalEur,
        totalAed
      },
      requests: filteredRequests.map(r => {
        const amountGbp = r.sampleSkuTotal || r.budgetAmount || 0;
        const hasDeliveredRates = !!r.deliveredCurrencyRates;
        return {
          ...r,
          baseCurrency: 'GBP',
          amountGbp,
          conversions: {
            usd: hasDeliveredRates ? r.deliveredCurrencyRates!.totalUsd : Math.round(amountGbp * (fxRates.rates.USD || 1.32) * 100) / 100,
            eur: hasDeliveredRates ? r.deliveredCurrencyRates!.totalEur : Math.round(amountGbp * (fxRates.rates.EUR || 1.16) * 100) / 100,
            aed: hasDeliveredRates ? r.deliveredCurrencyRates!.totalAed : Math.round(amountGbp * (fxRates.rates.AED || 4.85) * 100) / 100,
            valuationType: hasDeliveredRates ? 'Delivered Rate' : 'Live Rate'
          }
        };
      })
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
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
            Audit-ready line-item ledger with real-time multi-currency valuation (GBP → USD, EUR, AED)
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
        </div>
      </div>

      {/* Real-time Live Currency Exchange Rates Banner */}
      <Card className="p-4 bg-card border-primary/20 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">Real-Time Currency Exchange Rates</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live API Connected
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Base Currency: <strong className="text-foreground font-mono">British Pound (£ 1.00 GBP)</strong> · Last updated: {fxTimestamp ? new Date(fxTimestamp).toLocaleTimeString() : 'Recent'}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchLiveFx(true)}
            disabled={isLoadingFx}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingFx ? 'animate-spin' : ''}`} />}
            className="text-xs self-start md:self-auto"
          >
            {isLoadingFx ? 'Fetching Rates...' : 'Refresh Live Rates'}
          </Button>
        </div>

        {/* Currency Rate Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
          <div className="p-3 rounded-lg bg-background border border-border/70 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">USD Conversion</span>
              <p className="text-base font-extrabold font-mono text-foreground mt-0.5">
                $ {(fxRates.rates.USD || 1.32).toFixed(4)}
              </p>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono">
              1 £ = ${ (fxRates.rates.USD || 1.32).toFixed(2) }
            </span>
          </div>

          <div className="p-3 rounded-lg bg-background border border-border/70 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">EUR Conversion</span>
              <p className="text-base font-extrabold font-mono text-foreground mt-0.5">
                € {(fxRates.rates.EUR || 1.16).toFixed(4)}
              </p>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono">
              1 £ = €{ (fxRates.rates.EUR || 1.16).toFixed(2) }
            </span>
          </div>

          <div className="p-3 rounded-lg bg-background border border-border/70 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">AED Conversion</span>
              <p className="text-base font-extrabold font-mono text-foreground mt-0.5">
                د.إ {(fxRates.rates.AED || 4.85).toFixed(4)}
              </p>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
              1 £ = د.إ { (fxRates.rates.AED || 4.85).toFixed(2) }
            </span>
          </div>
        </div>
      </Card>

      {/* Filter Toolbar */}
      <Card className="p-4 no-print">
        <div className="flex items-center gap-2 mb-3 text-xs font-bold text-foreground">
          <Filter className="w-3.5 h-3.5 text-primary" />
          Report Dimension Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Team
            </label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full h-8 px-2.5 bg-background border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="ALL">All Teams</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-8 px-2.5 bg-background border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="ALL">All Categories</option>
              <option value="Sample">Sample</option>
              <option value="Gift">Gift</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Approval Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-8 px-2.5 bg-background border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="ALL">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="pending_executive">Pending Review</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Shipment Status
            </label>
            <select
              value={selectedShipment}
              onChange={(e) => setSelectedShipment(e.target.value)}
              className="w-full h-8 px-2.5 bg-background border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="ALL">All Logistics</option>
              <option value="delivered">Delivered</option>
              <option value="dispatched">Dispatched</option>
              <option value="in_process">In Process</option>
              <option value="approved">Pending Dispatch</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Submitted By
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full h-8 px-2.5 bg-background border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="ALL">All Initiators</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Metric Cards with Multi-Currency Values */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pound Base */}
        <Card className="p-4 border-primary/30">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total Net Spend (£ GBP)
          </span>
          <div className="text-2xl font-bold font-mono text-primary mt-1.5">
            £{(totalBudgetSpentGbp || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Across {totalVolume} filtered requests</p>
        </Card>

        {/* Real-time USD Valuation */}
        <Card className="p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            USD Valuation ($)
          </span>
          <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1.5">
            ${(totalUsd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Converted at live rate ($ {(fxRates.rates.USD || 1.32).toFixed(2)})</p>
        </Card>

        {/* Real-time EUR Valuation */}
        <Card className="p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            EUR Valuation (€)
          </span>
          <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1.5">
            €{(totalEur || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Converted at live rate (€ {(fxRates.rates.EUR || 1.16).toFixed(2)})</p>
        </Card>

        {/* Real-time AED Valuation */}
        <Card className="p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            AED Valuation (د.إ)
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1.5">
            د.إ {(totalAed || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Converted at live rate (د.إ {(fxRates.rates.AED || 4.85).toFixed(2)})</p>
        </Card>
      </div>

      {/* Report Data Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Detailed Line Item Ledger & Multi-Currency Valuation</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live conversions update automatically; delivered items retain the exact forex rate captured at delivery
            </p>
          </div>
          <div className="text-xs font-mono text-muted-foreground">
            Showing {filteredRequests.length} rows
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20">
                  <th className="p-3 pl-4">Tracking #</th>
                  <th className="p-3">Client / Business</th>
                  <th className="p-3">Team</th>
                  <th className="p-3">Item / SKU</th>
                  <th className="p-3">Shipment</th>
                  <th className="p-3 text-right">Pound (£ GBP)</th>
                  <th className="p-3 text-right">USD ($)</th>
                  <th className="p-3 text-right">EUR (€)</th>
                  <th className="p-3 text-right">AED (د.إ)</th>
                  <th className="p-3 pr-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-muted-foreground text-xs">
                      No records match the selected dimension filters.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => {
                    const amountGbp = req.sampleSkuTotal || req.budgetAmount || 0;
                    const hasDeliveredRates = !!req.deliveredCurrencyRates;
                    const usdVal = hasDeliveredRates
                      ? req.deliveredCurrencyRates!.totalUsd
                      : Math.round(amountGbp * (fxRates.rates.USD || 1.32) * 100) / 100;
                    const eurVal = hasDeliveredRates
                      ? req.deliveredCurrencyRates!.totalEur
                      : Math.round(amountGbp * (fxRates.rates.EUR || 1.16) * 100) / 100;
                    const aedVal = hasDeliveredRates
                      ? req.deliveredCurrencyRates!.totalAed
                      : Math.round(amountGbp * (fxRates.rates.AED || 4.85) * 100) / 100;

                    const shipStatus = req.shipmentStatus || 'approved';

                    return (
                      <tr key={req.id} className="hover:bg-muted/40 transition-colors">
                        <td className="p-3 pl-4 font-mono font-bold text-primary whitespace-nowrap">
                          {req.trackingNumber}
                        </td>
                        <td className="p-3 font-medium text-foreground">
                          <div>{req.customerCompany || req.businessName || '—'}</div>
                          {req.customerName && (
                            <div className="text-[10px] text-muted-foreground">{req.customerName}</div>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground whitespace-nowrap">
                          {req.teamName}
                        </td>
                        <td className="p-3 text-foreground/90 max-w-[170px] truncate" title={req.sampleSku || req.requestItem}>
                          {req.sampleSku || req.requestItem}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            shipStatus === 'delivered'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : shipStatus === 'dispatched'
                              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                              : shipStatus === 'in_process'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {shipStatus === 'delivered' ? '✓ Delivered' : shipStatus}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-foreground whitespace-nowrap">
                          £{amountGbp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          ${usdVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          {hasDeliveredRates && (
                            <span className="block text-[8px] text-muted-foreground leading-tight">Delivered Rate</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                          €{eurVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          {hasDeliveredRates && (
                            <span className="block text-[8px] text-muted-foreground leading-tight">Delivered Rate</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          د.إ {aedVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          {hasDeliveredRates && (
                            <span className="block text-[8px] text-muted-foreground leading-tight">Delivered Rate</span>
                          )}
                        </td>
                        <td className="p-3 pr-4 text-right font-mono text-muted-foreground whitespace-nowrap">
                          {req.requestDate}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filteredRequests.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-primary/5 font-bold text-xs">
                    <td colSpan={5} className="p-3 pl-4 text-foreground">
                      Grand Totals ({filteredRequests.length} Submissions)
                    </td>
                    <td className="p-3 text-right font-mono text-primary">
                      £{totalBudgetSpentGbp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-mono text-blue-600 dark:text-blue-400">
                      ${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-mono text-indigo-600 dark:text-indigo-400">
                      €{totalEur.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      د.إ {totalAed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 pr-4" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  Truck,
  Package,
  PackageCheck,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Building2,
  User,
  Calendar,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  LayoutGrid,
  List
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { RequestRecord, ShipmentStatus } from '../../types/request';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';

interface ShipmentTrackingPageProps {
  onNavigateToRequest: (id: string) => void;
}

const SHIPMENT_STATUSES: {
  key: ShipmentStatus;
  label: string;
  sublabel: string;
  badgeClass: string;
  borderClass: string;
  headerBg: string;
  icon: React.ReactNode;
}[] = [
  {
    key: 'approved',
    label: 'Approved – Ready',
    sublabel: 'Awaiting warehouse processing',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    borderClass: 'border-emerald-500/30',
    headerBg: 'bg-emerald-500/5',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
  },
  {
    key: 'in_process',
    label: 'In Process',
    sublabel: 'Packaging & quality inspection',
    badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
    borderClass: 'border-amber-500/30',
    headerBg: 'bg-amber-500/5',
    icon: <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
  },
  {
    key: 'dispatched',
    label: 'Dispatched',
    sublabel: 'In transit with courier',
    badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
    borderClass: 'border-blue-500/30',
    headerBg: 'bg-blue-500/5',
    icon: <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
  },
  {
    key: 'delivered',
    label: 'Delivered',
    sublabel: 'Signed and confirmed by client',
    badgeClass: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30',
    borderClass: 'border-teal-500/30',
    headerBg: 'bg-teal-500/5',
    icon: <PackageCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
  }
];

export const ShipmentTrackingPage: React.FC<ShipmentTrackingPageProps> = ({ onNavigateToRequest }) => {
  const { currentUser, hasPermission } = useAuth();
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [refreshTick, setRefreshTick] = useState(0);

  // Status update modal state
  const [updatingRequest, setUpdatingRequest] = useState<RequestRecord | null>(null);
  const [targetStatus, setTargetStatus] = useState<ShipmentStatus>('in_process');
  const [trackingNote, setTrackingNote] = useState('');
  const [actionError, setActionError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Shipment Manager check: only Shipment Manager role (or Super Admin) can transition statuses
  const isShipmentManager =
    currentUser.roleName === 'Shipment Manager' ||
    currentUser.roleName === 'Super Admin' ||
    hasPermission('shipments:manage');

  const allRequests = useMemo(() => {
    return dataService.getRequests();
  }, [refreshTick]);

  const teams = useMemo(() => {
    return dataService.getTeams();
  }, []);

  // Eligible shipment requests are those approved (or already assigned a shipment status)
  const shipmentRequests = useMemo(() => {
    return allRequests.filter(r => {
      // Must be approved or explicitly have a shipment status
      const hasShipStatus = !!r.shipmentStatus;
      const isApproved = r.status === 'approved';
      if (!hasShipStatus && !isApproved) return false;

      // Filter search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTracking = r.trackingNumber.toLowerCase().includes(q);
        const matchCustomer = (r.customerName || '').toLowerCase().includes(q);
        const matchCompany = (r.customerCompany || '').toLowerCase().includes(q);
        const matchItem = (r.requestItem || '').toLowerCase().includes(q);
        if (!matchTracking && !matchCustomer && !matchCompany && !matchItem) return false;
      }

      // Filter team
      if (selectedTeam !== 'ALL' && r.teamId !== selectedTeam) {
        return false;
      }

      // Filter status
      if (selectedStatusFilter !== 'ALL') {
        const currentShipStatus = r.shipmentStatus || 'approved';
        if (currentShipStatus !== selectedStatusFilter) return false;
      }

      return true;
    });
  }, [allRequests, searchQuery, selectedTeam, selectedStatusFilter]);

  // Aggregate status counts
  const statusCounts = useMemo(() => {
    const counts: Record<ShipmentStatus, number> = {
      approved: 0,
      in_process: 0,
      dispatched: 0,
      delivered: 0
    };
    allRequests.forEach(r => {
      if (r.status === 'approved' || r.shipmentStatus) {
        const st = (r.shipmentStatus || 'approved') as ShipmentStatus;
        if (counts[st] !== undefined) counts[st]++;
      }
    });
    return counts;
  }, [allRequests]);

  const totalEligible = useMemo(() => {
    return Object.values(statusCounts).reduce((a, b) => a + b, 0);
  }, [statusCounts]);

  const handleOpenUpdateModal = (req: RequestRecord, nextStatus?: ShipmentStatus) => {
    if (!isShipmentManager) return;
    setUpdatingRequest(req);
    const currentStatus = (req.shipmentStatus || 'approved') as ShipmentStatus;
    if (nextStatus) {
      setTargetStatus(nextStatus);
    } else {
      // Default to next status in pipeline
      const idx = SHIPMENT_STATUSES.findIndex(s => s.key === currentStatus);
      const nextIdx = Math.min(idx + 1, SHIPMENT_STATUSES.length - 1);
      setTargetStatus(SHIPMENT_STATUSES[nextIdx].key);
    }
    setTrackingNote('');
    setActionError('');
  };

  const handleExecuteStatusUpdate = () => {
    if (!updatingRequest) return;
    setActionError('');
    setIsProcessing(true);

    try {
      dataService.updateShipmentStatus(
        updatingRequest.id,
        targetStatus,
        currentUser,
        trackingNote.trim() || undefined
      );
      setUpdatingRequest(null);
      setTrackingNote('');
      setRefreshTick(t => t + 1);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update shipment status');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    const st = (status || 'approved') as ShipmentStatus;
    const cfg = SHIPMENT_STATUSES.find(s => s.key === st) || SHIPMENT_STATUSES[0];
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.badgeClass}`}>
        {cfg.icon}
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Shipment & Dispatch Tracking
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time logistics fulfillment dashboard, dispatch tracking, and delivery confirmation
          </p>
        </div>

        {/* Manager Role Badge / Notice */}
        <div className="flex items-center gap-2.5">
          {isShipmentManager ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Shipment Manager Authorized</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Read-Only View ({currentUser.roleName})</span>
            </div>
          )}

          {/* View Toggle */}
          <div className="flex items-center border border-border rounded-xl p-1 bg-muted/30">
            <button
              onClick={() => setViewMode('board')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'board'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Board View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Board
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Role permission banner if not Shipment Manager */}
      {!isShipmentManager && (
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 text-xs flex items-center gap-3">
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-muted-foreground leading-relaxed">
            Status modifications are restricted to the <strong>Shipment Manager</strong> and <strong>Super Admin</strong> roles. You can view real-time tracking metrics and audit histories below.
          </p>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="p-4 bg-muted/20 border-border">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Total In Logistics
          </span>
          <div className="text-2xl font-bold font-mono text-foreground mt-1">
            {totalEligible}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Approved request packages</p>
        </Card>

        {SHIPMENT_STATUSES.map(st => {
          const count = statusCounts[st.key] || 0;
          return (
            <Card
              key={st.key}
              onClick={() => setSelectedStatusFilter(selectedStatusFilter === st.key ? 'ALL' : st.key)}
              className={`p-4 cursor-pointer transition-all border ${st.borderClass} ${
                selectedStatusFilter === st.key ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {st.label}
                </span>
                <span className={`p-1 rounded-lg border ${st.badgeClass}`}>{st.icon}</span>
              </div>
              <div className="text-2xl font-bold font-mono text-foreground mt-1">
                {count}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{st.sublabel}</p>
            </Card>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-muted/20 border border-border/80">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tracking #, recipient, company, item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-input rounded-lg pl-9 pr-3.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="w-3.5 h-3.5" />
            <span>Team:</span>
          </div>
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="ALL">All Teams</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="ALL">All Statuses</option>
            {SHIPMENT_STATUSES.map(s => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>

          {(searchQuery || selectedTeam !== 'ALL' || selectedStatusFilter !== 'ALL') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedTeam('ALL');
                setSelectedStatusFilter('ALL');
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Board View */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {SHIPMENT_STATUSES.map(column => {
            const columnItems = shipmentRequests.filter(r => (r.shipmentStatus || 'approved') === column.key);

            return (
              <div
                key={column.key}
                className={`flex flex-col rounded-2xl border ${column.borderClass} bg-card/60 backdrop-blur overflow-hidden`}
              >
                {/* Column Header */}
                <div className={`p-3.5 border-b border-border/80 flex items-center justify-between ${column.headerBg}`}>
                  <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-lg border ${column.badgeClass}`}>{column.icon}</span>
                    <div>
                      <h3 className="text-xs font-bold text-foreground">{column.label}</h3>
                      <p className="text-[10px] text-muted-foreground">{column.sublabel}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-background border border-border/80 text-foreground">
                    {columnItems.length}
                  </span>
                </div>

                {/* Column Items */}
                <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[640px]">
                  {columnItems.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground italic">
                      No packages in this stage
                    </div>
                  ) : (
                    columnItems.map(req => {
                      return (
                        <div
                          key={req.id}
                          className="p-3.5 rounded-xl bg-background border border-border hover:border-primary/40 hover:shadow-md transition-all space-y-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => onNavigateToRequest(req.id)}
                              className="font-mono font-bold text-primary hover:underline flex items-center gap-1"
                            >
                              {req.trackingNumber}
                              <ExternalLink className="w-3 h-3" />
                            </button>
                            <span className="text-[10px] font-mono font-bold text-foreground">
                              ${(req.budgetAmount || 0).toLocaleString()}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <p className="font-semibold text-foreground text-xs">{req.customerName}</p>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-muted-foreground" />
                              {req.customerCompany || 'Direct Recipient'}
                            </p>
                          </div>

                          <div className="p-2 rounded-lg bg-muted/40 border border-border/60 text-[11px] space-y-1">
                            <p className="text-foreground font-medium truncate">{req.requestItem}</p>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              <span>Team: {req.teamName}</span>
                              <span>{req.requestCategory}</span>
                            </div>
                          </div>

                          {/* Shipment Manager Action Trigger */}
                          <div className="pt-1 flex items-center justify-between border-t border-border/60 text-[11px]">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3" />
                              {req.requestDate}
                            </span>

                            {isShipmentManager ? (
                              <button
                                onClick={() => handleOpenUpdateModal(req)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-[11px] transition-colors"
                              >
                                <span>Update Status</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            ) : (
                              <button
                                onClick={() => onNavigateToRequest(req.id)}
                                className="text-muted-foreground hover:text-foreground text-[10px] font-medium"
                              >
                                View Details
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Logistics Package Manifest</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20">
                    <th className="p-3 pl-4">Tracking #</th>
                    <th className="p-3">Recipient & Company</th>
                    <th className="p-3">Team</th>
                    <th className="p-3">Item Description</th>
                    <th className="p-3">Budget</th>
                    <th className="p-3">Current Shipment Status</th>
                    <th className="p-3">Approved Date</th>
                    <th className="p-3 pr-4 text-right">Logistics Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {shipmentRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground italic">
                        No shipment packages match your current filter criteria
                      </td>
                    </tr>
                  ) : (
                    shipmentRequests.map(req => {
                      const currentStatus = (req.shipmentStatus || 'approved') as ShipmentStatus;
                      return (
                        <tr key={req.id} className="hover:bg-muted/40 transition-colors">
                          <td className="p-3 pl-4">
                            <button
                              onClick={() => onNavigateToRequest(req.id)}
                              className="font-mono font-bold text-primary hover:underline flex items-center gap-1"
                            >
                              {req.trackingNumber}
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-foreground">{req.customerName}</div>
                            <div className="text-[11px] text-muted-foreground">{req.customerCompany}</div>
                          </td>
                          <td className="p-3 text-muted-foreground font-medium">
                            {req.teamName}
                          </td>
                          <td className="p-3 text-foreground/90 max-w-[200px] truncate">
                            {req.requestItem}
                          </td>
                          <td className="p-3 font-mono font-bold text-foreground">
                            ${(req.budgetAmount || 0).toLocaleString()}
                          </td>
                          <td className="p-3">
                            {getStatusBadge(req.shipmentStatus)}
                          </td>
                          <td className="p-3 font-mono text-muted-foreground text-[11px]">
                            {req.requestDate}
                          </td>
                          <td className="p-3 pr-4 text-right">
                            {isShipmentManager ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenUpdateModal(req)}
                                leftIcon={<Truck className="w-3.5 h-3.5" />}
                              >
                                Update Status
                              </Button>
                            ) : (
                              <button
                                onClick={() => onNavigateToRequest(req.id)}
                                className="text-xs text-primary hover:underline font-medium"
                              >
                                View Details
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shipment Status Update Modal (Shipment Manager Only) */}
      <Modal
        isOpen={!!updatingRequest}
        onClose={() => setUpdatingRequest(null)}
        title="Update Logistics Shipment Status"
        description={updatingRequest ? `Tracking #${updatingRequest.trackingNumber} · ${updatingRequest.customerName}` : ''}
        maxWidth="md"
      >
        {updatingRequest && (
          <div className="space-y-4">
            {actionError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {actionError}
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Recipient:</span>
                <span className="font-semibold text-foreground">{updatingRequest.customerName} ({updatingRequest.customerCompany})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Item Description:</span>
                <span className="font-semibold text-foreground">{updatingRequest.requestItem}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Current Shipment Status:</span>
                <span>{getStatusBadge(updatingRequest.shipmentStatus)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Select New Shipment Status *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SHIPMENT_STATUSES.map(st => {
                  const isSelected = targetStatus === st.key;
                  const isCurrent = (updatingRequest.shipmentStatus || 'approved') === st.key;

                  return (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() => setTargetStatus(st.key)}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                          : 'border-border hover:border-primary/50 bg-background'
                      }`}
                    >
                      <span className={`p-1.5 rounded-lg border mt-0.5 ${st.badgeClass}`}>{st.icon}</span>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-foreground">{st.label}</span>
                          {isCurrent && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-mono">Current</span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{st.sublabel}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Logistics Dispatch Note / Carrier Details (Optional)
              </label>
              <textarea
                rows={3}
                value={trackingNote}
                onChange={(e) => setTrackingNote(e.target.value)}
                placeholder="e.g. Dispatched via DHL Express (Airway Bill #9823412093). Estimated arrival Friday..."
                className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUpdatingRequest(null)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExecuteStatusUpdate}
                disabled={isProcessing || targetStatus === (updatingRequest.shipmentStatus || 'approved')}
                leftIcon={<Truck className="w-3.5 h-3.5" />}
              >
                {isProcessing ? 'Updating...' : `Transition to ${SHIPMENT_STATUSES.find(s => s.key === targetStatus)?.label}`}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

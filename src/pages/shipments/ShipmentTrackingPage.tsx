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
  List,
  MapPin,
  Hash,
  Plus,
  Trash2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { RequestRecord, ShipmentStatus } from '../../types/request';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { useSyncedState } from '../../hooks/useSyncedState';
import { getAdvanceLabel, validateShipmentAdvance } from '../../utils/shipmentFlow';

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
    label: 'Approved - Ready',
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

/** Returns the index in SHIPMENT_STATUSES for a given status key */
const getStatusIndex = (status?: ShipmentStatus): number => {
  const idx = SHIPMENT_STATUSES.findIndex(s => s.key === (status || 'approved'));
  return idx === -1 ? 0 : idx;
};

/** Returns the next status key after current (or null if already at end) */
const getNextStatus = (current?: ShipmentStatus): ShipmentStatus | null => {
  const idx = getStatusIndex(current);
  if (idx >= SHIPMENT_STATUSES.length - 1) return null;
  return SHIPMENT_STATUSES[idx + 1].key;
};

export const ShipmentTrackingPage: React.FC<ShipmentTrackingPageProps> = ({ onNavigateToRequest }) => {
  const { currentUser, hasPermission } = useAuth();
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [refreshTick, setRefreshTick] = useState(0);

  // Status update modal state
  const [updatingRequest, setUpdatingRequest] = useState<RequestRecord | null>(null);
  const [actionError, setActionError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Shipment detail fields (filled by Shipment Manager during transition)
  const [trackingIds, setTrackingIds] = useState<string[]>(['']);
  const [shippingAddress, setShippingAddress] = useState('');
  const [shipmentDate, setShipmentDate] = useState('');
  const [organization, setOrganization] = useState('');
  const [dispatchNote, setDispatchNote] = useState('');

  // Shipment Manager check: only Shipment Manager role (or Super Admin) can transition statuses
  const isShipmentManager =
    currentUser.roleName === 'Shipment Manager' ||
    currentUser.roleName === 'Super Admin' ||
    hasPermission('shipments:manage');

  const [allRequests] = useSyncedState(() => dataService.getRequests());
  const [teams] = useSyncedState(() => dataService.getTeams());

  // Eligible shipment requests are those approved (or already assigned a shipment status)
  const shipmentRequests = useMemo(() => {
    return allRequests.filter(r => {
      if (r.status === 'cancelled') return false; // deactivated requests leave the shipment queue
      const hasShipStatus = !!r.shipmentStatus;
      const isApproved = r.status === 'approved';
      if (!hasShipStatus && !isApproved) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTracking = (r.trackingNumber || '').toLowerCase().includes(q);
        const matchCustomer = (r.customerName || '').toLowerCase().includes(q);
        const matchCompany = (r.customerCompany || '').toLowerCase().includes(q);
        const matchItem = (r.requestItem || '').toLowerCase().includes(q);
        const matchShipIds = (r.shipmentTrackingIds || []).some(id => id.toLowerCase().includes(q));
        if (!matchTracking && !matchCustomer && !matchCompany && !matchItem && !matchShipIds) return false;
      }

      if (selectedTeam !== 'ALL' && r.teamId !== selectedTeam) return false;

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
      if (r.status === 'cancelled') return;
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

  const handleOpenUpdateModal = (req: RequestRecord) => {
    if (!isShipmentManager) return;
    const nextStatus = getNextStatus(req.shipmentStatus as ShipmentStatus | undefined);
    if (!nextStatus) return; // Already at final status

    setUpdatingRequest(req);
    setActionError('');
    // Pre-fill with any existing data
    setTrackingIds(req.shipmentTrackingIds && req.shipmentTrackingIds.length > 0 ? [...req.shipmentTrackingIds] : ['']);
    setShippingAddress(req.shipmentAddress || '');
    setShipmentDate(req.shipmentDate || new Date().toISOString().split('T')[0]);
    setOrganization(req.shipmentOrganization || '');
    setDispatchNote(req.shipmentNotes || '');
  };

  const handleExecuteStatusUpdate = () => {
    if (!updatingRequest) return;
    setActionError('');

    const nextStatus = getNextStatus(updatingRequest.shipmentStatus as ShipmentStatus | undefined);
    if (!nextStatus) {
      setActionError('This shipment is already at the final stage.');
      return;
    }

    // Validate required fields based on the stage we're moving to
    const validTrackingIds = trackingIds.filter(id => id.trim());
    const validationError = validateShipmentAdvance(nextStatus, { trackingIds: validTrackingIds, address: shippingAddress });
    if (validationError) {
      setActionError(validationError);
      return;
    }

    setIsProcessing(true);
    try {
      dataService.updateShipmentStatus(
        updatingRequest.id,
        nextStatus,
        currentUser,
        dispatchNote.trim() || undefined,
        {
          trackingIds: validTrackingIds,
          address: shippingAddress,
          shipmentDate,
          organization
        }
      );
      setUpdatingRequest(null);
      setRefreshTick(t => t + 1);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update shipment status');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddTrackingId = () => {
    setTrackingIds(prev => [...prev, '']);
  };

  const handleRemoveTrackingId = (index: number) => {
    setTrackingIds(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : ['']);
  };

  const handleTrackingIdChange = (index: number, value: string) => {
    setTrackingIds(prev => prev.map((id, i) => i === index ? value : id));
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

  // Status pipeline progress indicator
  const StatusPipeline: React.FC<{ current?: ShipmentStatus }> = ({ current }) => {
    const currentIdx = getStatusIndex(current);
    return (
      <div className="flex items-center gap-1 w-full">
        {SHIPMENT_STATUSES.map((st, idx) => (
          <React.Fragment key={st.key}>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold flex-1 justify-center border transition-all ${
              idx < currentIdx
                ? 'bg-primary/10 border-primary/30 text-primary'
                : idx === currentIdx
                  ? `border ${st.borderClass} ${st.badgeClass}`
                  : 'bg-muted/30 border-border/50 text-muted-foreground'
            }`}>
              {st.icon}
              <span className="hidden sm:inline ml-1">{st.label}</span>
            </div>
            {idx < SHIPMENT_STATUSES.length - 1 && (
              <ArrowRight className={`w-3 h-3 shrink-0 ${idx < currentIdx ? 'text-primary' : 'text-muted-foreground/40'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Computed next status details for the modal
  const nextStatusKey = updatingRequest ? getNextStatus(updatingRequest.shipmentStatus as ShipmentStatus | undefined) : null;
  const nextStatusConfig = nextStatusKey ? SHIPMENT_STATUSES.find(s => s.key === nextStatusKey) : null;

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
            placeholder="Search tracking #, recipient, company, item, courier ID..."
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
                      const isDelivered = (req.shipmentStatus || 'approved') === 'delivered';
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
                            {req.warehouseName && (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">Ships from: {req.warehouseName}</span>
                              </div>
                            )}
                          </div>

                          {/* Shipment detail chips if data exists */}
                          {(req.shipmentTrackingIds?.length || req.shipmentAddress || req.shipmentOrganization) && (
                            <div className="p-2 rounded-lg bg-primary/5 border border-primary/15 text-[10px] space-y-1">
                              {req.shipmentOrganization && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Truck className="w-3 h-3 shrink-0 text-primary" />
                                  <span className="font-medium text-foreground">{req.shipmentOrganization}</span>
                                </div>
                              )}
                              {req.shipmentTrackingIds && req.shipmentTrackingIds.length > 0 && (
                                <div className="flex items-start gap-1 text-muted-foreground">
                                  <Hash className="w-3 h-3 shrink-0 text-primary mt-0.5" />
                                  <span className="font-mono text-[10px] break-all">{req.shipmentTrackingIds.join(' · ')}</span>
                                </div>
                              )}
                              {req.shipmentAddress && (
                                <div className="flex items-start gap-1 text-muted-foreground">
                                  <MapPin className="w-3 h-3 shrink-0 text-primary mt-0.5" />
                                  <span className="truncate">{req.shipmentAddress}</span>
                                </div>
                              )}
                              {req.shipmentDate && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Calendar className="w-3 h-3 shrink-0 text-primary" />
                                  <span>Shipment date: {req.shipmentDate}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Action row */}
                          <div className="pt-1 flex items-center justify-between border-t border-border/60 text-[11px]">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3" />
                              {req.requestDate}
                            </span>

                            {isShipmentManager ? (
                              isDelivered ? (
                                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-1">
                                  <PackageCheck className="w-3 h-3" /> Delivered
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleOpenUpdateModal(req)}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-[11px] transition-colors"
                                >
                                  <span>{getAdvanceLabel(req.shipmentStatus as ShipmentStatus | undefined)}</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              )
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
                    <th className="p-3">Courier / IDs</th>
                    <th className="p-3">Budget</th>
                    <th className="p-3">Shipment Status</th>
                    <th className="p-3">Approved Date</th>
                    <th className="p-3 pr-4 text-right">Logistics Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {shipmentRequests.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-muted-foreground italic">
                        No shipment packages match your current filter criteria
                      </td>
                    </tr>
                  ) : (
                    shipmentRequests.map(req => {
                      const isDelivered = (req.shipmentStatus || 'approved') === 'delivered';
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
                          <td className="p-3">
                            {req.shipmentOrganization && (
                              <div className="text-[11px] font-semibold text-foreground">{req.shipmentOrganization}</div>
                            )}
                            {req.shipmentTrackingIds && req.shipmentTrackingIds.length > 0 ? (
                              <div className="text-[11px] font-mono text-muted-foreground space-y-0.5">
                                {req.shipmentTrackingIds.map((id, i) => (
                                  <div key={i} className="flex items-center gap-0.5">
                                    <Hash className="w-2.5 h-2.5" />{id}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">—</span>
                            )}
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
                              isDelivered ? (
                                <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-1 justify-end">
                                  <PackageCheck className="w-3 h-3" /> Delivered
                                </span>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenUpdateModal(req)}
                                  leftIcon={<Truck className="w-3.5 h-3.5" />}
                                >
                                  {getAdvanceLabel(req.shipmentStatus as ShipmentStatus | undefined)}
                                </Button>
                              )
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
        title="Advance Shipment Status"
        description={updatingRequest ? `Tracking #${updatingRequest.trackingNumber} · ${updatingRequest.customerName}` : ''}
        maxWidth="lg"
      >
        {updatingRequest && nextStatusConfig && (
          <div className="space-y-5">
            {actionError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {actionError}
              </div>
            )}

            {/* Pipeline Progress */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Shipment Pipeline</p>
              <StatusPipeline current={updatingRequest.shipmentStatus as ShipmentStatus | undefined} />
            </div>

            {/* Current to Next transition indicator */}
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/80">
              <div className="flex-1 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Current Status</p>
                {getStatusBadge(updatingRequest.shipmentStatus)}
              </div>
              <ArrowRight className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Will Advance To</p>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${nextStatusConfig.badgeClass} ring-2 ring-primary/30`}>
                  {nextStatusConfig.icon}
                  {nextStatusConfig.label}
                </span>
              </div>
            </div>

            {/* Info callout */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-[11px] text-blue-700 dark:text-blue-400">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <p>Status advances <strong>one step at a time</strong> and cannot be reversed. Fill in the shipment details below before confirming the transition.</p>
            </div>

            {/* Request Summary */}
            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Recipient:</span>
                <span className="font-semibold text-foreground">{updatingRequest.customerName} ({updatingRequest.customerCompany})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Item Description:</span>
                <span className="font-semibold text-foreground">{updatingRequest.requestItem}</span>
              </div>
              {updatingRequest.warehouseName && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Ships From:</span>
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {updatingRequest.warehouseName}
                  </span>
                </div>
              )}
            </div>

            {/* Shipment Details Form */}
            <div className="space-y-4 p-4 rounded-xl border border-border bg-muted/10">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-primary" />
                Shipment Manager Details
              </p>

              {/* Carrier / Organization */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Carrier / Logistics Organization
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={e => setOrganization(e.target.value)}
                  placeholder="e.g. DHL Express, FedEx, Aramex, UPS..."
                  className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60"
                />
              </div>

              {/* Tracking IDs (multiple) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-foreground">
                    Courier Tracking ID(s) {nextStatusKey === 'dispatched' && <span className="text-destructive ml-0.5">*</span>}
                  </label>
                  <button
                    type="button"
                    onClick={handleAddTrackingId}
                    className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add ID
                  </button>
                </div>
                <div className="space-y-2">
                  {trackingIds.map((tid, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex items-center flex-1 gap-2 bg-background border border-input rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-primary/30">
                        <Hash className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <input
                          type="text"
                          value={tid}
                          onChange={e => handleTrackingIdChange(idx, e.target.value)}
                          placeholder="e.g. 1Z999AA10123456784"
                          className="flex-1 text-xs text-foreground font-mono bg-transparent focus:outline-none placeholder:text-muted-foreground/60"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTrackingId(idx)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Remove tracking ID"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Shipment Destination Address
                  {(nextStatusKey === 'dispatched' || nextStatusKey === 'in_process') && (
                    <span className="text-destructive ml-0.5">*</span>
                  )}
                </label>
                <textarea
                  rows={2}
                  value={shippingAddress}
                  onChange={e => setShippingAddress(e.target.value)}
                  placeholder="e.g. 123 Business Park, Suite 400, Dubai, UAE"
                  className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60 resize-none"
                />
              </div>

              {/* Shipment Date */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Shipment Date
                </label>
                <div className="flex items-center gap-2 bg-background border border-input rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-primary/30">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="date"
                    value={shipmentDate}
                    onChange={e => setShipmentDate(e.target.value)}
                    className="flex-1 text-xs text-foreground bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              {/* Dispatch / Logistics Note */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Logistics Note <span className="text-muted-foreground font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={dispatchNote}
                  onChange={e => setDispatchNote(e.target.value)}
                  placeholder="e.g. Fragile items - handle with care. Estimated arrival Friday. Confirm with recipient..."
                  className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60 resize-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
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
                disabled={isProcessing}
                leftIcon={<Truck className="w-3.5 h-3.5" />}
              >
                {isProcessing ? 'Updating...' : `Advance to ${nextStatusConfig.label}`}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

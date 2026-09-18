import React, { useState, useMemo } from 'react';
import {
  FileText,
  Table as TableIcon,
  Kanban,
  Calendar as CalendarIcon,
  Search,
  Filter,
  Plus,
  Download,
  ArrowUpDown,
  ChevronDown,
  X,
  SlidersHorizontal
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { RequestRecord, RequestStatus, RequestPriority } from '../../types/request';
import { Button } from '../../components/common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import { KanbanView } from './KanbanView';
import { CalendarView } from './CalendarView';
import { NewRequestModal } from './NewRequestModal';
import { RequestDetailPage } from './RequestDetailPage';
import { exportToExcel } from '../../utils/exportExcel';
import { useSyncedState } from '../../hooks/useSyncedState';

interface RequestsListPageProps {
  initialRequestId?: string;
  onClearInitialId?: () => void;
}

export const RequestsListPage: React.FC<RequestsListPageProps> = ({
  initialRequestId,
  onClearInitialId
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'calendar'>('table');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(initialRequestId || null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<RequestPriority | 'ALL'>('ALL');
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);
  const [sortField, setSortField] = useState<'date' | 'amount' | 'tracking'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [teams] = useSyncedState(() => dataService.getTeams());
  const [allRequests] = useSyncedState(() => dataService.getRequests());

  // Filter & sort requests
  const filteredRequests = useMemo(() => {
    let list = [...allRequests];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r =>
        (r.trackingNumber || '').toLowerCase().includes(q) ||
        (r.customerCompany || '').toLowerCase().includes(q) ||
        (r.customerName || '').toLowerCase().includes(q) ||
        (r.requestItem || '').toLowerCase().includes(q) ||
        (r.reason || '').toLowerCase().includes(q)
      );
    }

    if (teamFilter !== 'ALL') {
      list = list.filter(r => r.teamId === teamFilter);
    }

    if (statusFilter !== 'ALL') {
      list = list.filter(r => r.status === statusFilter);
    }

    if (priorityFilter !== 'ALL') {
      list = list.filter(r => r.priority === priorityFilter);
    }

    // Sort
    list.sort((a, b) => {
      if (sortField === 'amount') {
        return sortOrder === 'asc' ? a.budgetAmount - b.budgetAmount : b.budgetAmount - a.budgetAmount;
      } else if (sortField === 'tracking') {
        return sortOrder === 'asc' ? a.trackingNumber.localeCompare(b.trackingNumber) : b.trackingNumber.localeCompare(a.trackingNumber);
      } else {
        return sortOrder === 'asc' ? a.requestDate.localeCompare(b.requestDate) : b.requestDate.localeCompare(a.requestDate);
      }
    });

    return list;
  }, [allRequests, searchQuery, teamFilter, statusFilter, priorityFilter, sortField, sortOrder, refreshKey]);

  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const headers = ['Date', 'Agent Name', 'Business Name', 'Category (Sample/Request)', 'Invoice No', 'Sample SKU', 'Total Quantity', 'Per Unit Cost', 'Total Cost', 'Status', 'Tracking #', 'Priority'];
      const rows = filteredRequests.map(r => [
        r.date || r.requestDate || '',
        r.agentOrTeamName || r.customerName || r.submittedByUserName || '',
        r.businessName || r.customerCompany || '',
        r.typeOfFoc || r.requestCategory || 'Sample/Request',
        r.systemInvoiceNo || '',
        r.sampleSku || r.requestItem || '',
        r.sampleSkuQty || 1,
        r.sampleSkuCostPerUnit || (r.budgetAmount ? Math.round((r.budgetAmount / (r.sampleSkuQty || 1)) * 100) / 100 : 0),
        r.sampleSkuTotal || r.budgetAmount || 0,
        r.status || '',
        r.trackingNumber || '',
        r.priority || ''
      ]);
      await exportToExcel(`requests_${new Date().toISOString().split('T')[0]}`, 'Requests', headers, rows);
    } finally {
      setIsExporting(false);
    }
  };

  const activeFiltersCount = (teamFilter !== 'ALL' ? 1 : 0) + (statusFilter !== 'ALL' ? 1 : 0) + (priorityFilter !== 'ALL' ? 1 : 0);

  // If a request is selected, render the detail page
  if (selectedRequestId) {
    return (
      <RequestDetailPage
        requestId={selectedRequestId}
        onBack={() => {
          setSelectedRequestId(null);
          if (onClearInitialId) onClearInitialId();
        }}
        onUpdate={() => setRefreshKey(k => k + 1)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Requests Hub
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage submissions, multi-level authorizations, and budget deduct allocations
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Switcher Tabs */}
          <div className="p-1 bg-muted rounded-xl border border-border flex items-center gap-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'table' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Data Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
           
            
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={isExporting}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            {isExporting ? 'Exporting...' : 'Export Excel'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsNewModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Request
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by tracking #, customer name, company, item, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick filter pills */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="bg-background border border-input text-xs rounded-lg px-2.5 py-2 text-foreground focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Teams</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-background border border-input text-xs rounded-lg px-2.5 py-2 text-foreground focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="pending_executive">Pending Executive</option>
              <option value="pending_manager">Pending Manager</option>
              <option value="pending_hod">Pending HOD</option>
              <option value="pending_president">Pending President</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="bg-background border border-input text-xs rounded-lg px-2.5 py-2 text-foreground focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTeamFilter('ALL');
                  setStatusFilter('ALL');
                  setPriorityFilter('ALL');
                  setSearchQuery('');
                }}
                className="text-xs text-primary"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Results counter & active sort info */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
          <span>
            Showing <strong>{filteredRequests.length}</strong> of {allRequests.length} requests
          </span>
          <div className="flex items-center gap-2">
            <span>Sort by:</span>
            <button
              onClick={() => {
                if (sortField === 'date') setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                else { setSortField('date'); setSortOrder('desc'); }
              }}
              className={`hover:text-foreground font-medium ${sortField === 'date' ? 'text-primary' : ''}`}
            >
              Date {sortField === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <span>•</span>
            <button
              onClick={() => {
                if (sortField === 'amount') setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                else { setSortField('amount'); setSortOrder('desc'); }
              }}
              className={`hover:text-foreground font-medium ${sortField === 'amount' ? 'text-primary' : ''}`}
            >
              Amount {sortField === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>
      </div>

      {/* Main View rendering */}
      {viewMode === 'table' ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:min-w-[760px]">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20">
                  <th className="p-3.5 pl-4 text-primary font-bold">Date</th>
                  <th className="p-3.5 hidden sm:table-cell">Agent Name</th>
                  <th className="p-3.5">Business Name</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5 hidden md:table-cell">Invoice No</th>
                  <th className="p-3.5 hidden md:table-cell">Sample SKU</th>
                  <th className="p-3.5 text-center hidden sm:table-cell">Total Qty</th>
                  <th className="p-3.5 text-right hidden sm:table-cell">Per Unit Cost</th>
                  <th className="p-3.5 text-right">Total Cost</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right pr-4 hidden sm:table-cell">Tracking #</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-muted-foreground">
                      No requests found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => {
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
                        onClick={() => setSelectedRequestId(req.id)}
                        className="hover:bg-muted/40 cursor-pointer transition-colors group"
                      >
                        <td className="p-3.5 pl-4 font-mono font-bold text-primary whitespace-nowrap">
                          {reqDate}
                        </td>
                        <td className="p-3.5 font-medium text-foreground whitespace-nowrap hidden sm:table-cell">
                          {agentName}
                        </td>
                        <td className="p-3.5 font-semibold text-foreground group-hover:text-primary transition-colors whitespace-nowrap">
                          {business}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium border border-border/50 text-muted-foreground">
                            {category}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-muted-foreground whitespace-nowrap hidden md:table-cell">
                          {invoiceNo}
                        </td>
                        <td className="p-3.5 text-foreground font-medium truncate max-w-[180px] hidden md:table-cell" title={sampleSku}>
                          {sampleSku}
                        </td>
                        <td className="p-3.5 text-center font-mono font-semibold hidden sm:table-cell">
                          {qty}
                        </td>
                        <td className="p-3.5 text-right font-mono text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                          ${unitCost.toFixed(2)}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-foreground whitespace-nowrap">
                          ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <StatusBadge status={req.status} size="sm" />
                        </td>
                        <td className="p-3.5 text-right pr-4 font-mono font-bold text-primary whitespace-nowrap hidden sm:table-cell">
                          {req.trackingNumber}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : viewMode === 'kanban' ? (
        <KanbanView
          requests={filteredRequests}
          onSelectRequest={(req) => setSelectedRequestId(req.id)}
        />
      ) : (
        <CalendarView
          requests={filteredRequests}
          onSelectRequest={(req) => setSelectedRequestId(req.id)}
        />
      )}

      {/* Modal for creating a new request */}
      <NewRequestModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={(id) => {
          setSelectedRequestId(id);
          setRefreshKey(k => k + 1);
        }}
      />
    </div>
  );
};

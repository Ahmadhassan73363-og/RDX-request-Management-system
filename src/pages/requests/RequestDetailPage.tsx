import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Building,
  User,
  Calendar,
  AlertTriangle,
  FileText,
  MessageSquare,
  Send,
  ShieldCheck,
  Award,
  ChevronRight,
  Printer,
  Truck,
  PackageCheck,
  PackageOpen,
  FormInput,
  RotateCcw
} from 'lucide-react';
import { RequestRecord, RequestStatus, ShipmentStatus } from '../../types/request';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { Button } from '../../components/common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import { SignaturePad } from '../../components/common/SignaturePad';
import { Modal } from '../../components/common/Modal';

interface RequestDetailPageProps {
  requestId: string;
  onBack: () => void;
  onUpdate: () => void;
}

export const RequestDetailPage: React.FC<RequestDetailPageProps> = ({ requestId, onBack, onUpdate }) => {
  const { currentUser, hasPermission } = useAuth();
  const request = dataService.getRequestById(requestId);
  const linkedWarehouse = request?.warehouseId ? dataService.getWarehouses().find(w => w.id === request.warehouseId) : undefined;
  const linkedCustomer = request?.customerId ? dataService.getCustomers().find(c => c.id === request.customerId) : undefined;
  const realTeam = request ? dataService.getTeams().find(t => t.id === request.teamId) : null;
  // The request's team can be deleted out from under it (its team_id gets nulled
  // server-side). Fall back to a zeroed placeholder instead of treating this
  // request as "not found" — that was misleading and blocked viewing/acting on it.
  const team = realTeam || (request ? {
    id: '',
    name: request.teamName || 'Unassigned team',
    code: '',
    description: '',
    type: 'B2B' as const,
    leadId: '',
    leadName: '',
    allocatedBudget: 0,
    spentBudget: 0,
    remainingBudget: 0,
    active: false,
    memberCount: 0,
    currency: '$',
    createdAt: request.createdAt
  } : null);

  const [commentText, setCommentText] = useState('');
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'request_changes' | 'override_approve'>('approve');
  const [actionComments, setActionComments] = useState('');
  const [signatureData, setSignatureData] = useState('');
  const [actionError, setActionError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAppealModalOpen, setIsAppealModalOpen] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [appealError, setAppealError] = useState('');
  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);

  if (!request || !team) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Request not found.</p>
        <Button variant="outline" onClick={onBack}>Back to Requests</Button>
      </div>
    );
  }

  const isPending = ['submitted', 'under_review', 'pending_executive', 'pending_manager', 'pending_hod', 'pending_assistant', 'pending_president', 'appealed'].includes(request.status);
  const isAssignedApprover = currentUser.roleName === request.currentApproverRole || currentUser.roleName === 'Super Admin';
  const canApprove = hasPermission('approvals:approve') && isAssignedApprover;
  const canOverride = hasPermission('budgets:override');
  const isSuperAdmin = currentUser.roleName === 'Super Admin';
  const isShipmentManager = currentUser.roleName === 'Shipment Manager' || hasPermission('shipments:manage');
  const hasSufficientBudget = team.remainingBudget >= request.budgetAmount;

  // 4-Stage approval pipeline: Executive -> Manager -> HOD -> President
  const stages = [
    { order: 1, role: 'Executive', label: 'Executive Review' },
    { order: 2, role: 'Manager', label: 'Manager Verification' },
    { order: 3, role: 'HOD', label: 'HOD Approval' },
    { order: 4, role: 'President', label: 'Presidential Sign-Off' },
  ];

  const shipmentStatusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    approved: { label: 'Approved – Ready', color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400', icon: <CheckCircle2 className="w-4 h-4" /> },
    in_process: { label: 'In Process', color: 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400', icon: <Clock className="w-4 h-4" /> },
    dispatched: { label: 'Dispatched', color: 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400', icon: <Truck className="w-4 h-4" /> },
    delivered: { label: 'Delivered', color: 'bg-teal-500/10 border-teal-500/30 text-teal-700 dark:text-teal-400', icon: <PackageCheck className="w-4 h-4" /> },
    pending: { label: 'Pending Approval', color: 'bg-slate-500/10 border-slate-500/30 text-slate-700 dark:text-slate-400', icon: <Clock className="w-4 h-4" /> },
  };

  const handleExecuteAppeal = () => {
    setAppealError('');
    if (!appealReason.trim()) {
      setAppealError('Please provide a reason for your appeal.');
      return;
    }
    try {
      dataService.appealRequest(request.id, appealReason.trim(), currentUser);
      setIsAppealModalOpen(false);
      setAppealReason('');
      onUpdate();
    } catch (err: any) {
      setAppealError(err.message || 'Error submitting appeal');
    }
  };

  const handleUpdateShipmentStatus = (newStatus: ShipmentStatus) => {
    dataService.updateShipmentStatus(request.id, newStatus, currentUser);
    setIsShipmentModalOpen(false);
    onUpdate();
  };

  const handleOpenAction = (type: 'approve' | 'reject' | 'request_changes' | 'override_approve') => {
    setActionType(type);
    setActionComments('');
    setSignatureData('');
    setActionError('');
    setIsActionModalOpen(true);
  };

  const handleExecuteApproval = () => {
    setActionError('');
    if (actionType === 'reject' && !actionComments.trim()) {
      setActionError('A rationale comment is mandatory when rejecting a request.');
      return;
    }

    if ((actionType === 'approve' || actionType === 'override_approve') && !signatureData) {
      setActionError('Digital signature sign-off is required.');
      return;
    }

    setIsProcessing(true);
    try {
      dataService.processApprovalStep(
        request.id,
        actionType === 'override_approve' ? 'approve' : actionType,
        actionComments,
        signatureData,
        currentUser,
        actionType === 'override_approve'
      );
      setIsProcessing(false);
      setIsActionModalOpen(false);
      onUpdate();
    } catch (err: any) {
      setActionError(err.message || 'Error processing approval step');
      setIsProcessing(false);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    dataService.addCommentToRequest(request.id, commentText.trim(), currentUser);
    setCommentText('');
    onUpdate();
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold font-mono text-primary tracking-tight">
                {request.trackingNumber}
              </h2>
              <StatusBadge status={request.status} />
              <PriorityBadge priority={request.priority} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Submitted on {request.requestDate} by {request.submittedByUserName} ({request.teamName})
            </p>
          </div>
        </div>

        {/* Action Buttons for Approvers */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            leftIcon={<Printer className="w-3.5 h-3.5" />}
            className="no-print"
          >
            Print
          </Button>

          {isPending && canApprove && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenAction('request_changes')}
              >
                Request Changes
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleOpenAction('reject')}
              >
                Reject
              </Button>

              {!hasSufficientBudget ? (
                canOverride ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenAction('override_approve')}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    Override & Approve
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" disabled title="Insufficient team remaining budget">
                    Budget Insufficient
                  </Button>
                )
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenAction('approve')}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Approve Stage
                </Button>
              )}
            </>
          )}

          {isPending && hasPermission('approvals:approve') && !isAssignedApprover && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/60">
              <ShieldCheck className="w-3.5 h-3.5" />
              Awaiting <strong className="text-foreground">{request.currentApproverRole}</strong> — not actionable by your role
            </span>
          )}

          {/* Appeal button for rejected requests */}
          {request.status === 'rejected' &&
            (currentUser.id === request.submittedByUserId || isSuperAdmin) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setAppealReason(''); setAppealError(''); setIsAppealModalOpen(true); }}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                className="border-orange-400 text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"
              >
                Appeal Rejection
              </Button>
            )
          }

          {/* Shipment Manager: update shipment status */}
          {request.status === 'approved' && isShipmentManager && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsShipmentModalOpen(true)}
              leftIcon={<Truck className="w-3.5 h-3.5" />}
              className="border-blue-400 text-blue-600 hover:bg-blue-50 dark:text-blue-400"
            >
              Update Shipment
            </Button>
          )}
        </div>
      </div>

      {/* Grid: Request details + Budget Impact Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Full Request Overview & Approval Workflow */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Request & Sample Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Date</span>
                  <p className="text-sm font-bold text-foreground">{request.date || request.requestDate}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Team</span>
                  <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    {team?.name || request.teamName}
                    {(team as any)?.type && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        (team as any).type === 'B2C'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                      }`}>{(team as any).type}</span>
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Agent / Staff Member</span>
                  <p className="text-sm font-bold text-foreground">{request.agentName || request.agentOrTeamName || request.customerName}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1 border-t border-border/60">
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Our Company Name</span>
                  <p className="text-sm font-bold text-foreground">{request.ourCompanyName || request.companyName || '—'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Business Name (Customer)</span>
                  <p className="text-sm font-bold text-foreground">{request.businessName || request.customerCompany}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Category</span>
                  <p className="text-sm font-bold text-foreground">
                    {request.category ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        request.category === 'Sample'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      }`}>
                        {request.category === 'Sample' ? '🧪' : '🎁'} {request.category}
                      </span>
                    ) : (request.typeOfFoc || request.requestCategory || '—')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1 border-t border-border/60">
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">System Invoice No.</span>
                  <p className="text-sm font-mono font-bold text-foreground">{request.systemInvoiceNo || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">GBP Exchange Rate</span>
                  <p className="text-sm font-mono font-bold text-foreground">
                    {request.gbpExchangeRate ? `1 GBP = ${request.gbpExchangeRate}` : '—'}
                  </p>
                </div>
              </div>

              {/* Sample SKU Details Box */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-3">
                <span className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Sample SKU Breakdown</span>

                {/* Multi-SKU table if available */}
                {request.skuItems && request.skuItems.length > 0 ? (
                  <div className="space-y-2">
                    <div className="hidden sm:grid sm:grid-cols-6 gap-2 px-1">
                      <div className="sm:col-span-2 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">SKU Code</div>
                      <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">QTY</div>
                      <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Per Unit</div>
                      <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Per Unit (£)</div>
                      <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Total</div>
                    </div>
                    {request.skuItems.map((item, i) => (
                      <div key={item.id || i} className="grid grid-cols-3 sm:grid-cols-6 gap-2 p-2 bg-background rounded-lg border border-border/60 text-xs">
                        <div className="col-span-3 sm:col-span-2 font-mono font-semibold text-foreground">{item.sampleSku}</div>
                        <div className="font-mono text-foreground">{Number(item.sampleSkuQty) || 0}</div>
                        <div className="font-mono text-foreground">${(Number(item.sampleSkuCostPerUnit) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div className="font-mono text-amber-600 dark:text-amber-400">
                          {item.sampleSkuCostPerUnitGbp !== undefined ? `£${(Number(item.sampleSkuCostPerUnitGbp) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                        </div>
                        <div className="font-mono font-bold text-primary">${(item.sampleSkuTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </div>
                    ))}
                    {/* Totals row */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20 text-xs font-bold">
                      <div className="col-span-3 sm:col-span-2 text-foreground">Grand Total</div>
                      <div className="text-foreground">{request.sampleSkuQty ?? 0} units</div>
                      <div className="text-foreground">—</div>
                      <div className="text-amber-600 dark:text-amber-400">
                        {request.sampleSkuTotalGbp !== undefined ? `£${(request.sampleSkuTotalGbp || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </div>
                      <div className="text-primary font-mono">${(request.sampleSkuTotal || request.budgetAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground">Sample SKU:</span>
                      <p className="font-semibold text-foreground truncate">{request.sampleSku || request.requestItem}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">QTY:</span>
                      <p className="font-semibold text-foreground font-mono">{request.sampleSkuQty ?? 1}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Cost per Unit:</span>
                      <p className="font-semibold text-foreground font-mono">
                        ${((request.sampleSkuCostPerUnit !== undefined ? request.sampleSkuCostPerUnit : request.budgetAmount) || 0).toLocaleString()}
                        {request.sampleSkuCostPerUnitGbp !== undefined && (
                          <span className="ml-1 text-amber-600 dark:text-amber-400">/ £{(request.sampleSkuCostPerUnitGbp || 0).toLocaleString()}</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Total ({request.sampleSkuTotalGbp !== undefined ? '/ GBP' : ''}):</span>
                      <p className="font-bold font-mono">
                        <span className="text-primary">${((request.sampleSkuTotal !== undefined ? request.sampleSkuTotal : request.budgetAmount) || 0).toLocaleString()}</span>
                        {request.sampleSkuTotalGbp !== undefined && (
                          <span className="ml-1 text-amber-600 dark:text-amber-400">/ £{(request.sampleSkuTotalGbp || 0).toLocaleString()}</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Rationale */}
              <div className="space-y-1.5 text-xs">
                <span className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Business Justification</span>
                <p className="text-xs text-foreground/90 leading-relaxed bg-background p-3 rounded-lg border border-border">
                  {request.reason}
                </p>
              </div>

              {/* Attachments */}
              {request.attachments.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">Attached Verification Documents</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {request.attachments.map(att => (
                      <div key={att.id} className="p-2.5 rounded-lg border bg-muted/20 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-primary shrink-0" />
                          <span className="font-medium truncate">{att.name}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                          {Math.round(att.size / 1024)} KB
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dynamic Form Schema Custom Fields (if submitted via custom or dynamic form) */}
          {request.customFields && Object.keys(request.customFields).length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FormInput className="w-4 h-4 text-primary" />
                      <span>Form Submission: {request.formTitle || 'Custom Dynamic Form'}</span>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Captured field values linked to this authorized template
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary font-mono">
                    Template Data
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {Object.entries(request.customFields).map(([label, val]) => (
                    <div key={label} className="p-3 rounded-xl bg-muted/30 border border-border/70 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                        {label}
                      </span>
                      <div className="text-xs font-semibold text-foreground break-words">
                        {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : (
                          typeof val === 'string' && val.startsWith('data:image') ? (
                            <img src={val} alt={label} className="h-14 border rounded-lg bg-white p-1" />
                          ) : (
                            typeof val === 'string' && val.startsWith('TYPED_SIGNATURE:') ? (
                              <span className="font-serif italic text-primary text-sm">/s/ {val.split(':')[1]}</span>
                            ) : String(val || '—')
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Multi-Level Approval Pipeline Visualizer */}
          <Card>
            <CardHeader>
              <CardTitle>Multi-Level Approval Process</CardTitle>
              <p className="text-xs text-muted-foreground">
                Configured 4-stage executive governance chain
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 pt-2">
                {stages.map((stage, idx) => {
                  const historyEntry = request.approvalHistory.find(h => h.stepOrder === stage.order);
                  const isCurrent = isPending && request.currentApprovalStepIndex === stage.order;
                  const isPassed = request.currentApprovalStepIndex > stage.order || request.status === 'approved';
                  const isRejectedHere = request.status === 'rejected' && historyEntry?.action === 'reject';

                  return (
                    <div key={stage.order} className="flex items-start gap-4 text-xs">
                      {/* Circle indicator */}
                      <div className="relative flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isRejectedHere
                            ? 'bg-rose-500 text-white'
                            : isPassed
                              ? 'bg-emerald-500 text-white'
                              : isCurrent
                                ? 'bg-primary text-white ring-4 ring-primary/20 animate-pulse'
                                : 'bg-muted text-muted-foreground border border-border'
                            }`}
                        >
                          {isRejectedHere ? (
                            <XCircle className="w-4 h-4" />
                          ) : isPassed ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            stage.order
                          )}
                        </div>
                        {idx < stages.length - 1 && (
                          <div
                            className={`w-0.5 h-12 my-1 ${isPassed ? 'bg-emerald-500' : 'bg-border'
                              }`}
                          />
                        )}
                      </div>

                      {/* Stage Body */}
                      <div className="flex-1 min-w-0 pb-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground text-sm">
                            {stage.label} ({stage.role})
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {isPassed
                              ? 'PASSED'
                              : isRejectedHere
                                ? 'DECLINED'
                                : isCurrent
                                  ? 'AWAITING SIGN-OFF'
                                  : 'UPCOMING'}
                          </span>
                        </div>

                        {historyEntry ? (
                          <div className="mt-1.5 p-2.5 rounded-lg bg-muted/40 border border-border/60 space-y-1 text-xs">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>Signed off by: <strong>{historyEntry.userName}</strong> ({historyEntry.roleName})</span>
                              <span className="font-mono">{new Date(historyEntry.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-foreground italic">"{historyEntry.comments}"</p>
                            {historyEntry.digitalSignature && (
                              <div className="text-[10px] text-primary font-mono pt-1 border-t border-border/40 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                                <span>Digital Seal: {historyEntry.digitalSignature.substring(0, 40)}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {isCurrent ? `Pending sign-off by any ${stage.role} member.` : 'Waiting for prior stage completion.'}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Comments & Collaboration Stream */}
          <Card>
            <CardHeader>
              <CardTitle>Comments & Discussion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {request.comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No comments yet.</p>
                ) : (
                  request.comments.map(c => (
                    <div key={c.id} className="p-3 rounded-xl bg-muted/30 border border-border/60 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{c.userName} ({c.userRole})</span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-foreground/90">{c.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment */}
              <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Add a remark or note for review committee..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 bg-background border border-input rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button type="submit" size="sm" variant="primary" leftIcon={<Send className="w-3.5 h-3.5" />}>
                  Post
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Real-Time Budget Impact Ledger */}
        <div className="space-y-6">
          <Card className="border-primary/30 shadow-md">
            <CardHeader>
              <CardTitle className="text-sm">Team Budget Impact Ledger</CardTitle>
              <p className="text-xs text-muted-foreground">
                Real-time financial reconciliation for {team.name}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {!realTeam && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>This request's team ("{team.name}") was deleted — budget figures below are unavailable and approval may be blocked until it's reassigned.</span>
                </div>
              )}
              {/* Financial Snapshot Numbers */}
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/80">
                  <span className="text-muted-foreground">Original / Retail Value:</span>
                  <span className="font-semibold text-foreground">${(request.requestValue || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-border/80">
                  <span className="text-muted-foreground font-bold">Total Budget Charged:</span>
                  <span className="font-bold text-sm text-primary">${(request.budgetAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-border/80">
                  <span className="text-muted-foreground">Current Team Remaining:</span>
                  <span className="font-semibold text-foreground">${(team.remainingBudget || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-muted-foreground font-bold">Projected After Approval:</span>
                  <span className={`font-bold text-sm ${hasSufficientBudget ? 'text-foreground' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                    ${((team.remainingBudget || 0) - (request.status === 'approved' ? 0 : (request.budgetAmount || 0))).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Budget status alert */}
              {!hasSufficientBudget && request.status !== 'approved' && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Insufficient Budget Alert</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    This team only has ${(team.remainingBudget || 0).toLocaleString()} left. Standard approval is blocked unless authorized by Super Admin or President override.
                  </p>
                </div>
              )}

              {request.status === 'approved' && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Budget Deducted Successfully</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    ${(request.budgetAmount || 0).toLocaleString()} has been charged to {team.name}'s fiscal ledger.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shipment Status Card */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                Shipment Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const shipStatus = request.shipmentStatus || 'pending';
                const cfg = shipmentStatusConfig[shipStatus] || shipmentStatusConfig.pending;
                return (
                  <div className={`p-3 rounded-xl border flex items-center gap-2.5 font-semibold text-sm ${cfg.color}`}>
                    {cfg.icon}
                    <span>{cfg.label}</span>
                  </div>
                );
              })()}

              {request.status !== 'approved' ? (
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Shipment will be initiated automatically once final approval sign-off is completed.
                </p>
              ) : (
                <>
                  {request.shipmentStatus === 'approved' && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Approved by leadership. Ready for logistics dispatch queue.
                    </p>
                  )}
                  {request.shipmentStatus === 'in_process' && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Package is currently being assembled and prepared for dispatch.
                    </p>
                  )}
                  {request.shipmentStatus === 'dispatched' && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Package is in transit with courier.
                    </p>
                  )}
                  {request.shipmentStatus === 'delivered' && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Package has been confirmed delivered to the recipient.
                    </p>
                  )}

                  {isShipmentManager && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsShipmentModalOpen(true)}
                      leftIcon={<Truck className="w-3.5 h-3.5" />}
                      className="w-full mt-2 border-primary/40 text-primary hover:bg-primary/10"
                    >
                      Update Shipment Status
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Submitter & Delivery Meta Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Metadata & Target Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Submitting User:</span>
                <span className="font-semibold text-foreground">{request.submittedByUserName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="text-foreground">{request.submittedByUserEmail}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Team:</span>
                <span className="text-foreground font-semibold">{request.teamName}</span>
              </div>
              {request.companyName && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Issuing Company:</span>
                  <span className="text-foreground font-semibold">{request.companyName}</span>
                </div>
              )}
              {(linkedWarehouse || request.warehouseName) && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">Ships From:</span>
                  <span className="text-foreground font-semibold text-right">
                    {linkedWarehouse?.name || request.warehouseName}
                    {linkedWarehouse?.address && (
                      <span className="block text-[10px] text-muted-foreground font-normal">{linkedWarehouse.address}</span>
                    )}
                  </span>
                </div>
              )}
              {linkedCustomer && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">Ships To:</span>
                  <span className="text-foreground font-semibold text-right">
                    {linkedCustomer.contactName}
                    <span className="block text-[10px] text-muted-foreground font-normal">{linkedCustomer.shippingAddress}</span>
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Delivery Deadline:</span>
                <span className="font-mono text-foreground font-semibold">
                  {request.deliveryTargetDate || 'Immediate'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Interactive Approval Action Modal with Digital Signature */}
      <Modal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        title={
          actionType === 'approve'
            ? 'Sign & Authorize Request'
            : actionType === 'override_approve'
              ? 'Executive Budget Override Authorization'
              : actionType === 'reject'
                ? 'Decline Request'
                : 'Request Modifications'
        }
        description={`Taking action as ${currentUser.name} (${currentUser.roleName})`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          {actionError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {actionError}
            </div>
          )}

          {actionType === 'override_approve' && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
              <strong>Executive Override Notice:</strong> This request exceeds {team.name}'s remaining balance. Your digital authorization will be logged in the permanent enterprise audit register.
            </div>
          )}

          {/* Comments */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Reviewer Notes / Rationale {actionType === 'reject' && '*'}
            </label>
            <textarea
              rows={3}
              value={actionComments}
              onChange={(e) => setActionComments(e.target.value)}
              placeholder={actionType === 'reject' ? 'Explain required reason for declining...' : 'Add remarks or stipulations (optional)...'}
              className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Digital Signature Pad (required for approve & override) */}
          {(actionType === 'approve' || actionType === 'override_approve') && (
            <SignaturePad
              value={signatureData}
              onChange={(data) => setSignatureData(data)}
              label="Reviewer Digital Sign-Off Seal"
              required
            />
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setIsActionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={actionType === 'reject' ? 'destructive' : 'primary'}
              size="sm"
              isLoading={isProcessing}
              onClick={handleExecuteApproval}
            >
              Confirm {actionType.replace(/_/g, ' ').toUpperCase()}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Appeal Rejection Modal */}
      <Modal
        isOpen={isAppealModalOpen}
        onClose={() => setIsAppealModalOpen(false)}
        title="Appeal Rejected Request"
        description="Provide a strong rationale to re-enter the approval pipeline"
        maxWidth="md"
      >
        <div className="space-y-4">
          {appealError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {appealError}
            </div>
          )}
          <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-start gap-3">
            <RotateCcw className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-foreground">Submitting an Appeal</p>
              <p className="text-muted-foreground leading-relaxed">
                Your appeal will re-enter the approval pipeline at Stage 1 (Executive Review). Please provide a compelling business justification for reconsideration.
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Appeal Reason *
            </label>
            <textarea
              rows={4}
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              placeholder="Explain why this request should be reconsidered and any new information or context..."
              className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setIsAppealModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExecuteAppeal}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Submit Appeal
            </Button>
          </div>
        </div>
      </Modal>

      {/* Shipment Status Update Modal (Shipment Manager only) */}
      <Modal
        isOpen={isShipmentModalOpen}
        onClose={() => setIsShipmentModalOpen(false)}
        title="Update Shipment Status"
        description="Shipment Manager exclusive — transition the logistics status"
        maxWidth="sm"
      >
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Current status: <strong>{shipmentStatusConfig[request.shipmentStatus || 'approved']?.label}</strong></p>
          <div className="grid grid-cols-1 gap-2">
            {(['approved', 'in_process', 'dispatched', 'delivered'] as ShipmentStatus[]).map(status => {
              const cfg = shipmentStatusConfig[status];
              const isCurrent = (request.shipmentStatus || 'approved') === status;
              return (
                <button
                  key={status}
                  onClick={() => handleUpdateShipmentStatus(status)}
                  disabled={isCurrent}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left text-xs transition-all ${
                    isCurrent
                      ? 'border-primary bg-primary/5 cursor-not-allowed opacity-60'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer'
                  }`}
                >
                  <span className={`p-1.5 rounded-lg border ${cfg.color}`}>{cfg.icon}</span>
                  <div>
                    <p className="font-semibold text-foreground">{cfg.label}</p>
                    {isCurrent && <p className="text-[10px] text-muted-foreground">Current status</p>}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setIsShipmentModalOpen(false)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

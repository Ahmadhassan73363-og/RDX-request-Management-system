import React, { useState } from 'react';
import {
  CheckSquare,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  ShieldCheck,
  ChevronRight,
  Filter
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { RequestRecord } from '../../types/request';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { SignaturePad } from '../../components/common/SignaturePad';

interface ApprovalsQueuePageProps {
  onNavigateToRequest: (id: string) => void;
}

export const ApprovalsQueuePage: React.FC<ApprovalsQueuePageProps> = ({ onNavigateToRequest }) => {
  const { currentUser, hasPermission } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeStageFilter, setActiveStageFilter] = useState<'ALL' | 'EXECUTIVE' | 'MANAGER' | 'HOD' | 'PRESIDENT'>('ALL');

  // Modal action state
  const [selectedRequest, setSelectedRequest] = useState<RequestRecord | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'request_changes' | 'override_approve'>('approve');
  const [actionComments, setActionComments] = useState('');
  const [signatureData, setSignatureData] = useState('');
  const [actionError, setActionError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const requests = dataService.getRequests();
  const teams = dataService.getTeams();

  // Pending approval statuses
  const pendingRequests = requests.filter(r =>
    ['submitted', 'under_review', 'pending_executive', 'pending_manager', 'pending_hod', 'pending_assistant', 'pending_president'].includes(r.status)
  );

  const filteredRequests = pendingRequests.filter(r => {
    if (activeStageFilter === 'EXECUTIVE') return r.status === 'pending_executive' || r.status === 'submitted';
    if (activeStageFilter === 'MANAGER') return r.status === 'pending_manager';
    if (activeStageFilter === 'HOD') return r.status === 'pending_hod';
    if (activeStageFilter === 'PRESIDENT') return r.status === 'pending_president';
    return true;
  });

  const handleOpenActionModal = (req: RequestRecord, type: 'approve' | 'reject' | 'request_changes' | 'override_approve') => {
    setSelectedRequest(req);
    setActionType(type);
    setActionComments('');
    setSignatureData('');
    setActionError('');
  };

  const handleExecuteApproval = () => {
    if (!selectedRequest) return;
    setActionError('');

    if (actionType === 'reject' && !actionComments.trim()) {
      setActionError('A rationale comment is required when rejecting a request.');
      return;
    }

    if ((actionType === 'approve' || actionType === 'override_approve') && !signatureData) {
      setActionError('Digital signature sign-off is required.');
      return;
    }

    setIsProcessing(true);
    try {
      dataService.processApprovalStep(
        selectedRequest.id,
        actionType === 'override_approve' ? 'approve' : actionType,
        actionComments,
        signatureData,
        currentUser,
        actionType === 'override_approve'
      );
      setIsProcessing(false);
      setSelectedRequest(null);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      setActionError(err.message || 'Error executing approval action');
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" />
            Multi-Stage Approvals Queue
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review and digitally authorize customer requests through executive stages
          </p>
        </div>

        {/* Stage Filter Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl border border-border text-xs">
          <button
            onClick={() => setActiveStageFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeStageFilter === 'ALL' ? 'bg-card text-foreground shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Pending ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveStageFilter('EXECUTIVE')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeStageFilter === 'EXECUTIVE' ? 'bg-card text-foreground shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Executive
          </button>
          <button
            onClick={() => setActiveStageFilter('MANAGER')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeStageFilter === 'MANAGER' ? 'bg-card text-foreground shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Manager
          </button>
          <button
            onClick={() => setActiveStageFilter('HOD')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeStageFilter === 'HOD' ? 'bg-card text-foreground shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            HOD
          </button>
          <button
            onClick={() => setActiveStageFilter('PRESIDENT')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeStageFilter === 'PRESIDENT' ? 'bg-card text-foreground shadow-xs font-semibold' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            President
          </button>
        </div>
      </div>

      {/* Queue Cards */}
      {filteredRequests.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">All Clear! No Pending Approvals</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            All submitted requests have been reviewed or are awaiting prior stage actions.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRequests.map((req) => {
            const team = teams.find(t => t.id === req.teamId);
            const remaining = team ? team.remainingBudget : 0;
            const hasSufficient = remaining >= req.budgetAmount;
            const canOverride = hasPermission('budgets:override');

            return (
              <Card key={req.id} hoverEffect className="relative overflow-hidden p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-primary">
                      {req.trackingNumber}
                    </span>
                    <StatusBadge status={req.status} />
                    <PriorityBadge priority={req.priority} />
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      • Stage {req.currentApprovalStepIndex} of {req.totalApprovalSteps} ({req.currentApproverRole})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigateToRequest(req.id)}
                      className="text-xs"
                      rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                    >
                      Full Details
                    </Button>
                  </div>
                </div>

                {/* Content columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Client & Item */}
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">{req.customerCompany}</p>
                    <p className="text-muted-foreground">Recipient: <strong className="text-foreground">{req.customerName}</strong></p>
                    <p className="text-muted-foreground truncate">Item: <strong>{req.requestItem}</strong></p>
                    <p className="text-[11px] text-muted-foreground font-mono">Team: {req.teamName}</p>
                  </div>

                  {/* Financial Metrics */}
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/80 space-y-1.5 font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Retail Value:</span>
                      <span className="font-semibold text-foreground">${req.requestValue.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-border/60 font-bold">
                      <span className="text-primary">Budget Deduct:</span>
                      <span className="text-sm text-primary">${req.budgetAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Team Balance & Approver Decision */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Team Remaining:</span>
                      <span className="font-mono font-bold text-foreground">${remaining.toLocaleString()}</span>
                    </div>

                    {!hasSufficient ? (
                      <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-700 dark:text-rose-400 flex items-center gap-1.5 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Insufficient team budget (-${(req.budgetAmount - remaining).toLocaleString()})</span>
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Budget available (${(remaining - req.budgetAmount).toLocaleString()} after deduct)</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenActionModal(req, 'request_changes')}
                        className="text-xs h-8"
                      >
                        Changes
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleOpenActionModal(req, 'reject')}
                        className="text-xs h-8"
                      >
                        Reject
                      </Button>

                      {!hasSufficient ? (
                        canOverride ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenActionModal(req, 'override_approve')}
                            className="bg-amber-600 hover:bg-amber-700 text-xs h-8"
                          >
                            Override & Sign
                          </Button>
                        ) : (
                          <Button variant="primary" size="sm" disabled className="text-xs h-8">
                            Blocked
                          </Button>
                        )
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOpenActionModal(req, 'approve')}
                          leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          className="text-xs h-8"
                        >
                          Sign & Approve
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Action Dialog */}
      {selectedRequest && (
        <Modal
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          title={
            actionType === 'approve'
              ? `Authorize ${selectedRequest.trackingNumber}`
              : actionType === 'override_approve'
              ? `Executive Override for ${selectedRequest.trackingNumber}`
              : actionType === 'reject'
              ? `Reject ${selectedRequest.trackingNumber}`
              : `Request Modifications`
          }
          description={`Signing as ${currentUser.name} (${currentUser.roleName})`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            {actionError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {actionError}
              </div>
            )}

            <div className="p-3 rounded-xl bg-muted/40 border border-border/80 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span>Client / Deal:</span>
                <strong className="text-foreground">{selectedRequest.customerCompany}</strong>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span>Budget Charge:</span>
                <strong className="text-primary font-bold">${selectedRequest.budgetAmount.toLocaleString()}</strong>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Comments & Reviewer Notes {actionType === 'reject' && '*'}
              </label>
              <textarea
                rows={3}
                value={actionComments}
                onChange={(e) => setActionComments(e.target.value)}
                placeholder={actionType === 'reject' ? 'Mandatory reason for declining this request...' : 'Optional approval notes...'}
                className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {(actionType === 'approve' || actionType === 'override_approve') && (
              <SignaturePad
                value={signatureData}
                onChange={(data) => setSignatureData(data)}
                label="Digital Authorization Stamp"
                required
              />
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setSelectedRequest(null)}>
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
      )}
    </div>
  );
};

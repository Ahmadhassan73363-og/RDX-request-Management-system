import React from 'react';
import { RequestRecord, RequestStatus } from '../../types/request';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import { Clock, DollarSign, ArrowRight, User } from 'lucide-react';

interface KanbanViewProps {
  requests: RequestRecord[];
  onSelectRequest: (req: RequestRecord) => void;
  onMoveStatus?: (requestId: string, newStatus: RequestStatus) => void;
}

const COLUMNS: { id: RequestStatus; label: string; bg: string; dot: string }[] = [
  { id: 'submitted', label: 'Submitted / Review', bg: 'bg-blue-500/10', dot: 'bg-blue-500' },
  { id: 'pending_executive', label: 'Pending Executive', bg: 'bg-indigo-500/10', dot: 'bg-indigo-500' },
  { id: 'pending_assistant', label: 'Pending Assistant', bg: 'bg-cyan-500/10', dot: 'bg-cyan-500' },
  { id: 'pending_president', label: 'Pending President', bg: 'bg-purple-500/10', dot: 'bg-purple-500' },
  { id: 'approved', label: 'Approved & Deducted', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
  { id: 'rejected', label: 'Rejected', bg: 'bg-rose-500/10', dot: 'bg-rose-500' },
];

export const KanbanView: React.FC<KanbanViewProps> = ({ requests, onSelectRequest }) => {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 min-h-[600px] select-none">
      {COLUMNS.map((col) => {
        const colRequests = requests.filter((r) => {
          if (col.id === 'submitted') {
            return r.status === 'submitted' || r.status === 'under_review' || r.status === 'draft';
          }
          return r.status === col.id;
        });

        return (
          <div
            key={col.id}
            className="w-80 shrink-0 flex flex-col rounded-2xl bg-muted/40 border border-border/80 p-3 space-y-3"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-2 pt-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                <h4 className="text-xs font-bold text-foreground tracking-tight">{col.label}</h4>
              </div>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-background border border-border/80 text-muted-foreground">
                {colRequests.length}
              </span>
            </div>

            {/* Cards container */}
            <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[70vh] pr-1">
              {colRequests.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-border/60 rounded-xl text-xs text-muted-foreground/60">
                  No requests in this stage
                </div>
              ) : (
                colRequests.map((req) => (
                  <div
                    key={req.id}
                    onClick={() => onSelectRequest(req)}
                    className="p-3.5 rounded-xl bg-card border border-border/80 shadow-xs hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-primary">
                        {req.trackingNumber}
                      </span>
                      <PriorityBadge priority={req.priority} size="sm" />
                    </div>

                    <div>
                      <h5 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                        {req.customerCompany}
                      </h5>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {req.customerName}
                      </p>
                    </div>

                    <div className="p-2 rounded-lg bg-muted/30 border border-border/40 text-[11px] text-muted-foreground space-y-1">
                      <div className="text-foreground font-medium truncate">{req.requestItem}</div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-foreground">
                          ${(req.budgetAmount || 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {req.customerCompany || req.customerName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {req.teamName}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {req.requestDate}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

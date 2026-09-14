import React, { useState, useMemo } from 'react';
import { History, Search, Download, Filter, ShieldCheck, ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { AuditLog, AuditActionType } from '../../types/audit';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';

export const AuditLogsPage: React.FC = () => {
  const auditLogs = dataService.getAuditLogs();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [inspectLog, setInspectLog] = useState<AuditLog | null>(null);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (selectedAction !== 'ALL' && log.action !== selectedAction) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          (log.userName || '').toLowerCase().includes(q) ||
          (log.userEmail || '').toLowerCase().includes(q) ||
          (log.action || '').toLowerCase().includes(q) ||
          (log.description || '').toLowerCase().includes(q) ||
          (log.ipAddress || '').includes(q) ||
          (log.entityType || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [auditLogs, searchQuery, selectedAction]);

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `enterprise_audit_trail_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const actionTypes = Array.from(new Set(auditLogs.map(l => l.action)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Enterprise Security & Audit Register
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable legal ledger tracking every user action, state change, and digital sign-off
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportJSON}
          leftIcon={<Download className="w-3.5 h-3.5" />}
        >
          Export Immutable Audit Log
        </Button>
      </div>

      {/* Filter Ribbon */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search audit trail by user, IP address, description, or action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="bg-background border border-input text-xs rounded-lg px-3 py-2 text-foreground focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Recorded Actions ({auditLogs.length})</option>
            {actionTypes.map(act => (
              <option key={act} value={act}>{act.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Chronological Activity Register</CardTitle>
            <span className="text-xs font-mono text-muted-foreground">
              {filteredLogs.length} Records Found
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20">
                  <th className="p-3 pl-4">Timestamp</th>
                  <th className="p-3">User & Role</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Entity Type</th>
                  <th className="p-3">Event Summary</th>
                  <th className="p-3">IP Address</th>
                  <th className="p-3 pr-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/40 transition-colors">
                    <td className="p-3 pl-4 font-mono text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-foreground">{log.userName}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{log.userRole}</div>
                    </td>
                    <td className="p-3 font-mono">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground font-medium">
                      {log.entityType}
                    </td>
                    <td className="p-3 text-foreground/90 max-w-sm truncate" title={log.description}>
                      {log.description}
                    </td>
                    <td className="p-3 font-mono text-muted-foreground">
                      {log.ipAddress}
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <button
                        onClick={() => setInspectLog(log)}
                        className="text-primary hover:underline font-medium text-[11px] inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Inspect Log Modal */}
      {inspectLog && (
        <Modal
          isOpen={!!inspectLog}
          onClose={() => setInspectLog(null)}
          title="Audit Log State Diff & Verification"
          description={`Record ID: ${inspectLog.id}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs font-mono">
            <div className="p-3.5 bg-muted/40 rounded-xl border border-border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">User:</span>
                <span className="font-semibold text-foreground">{inspectLog.userName} ({inspectLog.userEmail})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Role:</span>
                <span className="text-primary font-bold">{inspectLog.userRole}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Client IP:</span>
                <span className="text-foreground">{inspectLog.ipAddress}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Browser:</span>
                <span className="text-foreground">{inspectLog.browser}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Timestamp:</span>
                <span className="text-foreground">{inspectLog.timestamp}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-background text-foreground font-sans">
              <span className="font-bold text-xs">Event Summary:</span>
              <p className="mt-1 text-xs text-muted-foreground">{inspectLog.description}</p>
            </div>

            {/* Old vs New State diff if present */}
            {(inspectLog.oldValue || inspectLog.newValue) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1">
                  <span className="text-rose-600 font-bold text-[11px]">Previous State (Old):</span>
                  <pre className="text-[10px] overflow-x-auto text-rose-700 dark:text-rose-400 p-1">
                    {inspectLog.oldValue || 'null'}
                  </pre>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                  <span className="text-emerald-600 font-bold text-[11px]">Updated State (New):</span>
                  <pre className="text-[10px] overflow-x-auto text-emerald-700 dark:text-emerald-400 p-1">
                    {inspectLog.newValue || 'null'}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

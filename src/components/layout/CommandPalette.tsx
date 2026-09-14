import React, { useState, useEffect } from 'react';
import { Search, FileText, Users2, DollarSign, CheckSquare, ArrowRight, Shield } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const { switchUser, users } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          setQuery('');
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const requests = dataService.getRequests();
  const teams = dataService.getTeams();

  const rawQuery = query.trim().toLowerCase();
  // Support the "switch to [role]" phrasing shown in the placeholder — strip the
  // command prefix so the remainder is matched as a plain role/name search.
  const switchToMatch = rawQuery.match(/^switch to\s+(.+)$/);
  const q = switchToMatch ? switchToMatch[1] : rawQuery;

  const filteredRequests = q
    ? requests.filter(r =>
        (r.trackingNumber || '').toLowerCase().includes(q) ||
        (r.customerCompany || '').toLowerCase().includes(q) ||
        (r.customerName || '').toLowerCase().includes(q) ||
        (r.requestItem || '').toLowerCase().includes(q)
      ).slice(0, 4)
    : requests.slice(0, 3);

  const filteredTeams = q
    ? teams.filter(t =>
        (t.name || '').toLowerCase().includes(q) ||
        (t.code || '').toLowerCase().includes(q)
      ).slice(0, 3)
    : teams.slice(0, 3);

  const filteredUsers = q
    ? users.filter(u =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.roleName || '').toLowerCase().includes(q)
      ).slice(0, 3)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-10 animate-fade-in flex flex-col">
        <div className="flex items-center px-4 py-3.5 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground mr-3" />
          <input
            type="text"
            placeholder="Type a request #, company, team, or 'switch to [role]'..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
          <kbd className="px-2 py-0.5 text-[10px] font-mono bg-muted text-muted-foreground rounded border border-border">
            ESC
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto p-2 space-y-4">
          {/* Quick Actions */}
          <div>
            <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Direct Navigation
            </p>
            <div className="space-y-0.5">
              <button
                onClick={() => { onNavigate('/requests'); onClose(); }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-muted text-foreground transition-colors text-left"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  All Requests & Kanban
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button
                onClick={() => { onNavigate('/approvals'); onClose(); }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-muted text-foreground transition-colors text-left"
              >
                <span className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-500" />
                  Multi-Stage Approvals Queue
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button
                onClick={() => { onNavigate('/budgets'); onClose(); }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-muted text-foreground transition-colors text-left"
              >
                <span className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-500" />
                  Team Budgets & Allocations
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Requests results */}
          {filteredRequests.length > 0 && (
            <div>
              <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Matching Requests
              </p>
              <div className="space-y-0.5">
                {filteredRequests.map(r => (
                  <button
                    key={r.id}
                    onClick={() => { onNavigate(`/requests?id=${r.id}`); onClose(); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-muted text-foreground transition-colors text-left"
                  >
                    <div>
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        <span className="text-primary font-mono">{r.trackingNumber}</span>
                        <span>• {r.customerCompany}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-sm">
                        {r.requestItem || '—'} (${(r.budgetAmount || 0).toLocaleString()})
                      </div>
                    </div>
                    <span className="text-[10px] font-mono uppercase bg-muted px-2 py-0.5 rounded text-muted-foreground">
                      {(r.status || '').replace(/_/g, ' ')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Teams results */}
          {filteredTeams.length > 0 && (
            <div>
              <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Teams
              </p>
              <div className="space-y-0.5">
                {filteredTeams.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { onNavigate('/teams'); onClose(); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-muted text-foreground transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Users2 className="w-4 h-4 text-primary" />
                      <div>
                        <div className="font-medium text-foreground">{t.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Budget: ${(t.remainingBudget || 0).toLocaleString()} left
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground">Lead: {t.leadName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Persona Switch quick options */}
          {filteredUsers.length > 0 && (
            <div>
              <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Switch Persona to
              </p>
              <div className="space-y-0.5">
                {filteredUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => { switchUser(u.id); onClose(); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-muted text-foreground transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-indigo-500" />
                      <span>{u.name} ({u.roleName})</span>
                    </div>
                    <span className="text-[10px] text-primary">Switch Persona</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-border bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Navigate with mouse or arrow keys</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
};

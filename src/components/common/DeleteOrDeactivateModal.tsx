import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface DeleteOrDeactivateModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** What is being removed, e.g. "company", "warehouse". */
  entityLabel: string;
  /** Display name of the record. */
  name: string;
  /** Human-readable description of what the record is linked to; empty/undefined = not in use. */
  inUseBy?: string;
  /** Currently active? Only matters for the in-use branch (an already-inactive record has nothing left to do). */
  isActive: boolean;
  error?: string;
  onDelete: () => void;
  onDeactivate: () => void;
}

// One consistent flow for everything that can be removed: unused records are deleted
// outright; records other data points at can only be deactivated (and later reactivated).
export const DeleteOrDeactivateModal: React.FC<DeleteOrDeactivateModalProps> = ({
  isOpen, onClose, entityLabel, name, inUseBy, isActive, error, onDelete, onDeactivate
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={`Delete ${entityLabel}`}
    description={inUseBy ? 'In use — deactivate it to keep history intact' : 'This permanently removes the record'}
    maxWidth="sm"
  >
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          {error}
        </div>
      )}

      {inUseBy ? (
        <>
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
            <div className="text-xs space-y-1.5">
              <p className="font-bold text-foreground">Can't delete — this {entityLabel} is in use</p>
              <p className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">{name}</strong> is used by {inUseBy}. Deleting it would orphan
                that history.
              </p>
              <p className="text-foreground font-semibold pt-1">
                {isActive
                  ? 'Deactivate it instead: it disappears from new-request choices but all past records stay intact, and you can reactivate it any time.'
                  : 'It is already deactivated, so it no longer appears in new-request choices. Use Reactivate on the card to bring it back.'}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Close</Button>
            {isActive && (
              <Button type="button" variant="primary" size="sm" onClick={onDeactivate}>
                Deactivate Instead
              </Button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-foreground">
              Are you sure you want to delete <span className="text-destructive font-mono">{name}</span>? Nothing else is linked to it.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="button" variant="destructive" size="sm" onClick={onDelete} leftIcon={<Trash2 className="w-4 h-4" />}>
              Confirm Delete
            </Button>
          </div>
        </>
      )}
    </div>
  </Modal>
);

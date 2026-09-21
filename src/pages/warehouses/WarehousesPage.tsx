import React, { useState } from 'react';
import { Warehouse as WarehouseIcon, Plus, Edit2, Trash2, AlertTriangle, Phone, MapPin, Truck, CheckCircle2 } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { Warehouse } from '../../types/warehouse';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { useSyncedState } from '../../hooks/useSyncedState';

export const WarehousesPage: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();
  const [warehouses, setWarehouses] = useSyncedState<Warehouse[]>(() => dataService.getWarehouses());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [defaultCarrier, setDefaultCarrier] = useState('');

  const canManage = hasPermission('settings:teams') || currentUser.roleName === 'Super Admin';

  const refresh = () => setWarehouses(dataService.getWarehouses());

  const handleOpenAdd = () => {
    setEditingWarehouse(null);
    setName(''); setCode(''); setAddress('');
    setContactName(''); setContactPhone(''); setDefaultCarrier('');
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (w: Warehouse) => {
    setEditingWarehouse(w);
    setName(w.name); setCode(w.code); setAddress(w.address);
    setContactName(w.contactName); setContactPhone(w.contactPhone); setDefaultCarrier(w.defaultCarrier || '');
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Warehouse name is required');
      return;
    }
    try {
      dataService.saveWarehouse(
        {
          id: editingWarehouse?.id,
          name: name.trim(),
          code: code.trim().toUpperCase(),
          address: address.trim(),
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim(),
          defaultCarrier: defaultCarrier.trim() || undefined
        },
        currentUser
      );
      setIsModalOpen(false);
      refresh();
    } catch (err: any) {
      setError(err.message || 'Error saving warehouse');
    }
  };

  const handleConfirmDelete = () => {
    if (!warehouseToDelete) return;
    try {
      dataService.deleteWarehouse(warehouseToDelete.id, currentUser);
      setWarehouseToDelete(null);
      refresh();
    } catch (err: any) {
      setDeleteError(err.message || 'Error deleting warehouse');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <WarehouseIcon className="w-5 h-5 text-primary" />
            Warehouse Directory
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Independent dispatch and fulfillment facilities used as the shipment origin
          </p>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={handleOpenAdd} leftIcon={<Plus className="w-4 h-4" />}>
            Add Warehouse
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {warehouses.map((w) => (
          <Card key={w.id} hoverEffect className="relative overflow-hidden flex flex-col justify-between">
            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground truncate">{w.name}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Code: {w.code}{w.defaultCarrier ? ` · Carrier: ${w.defaultCarrier}` : ''}
                  </p>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleOpenEdit(w)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors" title="Edit warehouse">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { setDeleteError(''); setWarehouseToDelete(w); }} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors" title="Delete warehouse">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground">
                {w.address && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{w.address}</span>
                  </div>
                )}
                {w.contactPhone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{w.contactName} · {w.contactPhone}</span>
                  </div>
                )}
                {w.defaultCarrier && (
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 shrink-0" />
                    <span>Default carrier: {w.defaultCarrier}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-muted/20 border-t border-border/60 flex items-center text-xs px-5">
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> {w.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}
        description="Warehouses are independent fulfillment centers and shipment origin locations"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input label="Warehouse Name *" placeholder="e.g. East Coast Distribution Center" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Code" placeholder="e.g. WH-EC1" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address</label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, city, state/province, postal code, country"
              className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Contact Name" placeholder="e.g. Sarah Jenkins" value={contactName} onChange={(e) => setContactName(e.target.value)} />
            <Input label="Contact Phone" placeholder="+1 (555) 000-0000" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </div>

          <Input label="Default Carrier (optional)" placeholder="e.g. FedEx, DHL, UPS" value={defaultCarrier} onChange={(e) => setDefaultCarrier(e.target.value)} />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm">{editingWarehouse ? 'Save Changes' : 'Create Warehouse'}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!warehouseToDelete}
        onClose={() => setWarehouseToDelete(null)}
        title="Delete Warehouse Confirmation"
        description="Permanently remove warehouse from organization"
        maxWidth="sm"
      >
        <div className="space-y-4">
          {deleteError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {deleteError}
            </div>
          )}
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-foreground">
                Are you sure you want to delete <span className="text-destructive font-mono">{warehouseToDelete?.name}</span>?
              </p>
              <p className="text-muted-foreground leading-relaxed">
                This is blocked if any requests are still linked to this warehouse.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setWarehouseToDelete(null)}>Cancel</Button>
            <Button type="button" variant="destructive" size="sm" onClick={handleConfirmDelete} leftIcon={<Trash2 className="w-4 h-4" />}>Confirm Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

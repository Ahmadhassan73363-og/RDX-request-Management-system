import React, { useState } from 'react';
import { Users, Plus, Edit2, Trash2, AlertTriangle, Phone, Mail, MapPin, CheckCircle2, Star } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { Customer } from '../../types/customer';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { useSyncedState } from '../../hooks/useSyncedState';

export const CustomersPage: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();
  const [customers, setCustomers] = useSyncedState<Customer[]>(() => dataService.getCustomers());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [error, setError] = useState('');

  const [contactName, setContactName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billingAddress, setBillingAddress] = useState('');
  const [accountCode, setAccountCode] = useState('');
  const [tagsInput, setTagsInput] = useState('Standard');
  const [notes, setNotes] = useState('');

  const canManage = hasPermission('settings:teams') || currentUser.roleName === 'Super Admin';

  const refresh = () => setCustomers(dataService.getCustomers());

  const resetForm = () => {
    setContactName(''); setCompanyName(''); setEmail(''); setPhone('');
    setShippingAddress(''); setBillingSameAsShipping(true); setBillingAddress('');
    setAccountCode(''); setTagsInput('Standard'); setNotes('');
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    resetForm();
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setContactName(c.contactName); setCompanyName(c.companyName); setEmail(c.email); setPhone(c.phone);
    setShippingAddress(c.shippingAddress); setBillingSameAsShipping(c.billingSameAsShipping);
    setBillingAddress(c.billingAddress || ''); setAccountCode(c.accountCode);
    setTagsInput(c.tags.join(', ')); setNotes(c.notes);
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!contactName.trim()) {
      setError('Contact name is required');
      return;
    }
    try {
      dataService.saveCustomer(
        {
          id: editingCustomer?.id,
          contactName: contactName.trim(),
          companyName: companyName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          shippingAddress: shippingAddress.trim(),
          billingSameAsShipping,
          billingAddress: billingSameAsShipping ? undefined : billingAddress.trim(),
          accountCode: accountCode.trim(),
          tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
          notes: notes.trim()
        },
        currentUser
      );
      setIsModalOpen(false);
      refresh();
    } catch (err: any) {
      setError(err.message || 'Error saving customer');
    }
  };

  const handleConfirmDelete = () => {
    if (!customerToDelete) return;
    try {
      dataService.deleteCustomer(customerToDelete.id, currentUser);
      setCustomerToDelete(null);
      refresh();
    } catch (err: any) {
      setDeleteError(err.message || 'Error deleting customer');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Customer Directory
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            The receiving side — reusable across requests instead of retyping every time
          </p>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={handleOpenAdd} leftIcon={<Plus className="w-4 h-4" />}>
            Add Customer
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {customers.map((c) => (
          <Card key={c.id} hoverEffect className="relative overflow-hidden flex flex-col justify-between">
            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground truncate">{c.contactName}</h3>
                  <p className="text-[11px] text-muted-foreground truncate">{c.companyName}</p>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleOpenEdit(c)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors" title="Edit customer">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { setDeleteError(''); setCustomerToDelete(c); }} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors" title="Delete customer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground">
                {c.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{c.phone}</span>
                  </div>
                )}
                {c.shippingAddress && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{c.shippingAddress}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {c.tags.map(tag => (
                  <span
                    key={tag}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      tag.toLowerCase() === 'vip'
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                        : 'bg-muted text-muted-foreground border border-border'
                    }`}
                  >
                    {tag.toLowerCase() === 'vip' && <Star className="w-2.5 h-2.5" />}
                    {tag}
                  </span>
                ))}
                <span className="text-[10px] font-mono text-muted-foreground ml-auto">{c.accountCode}</span>
              </div>
            </div>

            <div className="p-3 bg-muted/20 border-t border-border/60 flex items-center text-xs px-5">
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> {c.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
        description="Customers are the receiving side of a request — reusable across submissions"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input label="Contact Name *" placeholder="e.g. Kenji Takahashi" value={contactName} onChange={(e) => setContactName(e.target.value)} required />
            <Input label="Company Name" placeholder="e.g. Nippon Systems International" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Phone" placeholder="+1 (555) 000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shipping Address</label>
            <textarea
              rows={2}
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder="Street, city, state/province, postal code, country"
              className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={billingSameAsShipping}
              onChange={(e) => setBillingSameAsShipping(e.target.checked)}
              className="rounded text-primary focus:ring-primary w-4 h-4"
            />
            <span>Billing address same as shipping</span>
          </label>

          {!billingSameAsShipping && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Billing Address</label>
              <textarea
                rows={2}
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder="Street, city, state/province, postal code, country"
                className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input label="Account / Customer Code" placeholder="Auto-generated if left blank" value={accountCode} onChange={(e) => setAccountCode(e.target.value)} />
            <Input label="Tags (comma separated)" placeholder="e.g. VIP, Standard" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes about this customer..."
              className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm">{editingCustomer ? 'Save Changes' : 'Create Customer'}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!customerToDelete}
        onClose={() => setCustomerToDelete(null)}
        title="Delete Customer Confirmation"
        description="Permanently remove customer from organization"
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
                Are you sure you want to delete <span className="text-destructive font-mono">{customerToDelete?.contactName}</span>?
              </p>
              <p className="text-muted-foreground leading-relaxed">
                This is blocked if any requests are still linked to this customer.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setCustomerToDelete(null)}>Cancel</Button>
            <Button type="button" variant="destructive" size="sm" onClick={handleConfirmDelete} leftIcon={<Trash2 className="w-4 h-4" />}>Confirm Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

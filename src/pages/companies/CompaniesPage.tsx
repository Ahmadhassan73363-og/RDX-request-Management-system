import React, { useState } from 'react';
import { Building2, Plus, Edit2, Trash2, AlertTriangle, Mail, Phone, MapPin, CheckCircle2, Globe, FileBadge } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { Company, COMPANY_CURRENCIES } from '../../types/company';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { DeleteOrDeactivateModal } from '../../components/common/DeleteOrDeactivateModal';
import { useSyncedState } from '../../hooks/useSyncedState';

export const CompaniesPage: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();
  const [companies, setCompanies] = useSyncedState<Company[]>(() => dataService.getCompanies());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [error, setError] = useState('');

  // Form inputs
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [companyIdNumber, setCompanyIdNumber] = useState('');
  const [legalName, setLegalName] = useState('');
  const [legalId, setLegalId] = useState('');
  const [taxId, setTaxId] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [color, setColor] = useState('#3b82f6');

  const canManage = hasPermission('settings:teams') || currentUser.roleName === 'Super Admin';

  const refresh = () => setCompanies(dataService.getCompanies());

  const handleOpenAdd = () => {
    setEditingCompany(null);
    setName('');
    setShortCode('');
    setCompanyIdNumber('');
    setLegalName('');
    setLegalId('');
    setTaxId('');
    setLocation('');
    setAddress('');
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setDefaultCurrency('USD');
    setColor('#3b82f6');
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Company) => {
    setEditingCompany(c);
    setName(c.name);
    setShortCode(c.shortCode || '');
    setCompanyIdNumber(c.companyIdNumber || c.shortCode || '');
    setLegalName(c.legalName || '');
    setLegalId(c.legalId || '');
    setTaxId(c.taxId || '');
    setLocation(c.location || '');
    setAddress(c.address || '');
    setContactName(c.contactName || '');
    setContactEmail(c.contactEmail || '');
    setContactPhone(c.contactPhone || '');
    setDefaultCurrency(c.defaultCurrency || 'USD');
    setColor(c.color || '#3b82f6');
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Company name is required');
      return;
    }
    try {
      dataService.saveCompany(
        {
          id: editingCompany?.id,
          name: name.trim(),
          shortCode: (shortCode.trim() || name.substring(0, 4)).toUpperCase(),
          companyIdNumber: companyIdNumber.trim() || undefined,
          legalName: legalName.trim() || name.trim(),
          legalId: legalId.trim() || undefined,
          location: location.trim() || undefined,
          address: address.trim(),
          taxId: taxId.trim(),
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim(),
          defaultCurrency,
          color
        },
        currentUser
      );
      setIsModalOpen(false);
      refresh();
    } catch (err: any) {
      setError(err.message || 'Error saving company');
    }
  };

  const handleConfirmDelete = () => {
    if (!companyToDelete) return;
    try {
      dataService.deleteCompany(companyToDelete.id, currentUser);
      setCompanyToDelete(null);
      refresh();
    } catch (err: any) {
      setDeleteError(err.message || 'Error deleting company');
    }
  };

  const handleDeactivateFromModal = () => {
    if (!companyToDelete) return;
    try {
      dataService.setCompanyActive(companyToDelete.id, false, currentUser);
      setCompanyToDelete(null);
      refresh();
    } catch (err: any) {
      setDeleteError(err.message || 'Error deactivating company');
    }
  };

  const handleToggleActive = (c: Company) => {
    try {
      dataService.setCompanyActive(c.id, c.active === false, currentUser);
      refresh();
    } catch (err: any) {
      alert(err.message || 'Error changing company status');
    }
  };

  const getCurrencyDisplay = (code: string) => {
    const match = COMPANY_CURRENCIES.find(c => c.value === code);
    return match ? `${match.label}` : code;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Company Directory
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage the issuing corporate entities, currencies, legal registrations, and operating locations
          </p>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={handleOpenAdd} leftIcon={<Plus className="w-4 h-4" />}>
            Add Company
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {companies.map((c) => (
          <Card key={c.id} hoverEffect className="relative overflow-hidden flex flex-col justify-between">
            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0"
                    style={{ backgroundColor: c.color || '#3b82f6' }}
                  >
                    {c.shortCode ? c.shortCode.substring(0, 4) : c.name.substring(0, 3).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-foreground truncate">{c.name}</h3>
                    <p className="text-[11px] text-muted-foreground truncate">{c.legalName || c.name}</p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleOpenEdit(c)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors" title="Edit company">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { setDeleteError(''); setCompanyToDelete(c); }} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors" title="Delete company">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Identity & Registry Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {(c.companyIdNumber || c.shortCode) && (
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-muted/80 border border-border text-foreground font-semibold flex items-center gap-1" title="Company ID">
                    <FileBadge className="w-3 h-3 text-primary" />
                    ID: {c.companyIdNumber || c.shortCode}
                  </span>
                )}
                {c.legalId && (
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-muted/80 border border-border text-muted-foreground" title="Legal ID">
                    Legal: {c.legalId}
                  </span>
                )}
                {c.taxId && (
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-muted/80 border border-border text-muted-foreground" title="Tax ID">
                    Tax: {c.taxId}
                  </span>
                )}
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary font-bold">
                  {c.defaultCurrency}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground pt-1">
                {c.location && (
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <Globe className="w-3.5 h-3.5 shrink-0 text-primary" />
                    <span className="truncate">{c.location}</span>
                  </div>
                )}
                {c.address && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                    <span className="line-clamp-2">{c.address}</span>
                  </div>
                )}
                {c.contactEmail && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{c.contactEmail}</span>
                  </div>
                )}
                {c.contactPhone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{c.contactName ? `${c.contactName} · ` : ''}{c.contactPhone}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-muted/20 border-t border-border/60 flex items-center justify-between text-xs px-5">
              {c.active !== false ? (
                <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" /> Deactivated
                </span>
              )}
              <div className="flex items-center gap-3">
                {canManage && (
                  <button
                    onClick={() => handleToggleActive(c)}
                    className="text-xs text-muted-foreground hover:text-foreground underline decoration-dotted transition-colors"
                    title={c.active !== false ? 'Hide from new requests' : 'Make available for new requests again'}
                  >
                    {c.active !== false ? 'Deactivate' : 'Reactivate'}
                  </button>
                )}
                <span className="text-[11px] text-muted-foreground font-mono">
                  {getCurrencyDisplay(c.defaultCurrency)}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCompany ? 'Edit Company' : 'Add Company'}
        description="Companies represent issuing entities with currency, tax ID, registration identifiers, and physical location"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {error}
            </div>
          )}

          {/* Core Name & Identifiers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input label="Company Name *" placeholder="e.g. RDX Global" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <Input label="Company ID" placeholder="e.g. CMP-10293" value={companyIdNumber} onChange={(e) => setCompanyIdNumber(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label="Short Code" placeholder="e.g. RDXG" value={shortCode} onChange={(e) => setShortCode(e.target.value.toUpperCase())} />
            <div className="sm:col-span-2">
              <Input label="Legal Name" placeholder="e.g. RDX Global Holdings Inc." value={legalName} onChange={(e) => setLegalName(e.target.value)} />
            </div>
          </div>

          {/* Legal ID, Tax ID & Currency Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label="Legal ID" placeholder="e.g. LEI-9948201 / CR-84210" value={legalId} onChange={(e) => setLegalId(e.target.value)} />
            <Input label="Tax ID" placeholder="e.g. US-EIN-84-1029384 / GB-VAT-123" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
            <Select
              label="Currency *"
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
              options={COMPANY_CURRENCIES.map(curr => ({
                label: curr.label,
                value: curr.value
              }))}
            />
          </div>

          {/* Location & Address */}
          <div className="space-y-3">
            <Input
              label="Location"
              placeholder="e.g. London, United Kingdom or Dubai, UAE"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Registered Address</label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, city, state/province, postal code, country"
                className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label="Contact Name" placeholder="e.g. Alexander Vance" value={contactName} onChange={(e) => setContactName(e.target.value)} />
            <Input label="Contact Email" type="email" placeholder="name@company.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            <Input label="Contact Phone" placeholder="+1 (555) 000-0000" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Color Accent</label>
            <div className="flex items-center gap-2">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-input p-0.5" />
              <span className="text-xs font-mono text-muted-foreground">{color}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm">{editingCompany ? 'Save Changes' : 'Create Company'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete / Deactivate */}
      {(() => {
        const usage = companyToDelete ? dataService.getCompanyUsage(companyToDelete.id) : { requests: 0, warehouses: 0 };
        const inUseBy = usage.requests + usage.warehouses > 0
          ? `${usage.requests} request(s) and ${usage.warehouses} warehouse(s)`
          : undefined;
        return (
          <DeleteOrDeactivateModal
            isOpen={!!companyToDelete}
            onClose={() => setCompanyToDelete(null)}
            entityLabel="company"
            name={companyToDelete?.name || ''}
            inUseBy={inUseBy}
            isActive={companyToDelete?.active !== false}
            error={deleteError}
            onDelete={handleConfirmDelete}
            onDeactivate={handleDeactivateFromModal}
          />
        );
      })()}
    </div>
  );
};

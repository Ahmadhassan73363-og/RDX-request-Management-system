import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  Calculator,
  FormInput,
  Layers,
  Info,
  Users,
  Building2,
  TrendingUp,
  Tag,
  UserCheck
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import { SignaturePad } from '../../components/common/SignaturePad';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { RequestPriority, SkuItem } from '../../types/request';
import { FormSchema, FormField } from '../../types/form';

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (requestId: string) => void;
}

interface SkuRow {
  id: string;
  sampleSku: string;
  sampleSkuQty: number | '';
  sampleSkuCostPerUnit: number | '';
  sampleSkuCostPerUnitGbp: number | '';
}

export const NewRequestModal: React.FC<NewRequestModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const [teams, setTeams] = useState(() => dataService.getTeams().filter(t => t.active));
  const [companies, setCompanies] = useState(() => dataService.getCompanies().filter(c => c.active));
  const [allWarehouses, setAllWarehouses] = useState(() => dataService.getWarehouses().filter(w => w.active));
  const [customers, setCustomers] = useState(() => dataService.getCustomers().filter(c => c.active));
  const [allUsers, setAllUsers] = useState(() => dataService.getUsers().filter(u => u.status === 'active'));

  // Company / Warehouse / Customer
  const [companyId, setCompanyId] = useState(() => dataService.getCompanies().filter(c => c.active)[0]?.id || '');
  const [warehouseId, setWarehouseId] = useState(() => dataService.getWarehouses().filter(w => w.active)[0]?.id || '');
  const [customerId, setCustomerId] = useState('');

  const handleCompanyChange = (newCompanyId: string) => {
    setCompanyId(newCompanyId);
  };

  // Forms available from Form Builder
  const [availableForms, setAvailableForms] = useState<FormSchema[]>(() =>
    dataService.getForms().filter(f => f.isActive)
  );
  const [selectedFormId, setSelectedFormId] = useState<string>('form-std-sample-foc');

  // Refresh active entities and forms when modal opens
  useEffect(() => {
    if (isOpen) {
      const activeTeams = dataService.getTeams().filter(t => t.active);
      const activeCompanies = dataService.getCompanies().filter(c => c.active);
      const activeWarehouses = dataService.getWarehouses().filter(w => w.active);
      const activeCustomers = dataService.getCustomers().filter(c => c.active);
      const activeUsers = dataService.getUsers().filter(u => u.status === 'active');

      setTeams(activeTeams);
      setCompanies(activeCompanies);
      setAllWarehouses(activeWarehouses);
      setCustomers(activeCustomers);
      setAllUsers(activeUsers);

      setCompanyId(prev => (prev && activeCompanies.some(c => c.id === prev)) ? prev : (activeCompanies[0]?.id || ''));
      setWarehouseId(prev => (prev && activeWarehouses.some(w => w.id === prev)) ? prev : (activeWarehouses[0]?.id || ''));

      const forms = dataService.getForms().filter(f => f.isActive);
      setAvailableForms(forms);
      if (!forms.some(f => f.id === selectedFormId)) {
        if (forms.some(f => f.id === 'form-std-sample-foc')) {
          setSelectedFormId('form-std-sample-foc');
        } else if (forms.length > 0) {
          setSelectedFormId(forms[0].id);
        }
      }
    }
  }, [isOpen]);

  const selectedForm = availableForms.find(f => f.id === selectedFormId) || availableForms[0];
  const isDefaultSampleForm = selectedForm?.id === 'form-std-sample-foc';

  // --- Standard Form State ---
  // 1. Date: Auto-fetch current date (YYYY-MM-DD)
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  // 2. Team
  const [teamId, setTeamId] = useState(currentUser.teamId || teams[0]?.id || '');
  // 3. Agent Name (staff member, searchable per team)
  const [agentUserId, setAgentUserId] = useState(currentUser.id || '');
  const [agentName, setAgentName] = useState(currentUser.name || '');
  // 4. Our Company Name (auto-filled from issuing company)
  const [ourCompanyName, setOurCompanyName] = useState(() => {
    const firstCo = dataService.getCompanies().filter(c => c.active)[0];
    return firstCo?.name || '';
  });
  // 5. Business Name (customer side)
  const [businessName, setBusinessName] = useState('');
  // 6. Category: Sample or Gift
  const [category, setCategory] = useState<'Sample' | 'Gift'>('Sample');
  // 7. System Invoice no.
  const [systemInvoiceNo, setSystemInvoiceNo] = useState('');
  // 8. GBP Exchange Rate
  const [gbpExchangeRate, setGbpExchangeRate] = useState<number | ''>(1.27);

  // Department (kept for compatibility)
  const [department, setDepartment] = useState(currentUser.department || 'Commercial Sales');
  // Priority
  const [priority, setPriority] = useState<RequestPriority>('normal');

  // Derived: selected team object
  const selectedTeam = useMemo(() => teams.find(t => t.id === teamId), [teams, teamId]);

  // Derived: staff members belonging to selected team (users with matching teamId)
  const teamStaffMembers = useMemo(() => {
    if (!teamId) return allUsers;
    return allUsers.filter(u => u.teamId === teamId || u.id === currentUser.id);
  }, [teamId, allUsers, currentUser.id]);

  // When team changes, reset agent if current agent not in new team
  useEffect(() => {
    if (teamId && agentUserId) {
      const inTeam = teamStaffMembers.some(u => u.id === agentUserId);
      if (!inTeam) {
        // Try to keep current user if they're in the list
        const currentInTeam = teamStaffMembers.find(u => u.id === currentUser.id);
        if (currentInTeam) {
          setAgentUserId(currentUser.id);
          setAgentName(currentUser.name);
        } else if (teamStaffMembers.length > 0) {
          setAgentUserId(teamStaffMembers[0].id);
          setAgentName(teamStaffMembers[0].name);
        }
      }
    }
  }, [teamId]);

  // When companyId changes, update ourCompanyName
  useEffect(() => {
    const co = companies.find(c => c.id === companyId);
    if (co) setOurCompanyName(co.name);
  }, [companyId, companies]);

  const handleAgentChange = (userId: string) => {
    setAgentUserId(userId);
    const user = allUsers.find(u => u.id === userId);
    setAgentName(user?.name || '');
  };

  const handleCustomerChange = (newCustomerId: string) => {
    setCustomerId(newCustomerId);
    const customer = customers.find(c => c.id === newCustomerId);
    if (customer) {
      setBusinessName(customer.companyName);
    }
  };

  // Multiple SKU Rows (now with GBP per unit)
  const [skuRows, setSkuRows] = useState<SkuRow[]>([
    { id: 'sku-1', sampleSku: '', sampleSkuQty: 1, sampleSkuCostPerUnit: 50, sampleSkuCostPerUnitGbp: 40 }
  ]);

  // General request metadata & comments
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Dynamic Custom Form State (for any form created via Form Builder) ---
  const [customValues, setCustomValues] = useState<Record<string, any>>({});

  // Reset or initialize custom fields when form changes
  const handleFormChange = (newFormId: string) => {
    setSelectedFormId(newFormId);
    setError('');
    const nextForm = availableForms.find(f => f.id === newFormId);
    if (nextForm) {
      const initialVals: Record<string, any> = {};
      nextForm.fields.forEach(field => {
        if (field.defaultValue !== undefined) {
          initialVals[field.id] = field.defaultValue;
        } else if (field.type === 'checkbox') {
          initialVals[field.id] = false;
        } else if (field.type === 'multi_select') {
          initialVals[field.id] = [];
        } else if (field.type === 'date' && field.name === 'date') {
          initialVals[field.id] = new Date().toISOString().split('T')[0];
        } else {
          initialVals[field.id] = '';
        }
      });
      setCustomValues(initialVals);
    }
  };

  const handleCustomFieldChange = (fieldId: string, val: any) => {
    setCustomValues(prev => ({ ...prev, [fieldId]: val }));
  };

  // Evaluate conditional visibility for dynamic fields
  const isFieldVisible = (field: FormField) => {
    if (!field.condition) return true;
    const triggerVal = customValues[field.condition.fieldId];
    const targetVal = field.condition.value;

    switch (field.condition.operator) {
      case 'equals':
        return String(triggerVal) === String(targetVal);
      case 'not_equals':
        return String(triggerVal) !== String(targetVal);
      case 'greater_than':
        return Number(triggerVal) > Number(targetVal);
      case 'less_than':
        return Number(triggerVal) < Number(targetVal);
      case 'contains':
        return String(triggerVal || '').toLowerCase().includes(String(targetVal || '').toLowerCase());
      case 'is_empty':
        return !triggerVal || triggerVal === '';
      case 'is_not_empty':
        return Boolean(triggerVal && triggerVal !== '');
      default:
        return true;
    }
  };

  // SKU Handlers
  const handleAddSkuRow = () => {
    setSkuRows(prev => [
      ...prev,
      {
        id: 'sku-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        sampleSku: '',
        sampleSkuQty: 1,
        sampleSkuCostPerUnit: 0,
        sampleSkuCostPerUnitGbp: 0
      }
    ]);
  };

  const handleRemoveSkuRow = (id: string) => {
    if (skuRows.length <= 1) return;
    setSkuRows(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateSkuRow = (id: string, field: keyof SkuRow, value: any) => {
    setSkuRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      // Auto-calculate GBP from local cost when local cost changes
      if (field === 'sampleSkuCostPerUnit' && gbpExchangeRate !== '') {
        const localCost = Number(value) || 0;
        updated.sampleSkuCostPerUnitGbp = Math.round(localCost / Number(gbpExchangeRate) * 100) / 100;
      }
      return updated;
    }));
  };

  // When GBP rate changes, recalculate all GBP per-unit costs
  const handleGbpRateChange = (newRate: number | '') => {
    setGbpExchangeRate(newRate);
    if (newRate !== '' && Number(newRate) > 0) {
      setSkuRows(prev => prev.map(r => ({
        ...r,
        sampleSkuCostPerUnitGbp: r.sampleSkuCostPerUnit !== ''
          ? Math.round(Number(r.sampleSkuCostPerUnit) / Number(newRate) * 100) / 100
          : ''
      })));
    }
  };

  // Calculated items and totals
  const calculatedSkuItems: SkuItem[] = skuRows.map(r => {
    const qty = Number(r.sampleSkuQty) || 0;
    const unitCost = Number(r.sampleSkuCostPerUnit) || 0;
    const unitCostGbp = Number(r.sampleSkuCostPerUnitGbp) || 0;
    const lineTotal = Math.round(qty * unitCost * 100) / 100;
    const lineTotalGbp = Math.round(qty * unitCostGbp * 100) / 100;
    return {
      id: r.id,
      sampleSku: r.sampleSku,
      sampleSkuQty: r.sampleSkuQty,
      sampleSkuCostPerUnit: r.sampleSkuCostPerUnit,
      sampleSkuTotal: lineTotal,
      sampleSkuCostPerUnitGbp: r.sampleSkuCostPerUnitGbp,
      sampleSkuTotalGbp: lineTotalGbp
    };
  });

  const totalSkuQty = calculatedSkuItems.reduce((acc, item) => acc + (Number(item.sampleSkuQty) || 0), 0);
  const grandSkuTotal = Math.round(calculatedSkuItems.reduce((acc, item) => acc + (item.sampleSkuTotal || 0), 0) * 100) / 100;
  const grandSkuTotalGbp = Math.round(calculatedSkuItems.reduce((acc, item) => acc + (item.sampleSkuTotalGbp || 0), 0) * 100) / 100;

  // Selected team balance check
  const currentRemaining = selectedTeam ? selectedTeam.remainingBudget : 0;
  const projectedBalance = currentRemaining - grandSkuTotal;
  const isOverBudget = projectedBalance < 0;

  // Currency label from selected company
  const selectedCompanyObj = companies.find(c => c.id === companyId);
  const currencyLabel = selectedCompanyObj?.defaultCurrency || 'USD';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const selectedCompany = companies.find(c => c.id === companyId);
    const selectedWarehouse = allWarehouses.find(w => w.id === warehouseId);
    const selectedCustomer = customers.find(c => c.id === customerId);
    const linkageFields = {
      companyId: companyId || undefined,
      companyName: selectedCompany?.name,
      warehouseId: warehouseId || undefined,
      warehouseName: selectedWarehouse?.name,
      customerId: customerId || undefined,
      ...(selectedCustomer ? { customerName: selectedCustomer.contactName, customerCompany: selectedCustomer.companyName } : {})
    };

    // If using the default standard form:
    if (isDefaultSampleForm) {
      if (!agentName.trim()) {
        setError('Please select an Agent / Staff Member');
        return;
      }
      if (!businessName.trim()) {
        setError('Please fill in the Business Name (customer/recipient)');
        return;
      }
      if (!ourCompanyName.trim()) {
        setError('Please specify Our Company Name');
        return;
      }

      if (skuRows.some(r => !r.sampleSku.trim())) {
        setError('Please provide a SKU name/code for all SKU items');
        return;
      }

      if (skuRows.some(r => (Number(r.sampleSkuQty) || 0) <= 0)) {
        setError('All SKU items must have a quantity greater than 0');
        return;
      }

      if (skuRows.some(r => (Number(r.sampleSkuCostPerUnit) || 0) < 0)) {
        setError('Cost per unit cannot be negative');
        return;
      }

      if (!gbpExchangeRate || Number(gbpExchangeRate) <= 0) {
        setError('Please enter a valid GBP exchange rate (must be > 0)');
        return;
      }

      setIsSubmitting(true);
      try {
        const primarySku = calculatedSkuItems.map(s => s.sampleSku).filter(Boolean).join(', ');
        const created = dataService.createRequest(
          {
            formId: selectedForm?.id || 'form-std-sample-foc',
            formTitle: selectedForm?.title || 'Standard Sample & FOC Request Form',
            customFields: {
              date,
              department,
              teamId,
              teamName: selectedTeam?.name,
              teamType: selectedTeam?.type,
              agentUserId,
              agentName,
              ourCompanyName,
              businessName,
              category,
              systemInvoiceNo,
              skuSummary: primarySku,
              totalSkuQty,
              grandSkuTotal,
              grandSkuTotalGbp,
              gbpExchangeRate
            },
            date,
            department,
            agentOrTeamName: agentName,
            agentName,
            agentUserId,
            ourCompanyName,
            businessName,
            category,
            typeOfFoc: category, // backward compat
            systemInvoiceNo: systemInvoiceNo || undefined,
            sampleSku: primarySku,
            sampleSkuQty: totalSkuQty,
            sampleSkuCostPerUnit: calculatedSkuItems[0]?.sampleSkuCostPerUnit !== '' ? Number(calculatedSkuItems[0]?.sampleSkuCostPerUnit) : 0,
            sampleSkuTotal: grandSkuTotal,
            sampleSkuCostPerUnitGbp: calculatedSkuItems[0]?.sampleSkuCostPerUnitGbp !== '' ? Number(calculatedSkuItems[0]?.sampleSkuCostPerUnitGbp) : 0,
            sampleSkuTotalGbp: grandSkuTotalGbp,
            gbpExchangeRate: Number(gbpExchangeRate),
            skuItems: calculatedSkuItems,

            // Mapped fields for backwards compatibility
            customerName: agentName,
            customerCompany: businessName,
            requestCategory: category,
            requestItem: `${primarySku} (Total Qty: ${totalSkuQty})`,
            requestValue: grandSkuTotal,
            discountPercentage: 0,
            teamId,
            reason: reason.trim() || `FOC ${category} request for ${businessName} - SKUs: ${primarySku} (Total Qty: ${totalSkuQty})`,
            priority,
            attachments: [],
            ...linkageFields
          },
          currentUser
        );

        setIsSubmitting(false);
        onClose();
        onSuccess(created.id);
      } catch (err: any) {
        setError(err.message || 'Error creating request');
        setIsSubmitting(false);
      }
      return;
    }

    // If using a custom dynamic form created via Form Builder:
    if (selectedForm) {
      // Validate required dynamic fields
      for (const f of selectedForm.fields) {
        if (f.required && isFieldVisible(f)) {
          const val = customValues[f.id];
          if (val === undefined || val === null || val === '') {
            setError(`Please fill in required field: "${f.label}"`);
            return;
          }
        }
      }

      setIsSubmitting(true);
      try {
        let mappedCustomerName = currentUser.name;
        let mappedCompany = 'Enterprise Client';
        let mappedItem = selectedForm.title;
        let mappedCategory = selectedForm.category || 'General';
        let mappedValue = 0;
        let mappedReason = '';
        let mappedDate = new Date().toISOString().split('T')[0];

        selectedForm.fields.forEach(f => {
          const val = customValues[f.id];
          if (!val) return;
          const name = f.name.toLowerCase();
          const label = f.label.toLowerCase();

          if (name.includes('customer') || name.includes('recipient') || name.includes('speaker') || label.includes('recipient') || label.includes('name')) {
            if (typeof val === 'string' && val.trim()) mappedCustomerName = val.trim();
          } else if (name.includes('company') || name.includes('organization') || label.includes('company')) {
            if (typeof val === 'string' && val.trim()) mappedCompany = val.trim();
          } else if (name.includes('item') || label.includes('item') || label.includes('product') || label.includes('sku')) {
            if (typeof val === 'string' && val.trim()) mappedItem = val.trim();
          } else if (name.includes('category') || label.includes('category')) {
            if (typeof val === 'string' && val.trim()) mappedCategory = val.trim();
          } else if (f.type === 'currency' || name.includes('value') || name.includes('amount') || name.includes('cost') || label.includes('value') || label.includes('budget')) {
            const num = Number(val);
            if (!isNaN(num) && num > 0) mappedValue = num;
          } else if (name.includes('reason') || name.includes('rationale') || label.includes('reason') || label.includes('justification')) {
            if (typeof val === 'string' && val.trim()) mappedReason = val.trim();
          } else if (f.type === 'date' || name.includes('date') || label.includes('date')) {
            if (typeof val === 'string' && val.trim()) mappedDate = val.trim();
          }
        });

        const finalValue = grandSkuTotal > 0 ? grandSkuTotal : (mappedValue > 0 ? mappedValue : 150);

        const readableCustomFields: Record<string, any> = {};
        selectedForm.fields.forEach(f => {
          if (customValues[f.id] !== undefined) {
            readableCustomFields[f.label] = customValues[f.id];
          }
        });

        const created = dataService.createRequest(
          {
            formId: selectedForm.id,
            formTitle: selectedForm.title,
            customFields: readableCustomFields,
            date: mappedDate,
            department: currentUser.department || 'Operations',
            agentOrTeamName: currentUser.name,
            businessName: mappedCompany,
            typeOfFoc: mappedCategory,
            sampleSku: mappedItem,
            sampleSkuQty: totalSkuQty > 0 ? totalSkuQty : 1,
            sampleSkuCostPerUnit: finalValue,
            sampleSkuTotal: finalValue,
            skuItems: calculatedSkuItems.filter(s => s.sampleSku),

            customerName: mappedCustomerName,
            customerCompany: mappedCompany,
            requestCategory: mappedCategory,
            requestItem: mappedItem,
            requestValue: finalValue,
            discountPercentage: 0,
            teamId,
            reason: mappedReason || reason.trim() || `Submitted via custom form "${selectedForm.title}"`,
            priority,
            attachments: [],
            ...linkageFields
          },
          currentUser
        );

        setIsSubmitting(false);
        onClose();
        onSuccess(created.id);
      } catch (err: any) {
        setError(err.message || 'Error creating request from custom form');
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <span>New Free / Sample Item Request</span>
        </div>
      }
      description="Submit a Free of Cost (FOC) product, promotional sample or gift request for multi-level review and budget tracking"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. TOP SELECT FIELD: Form Selector */}
        <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <FormInput className="w-4 h-4" />
              Select Request Form / Template *
            </label>
            {selectedForm && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">
                {selectedForm.category || 'General'}
              </span>
            )}
          </div>

          <select
            value={selectedFormId}
            onChange={(e) => handleFormChange(e.target.value)}
            className="w-full h-10 px-3.5 bg-background border border-input rounded-lg text-xs sm:text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {availableForms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.title} ({f.fields.length} fields)
              </option>
            ))}
          </select>

          {selectedForm?.description && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{selectedForm.description}</span>
            </p>
          )}
        </div>

        {/* Logistics & Dispatch Origin */}
        <div className="p-3.5 rounded-xl bg-card border border-border space-y-3">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5 block">
            <Building2 className="w-4 h-4 text-primary" />
            Issuing Entity & Dispatch Warehouse
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Issuing Company (Our Company)"
              value={companyId}
              onChange={(e) => handleCompanyChange(e.target.value)}
              options={companies.map(c => ({ label: `${c.name} (${c.defaultCurrency})`, value: c.id }))}
            />
            <Select
              label="Dispatch Warehouse"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              options={allWarehouses.map(w => ({ label: `${w.name} (${w.code})`, value: w.id }))}
              helperText={allWarehouses.length === 0 ? 'No warehouses available' : undefined}
            />
          </div>
          {/* Our Company Name (editable override) */}
          <Input
            label="Our Company Name (on document) *"
            placeholder="e.g. RDX Global Holdings"
            value={ourCompanyName}
            onChange={(e) => setOurCompanyName(e.target.value)}
            required
          />
        </div>

        {/* 2. DYNAMIC FIELDS OR DEFAULT STANDARD FORM */}
        {isDefaultSampleForm ? (
          /* STANDARD FORM LAYOUT */
          <>
            {/* ── SECTION: TEAM & AGENT ── */}
            <div className="p-3.5 rounded-xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-primary" />
                  Team & Agent Details *
                </span>
                {selectedTeam && (
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    selectedTeam.type === 'B2B'
                      ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25'
                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                  }`}>
                    {selectedTeam.type}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Team Selection */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Team *
                  </label>
                  <select
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    className="w-full h-10 px-3.5 bg-background border border-input rounded-lg text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    required
                  >
                    <option value="">Select a team...</option>
                    {/* Group by B2B / B2C */}
                    <optgroup label="── B2B Teams ──">
                      {teams.filter(t => t.type === 'B2B').map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} · B2B (${(t.remainingBudget || 0).toLocaleString()} left)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="── B2C Teams ──">
                      {teams.filter(t => t.type === 'B2C').map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} · B2C (${(t.remainingBudget || 0).toLocaleString()} left)
                        </option>
                      ))}
                    </optgroup>
                    {teams.filter(t => !t.type).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Agent / Staff Member - searchable, filtered by team */}
                <SearchableSelect
                  label="Agent Name (Staff Member) *"
                  value={agentUserId}
                  onChange={handleAgentChange}
                  options={teamStaffMembers.map(u => ({
                    label: `${u.name}${u.title ? ` — ${u.title}` : ''}`,
                    value: u.id
                  }))}
                  emptyLabel="Type to search staff..."
                  helperText={selectedTeam ? `Showing ${teamStaffMembers.length} member(s) from ${selectedTeam.name}` : 'Select a team first to filter members'}
                />
              </div>

              {/* Priority */}
              <Select
                label="Priority *"
                value={priority}
                onChange={(e) => setPriority(e.target.value as RequestPriority)}
                options={[
                  { label: 'Low', value: 'low' },
                  { label: 'Normal', value: 'normal' },
                  { label: 'High', value: 'high' },
                  { label: 'Urgent', value: 'urgent' },
                ]}
              />
            </div>

            {/* ── SECTION: REQUEST DETAILS ── */}
            <div className="p-3.5 rounded-xl bg-card border border-border space-y-3">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5 block">
                <Tag className="w-4 h-4 text-primary" />
                Request Details
              </span>

              {/* Row 1: Date & Customer Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Date *
                    </label>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Auto-fetched
                    </span>
                  </div>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full h-10 px-3.5 bg-background border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Category: Sample or Gift */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Category (Sample / Gift) *
                  </label>
                  <div className="flex gap-2">
                    {(['Sample', 'Gift'] as const).map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`flex-1 h-10 rounded-lg text-xs font-bold border-2 transition-all ${
                          category === cat
                            ? cat === 'Sample'
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                              : 'bg-amber-500 text-white border-amber-500 shadow-sm'
                            : 'bg-background text-muted-foreground border-input hover:border-primary/50'
                        }`}
                      >
                        {cat === 'Sample' ? '🧪 Sample' : '🎁 Gift'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 2: Business Name & System Invoice */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SearchableSelect
                  label="Business Name (Customer) *"
                  value={customerId}
                  onChange={(val) => handleCustomerChange(val)}
                  options={customers.map(c => ({ label: `${c.contactName} (${c.companyName})`, value: c.id }))}
                  emptyLabel="None — enter manually"
                  helperText={customerId ? 'Auto-filled from customer directory' : undefined}
                />
                {/* If no customer selected, allow manual entry */}
                {!customerId && (
                  <Input
                    label="Business Name (manual) *"
                    placeholder="e.g. Acme Corporation"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                  />
                )}
                {customerId && (
                  <Input
                    label="Confirmed Business Name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    helperText="Auto-filled · editable"
                  />
                )}
              </div>

              {/* System Invoice Number */}
              <Input
                label="System Invoice Number (related to current order)"
                type="number"
                placeholder="e.g. 109482"
                value={systemInvoiceNo}
                onChange={(e) => setSystemInvoiceNo(e.target.value)}
              />
            </div>

            {/* ── SECTION: GBP EXCHANGE RATE ── */}
            <div className="p-3.5 rounded-xl bg-card border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  GBP Exchange Rate
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Used to auto-calculate GBP equivalents for each SKU line
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    1 GBP = ? {currencyLabel} *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">£→</span>
                    <input
                      type="number"
                      min="0.001"
                      step="0.0001"
                      placeholder="e.g. 1.2700"
                      value={gbpExchangeRate}
                      onChange={(e) => handleGbpRateChange(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full h-10 pl-10 pr-3.5 bg-background border border-input rounded-lg text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      required
                    />
                  </div>
                </div>
                <div className="sm:col-span-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400">
                  <p className="font-semibold">How GBP conversion works:</p>
                  <p>Per Unit GBP = Local Cost ÷ Exchange Rate. E.g. $50 ÷ 1.27 = £39.37</p>
                </div>
              </div>
            </div>

            {/* ── SECTION: SKU CALCULATORS ── */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    Sample SKU Calculator ({skuRows.length} SKU{skuRows.length !== 1 ? 's' : ''})
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddSkuRow}
                  leftIcon={<Plus className="w-3.5 h-3.5 text-primary" />}
                  className="text-xs font-semibold"
                >
                  Add SKU Item
                </Button>
              </div>

              {/* Column headers */}
              <div className="hidden sm:grid sm:grid-cols-6 gap-2 px-1">
                <div className="sm:col-span-2 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Sample SKU</div>
                <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">QTY</div>
                <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Cost/{currencyLabel}</div>
                <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Cost/GBP</div>
                <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Total {currencyLabel}</div>
              </div>

              <div className="space-y-3">
                {skuRows.map((row, index) => {
                  const qty = Number(row.sampleSkuQty) || 0;
                  const unitCost = Number(row.sampleSkuCostPerUnit) || 0;
                  const unitCostGbp = Number(row.sampleSkuCostPerUnitGbp) || 0;
                  const lineTotal = Math.round(qty * unitCost * 100) / 100;
                  const lineTotalGbp = Math.round(qty * unitCostGbp * 100) / 100;

                  return (
                    <div
                      key={row.id}
                      className="p-3.5 rounded-lg bg-background border border-border/70 space-y-3 shadow-2xs relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          Item #{index + 1}
                        </span>
                        {skuRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSkuRow(row.id)}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded-md"
                            title="Remove SKU Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 items-end">
                        {/* SKU Code */}
                        <div className="col-span-2 sm:col-span-2">
                          <Input
                            label="Sample SKU *"
                            placeholder="e.g. SKU-RDX-8821"
                            value={row.sampleSku}
                            onChange={(e) => handleUpdateSkuRow(row.id, 'sampleSku', e.target.value)}
                            required
                          />
                        </div>

                        {/* QTY */}
                        <div>
                          <Input
                            label="QTY *"
                            type="number"
                            min="1"
                            step="1"
                            placeholder="5"
                            value={row.sampleSkuQty}
                            onChange={(e) => handleUpdateSkuRow(row.id, 'sampleSkuQty', e.target.value === '' ? '' : Number(e.target.value))}
                            required
                          />
                        </div>

                        {/* Cost per unit (local currency) */}
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                            Per Unit ({currencyLabel}) *
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="25.00"
                            value={row.sampleSkuCostPerUnit}
                            onChange={(e) => handleUpdateSkuRow(row.id, 'sampleSkuCostPerUnit', e.target.value === '' ? '' : Number(e.target.value))}
                            required
                            className="w-full h-10 px-3 bg-background border border-input rounded-lg text-xs sm:text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </div>

                        {/* Cost per unit GBP */}
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                            Per Unit (GBP)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="£ auto"
                            value={row.sampleSkuCostPerUnitGbp}
                            onChange={(e) => handleUpdateSkuRow(row.id, 'sampleSkuCostPerUnitGbp', e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full h-10 px-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-300/60 dark:border-amber-700/40 rounded-lg text-xs sm:text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                          />
                        </div>

                        {/* Line total display */}
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                            Total ({currencyLabel})
                          </label>
                          <div className="h-10 px-3 bg-muted/40 border border-border rounded-lg flex flex-col items-start justify-center">
                            <span className="font-mono font-bold text-sm text-foreground leading-tight">
                              {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-[9px] font-mono text-amber-600 dark:text-amber-400 leading-tight">
                              £{lineTotalGbp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grand Total Banner */}
              <div className="p-3.5 rounded-lg bg-card border-2 border-primary/30 grid grid-cols-2 gap-3 shadow-xs">
                <div>
                  <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-0.5">
                    Grand Total ({currencyLabel})
                  </div>
                  <div className="text-lg font-extrabold font-mono text-primary">
                    {grandSkuTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {totalSkuQty} units across {skuRows.length} SKU{skuRows.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="border-l border-border/60 pl-3">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-0.5">
                    Grand Total (GBP £)
                  </div>
                  <div className="text-lg font-extrabold font-mono text-amber-600 dark:text-amber-400">
                    £{grandSkuTotalGbp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    At rate 1 GBP = {gbpExchangeRate} {currencyLabel}
                  </div>
                </div>
              </div>

              {/* Real-time Team Budget Impact Box */}
              {selectedTeam && (
                <div className={`p-3 rounded-lg border text-xs space-y-1.5 transition-colors ${
                  isOverBudget
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
                    : 'bg-primary/5 border-primary/20 text-foreground'
                }`}>
                  <div className="flex items-center justify-between font-medium">
                    <span>Team Ledger: <strong>{selectedTeam.name}</strong>
                      <span className={`ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        selectedTeam.type === 'B2B' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      }`}>{selectedTeam.type}</span>
                    </span>
                    <span>Balance: <strong>${(currentRemaining || 0).toLocaleString()}</strong></span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span>After approval:</span>
                    <span className="font-mono font-bold">
                      -{grandSkuTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} → Projected: ${(projectedBalance || 0).toLocaleString()}
                    </span>
                  </div>
                  {isOverBudget && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 pt-1 border-t border-rose-500/20">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Warning: Grand total exceeds team remaining balance. Authorized override required.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Conditions Reminder */}
            <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/25 text-[11px] text-amber-700 dark:text-amber-400 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" /> Conditions for Free / Sample Items
              </p>
              <ul className="list-disc ml-4 space-y-0.5">
                <li>The selected free/sample item must <strong>NOT</strong> be the same item already present in the current order.</li>
                <li>Multiple sizes & colors of the same sample <strong>cannot</strong> be sent together.</li>
              </ul>
            </div>

            {/* Business Rationale / Comments */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Business Rationale & Deal Justification
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain how this sample/gift supports relationship building, evaluations, contract renewals, or corporate milestones..."
                className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </>
        ) : (
          /* DYNAMIC FIELDS GENERATED FROM FORM BUILDER */
          <div className="space-y-4">
            {/* Internal Team Selection & Priority */}
            <div className="p-3.5 rounded-xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-primary" />
                  Internal Team Selection & Priority
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Required for departmental spend control & budget ledger
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Select Team *
                  </label>
                  <select
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    className="w-full h-10 px-3.5 bg-background border border-input rounded-lg text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <optgroup label="── B2B Teams ──">
                      {teams.filter(t => t.type === 'B2B').map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} · B2B (${(t.remainingBudget || 0).toLocaleString()} left)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="── B2C Teams ──">
                      {teams.filter(t => t.type === 'B2C').map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} · B2C (${(t.remainingBudget || 0).toLocaleString()} left)
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <Select
                  label="Priority *"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as RequestPriority)}
                  options={[
                    { label: 'Low', value: 'low' },
                    { label: 'Normal', value: 'normal' },
                    { label: 'High', value: 'high' },
                    { label: 'Urgent', value: 'urgent' },
                  ]}
                />
              </div>
            </div>

            {/* Render dynamically all fields configured in this Form Schema */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border/70 space-y-3.5">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  Form Fields ({selectedForm?.fields?.length || 0})
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Generated from Form Builder
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {selectedForm?.fields?.map((field) => {
                  if (!isFieldVisible(field)) return null;
                  const isFullWidth = field.type === 'textarea' || field.type === 'signature' || field.type === 'notes';

                  return (
                    <div
                      key={field.id}
                      className={`space-y-1.5 ${isFullWidth ? 'sm:col-span-2' : ''}`}
                    >
                      <label className="block text-xs font-semibold text-foreground">
                        {field.label} {field.required && <span className="text-destructive">*</span>}
                      </label>

                      {/* Field Inputs by Type */}
                      {field.type === 'text' || field.type === 'email' || field.type === 'phone' ? (
                        <input
                          type={field.type === 'email' ? 'email' : (field.type === 'phone' ? 'tel' : 'text')}
                          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                          value={customValues[field.id] || ''}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                          required={field.required}
                          className="w-full h-10 px-3.5 bg-background border border-input rounded-lg text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      ) : field.type === 'number' || field.type === 'currency' ? (
                        <div className="relative">
                          {field.type === 'currency' && (
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">$</span>
                          )}
                          <input
                            type="number"
                            placeholder={field.placeholder || '0.00'}
                            value={customValues[field.id] || ''}
                            onChange={(e) => handleCustomFieldChange(field.id, e.target.value === '' ? '' : Number(e.target.value))}
                            required={field.required}
                            className={`w-full h-10 px-3.5 bg-background border border-input rounded-lg text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                              field.type === 'currency' ? 'pl-8 font-mono' : ''
                            }`}
                          />
                        </div>
                      ) : field.type === 'date' ? (
                        <input
                          type="date"
                          value={customValues[field.id] || ''}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                          required={field.required}
                          className="w-full h-10 px-3.5 bg-background border border-input rounded-lg text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      ) : field.type === 'time' ? (
                        <input
                          type="time"
                          value={customValues[field.id] || ''}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                          required={field.required}
                          className="w-full h-10 px-3.5 bg-background border border-input rounded-lg text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      ) : field.type === 'textarea' ? (
                        <textarea
                          rows={3}
                          placeholder={field.placeholder || `Provide details for ${field.label.toLowerCase()}...`}
                          value={customValues[field.id] || ''}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                          required={field.required}
                          className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      ) : field.type === 'dropdown' ? (
                        <select
                          value={customValues[field.id] || ''}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                          required={field.required}
                          className="w-full h-10 px-3.5 bg-background border border-input rounded-lg text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                          <option value="">Select {field.label}...</option>
                          {(field.options || []).map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      ) : field.type === 'radio' ? (
                        <div className="space-y-1.5 pt-1">
                          {(field.options || []).map(o => (
                            <label key={o.value} className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                              <input
                                type="radio"
                                name={field.id}
                                value={o.value}
                                checked={customValues[field.id] === o.value}
                                onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                className="text-primary focus:ring-primary"
                              />
                              <span>{o.label}</span>
                            </label>
                          ))}
                        </div>
                      ) : field.type === 'checkbox' ? (
                        <label className="flex items-center gap-2 pt-2 text-xs text-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(customValues[field.id])}
                            onChange={(e) => handleCustomFieldChange(field.id, e.target.checked)}
                            className="rounded text-primary focus:ring-primary w-4 h-4"
                          />
                          <span>{field.placeholder || 'Confirm and acknowledge'}</span>
                        </label>
                      ) : field.type === 'signature' ? (
                        <SignaturePad
                          value={customValues[field.id]}
                          onChange={(sig) => handleCustomFieldChange(field.id, sig)}
                          label={field.label}
                          required={field.required}
                        />
                      ) : field.type === 'notes' ? (
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground flex items-center gap-2">
                          <Info className="w-4 h-4 text-primary shrink-0" />
                          <span>{field.placeholder || field.label}</span>
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={customValues[field.id] || ''}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                          className="w-full h-10 px-3.5 bg-background border border-input rounded-lg text-xs sm:text-sm text-foreground"
                        />
                      )}

                      {field.helpText && (
                        <p className="text-[10px] text-muted-foreground">{field.helpText}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Optional SKU/Cost additions if desired */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Submission Notes & Comments
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Additional notes for approvers and audit logging..."
                className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Submit for Multi-Level Review
          </Button>
        </div>
      </form>
    </Modal>
  );
};

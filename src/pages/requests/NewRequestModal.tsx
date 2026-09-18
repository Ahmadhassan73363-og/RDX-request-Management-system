import React, { useState, useEffect } from 'react';
import {
  FileText,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  Calculator,
  FormInput,
  Layers,
  Info
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
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
}

export const NewRequestModal: React.FC<NewRequestModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const teams = dataService.getTeams().filter(t => t.active);
  const companies = dataService.getCompanies().filter(c => c.active);
  const allWarehouses = dataService.getWarehouses().filter(w => w.active);
  const customers = dataService.getCustomers().filter(c => c.active);

  // Company / Warehouse / Customer linkage
  const [companyId, setCompanyId] = useState(companies[0]?.id || '');
  const warehousesForCompany = allWarehouses.filter(w => w.companyId === companyId);
  const [warehouseId, setWarehouseId] = useState(warehousesForCompany[0]?.id || '');
  const [customerId, setCustomerId] = useState('');

  const handleCompanyChange = (newCompanyId: string) => {
    setCompanyId(newCompanyId);
    const nextWarehouses = allWarehouses.filter(w => w.companyId === newCompanyId);
    setWarehouseId(nextWarehouses[0]?.id || '');
  };

  // Forms available from Form Builder
  const [availableForms, setAvailableForms] = useState<FormSchema[]>(() =>
    dataService.getForms().filter(f => f.isActive)
  );
  const [selectedFormId, setSelectedFormId] = useState<string>('form-std-sample-foc');

  // Refresh active forms when modal opens
  useEffect(() => {
    if (isOpen) {
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
  // 2. Department
  const [department, setDepartment] = useState(currentUser.department || 'Commercial Sales');
  // 3. Agent/Team Name
  const [agentOrTeamName, setAgentOrTeamName] = useState(currentUser.name || '');
  // 4. Business Name
  const [businessName, setBusinessName] = useState('');

  const handleCustomerChange = (newCustomerId: string) => {
    setCustomerId(newCustomerId);
    const customer = customers.find(c => c.id === newCustomerId);
    if (customer) {
      setBusinessName(customer.companyName);
    }
  };

  // 5. Type of FOC
  const [typeOfFoc, setTypeOfFoc] = useState('Product Sample / Trial');
  // 6. System Invoice no.
  const [systemInvoiceNo, setSystemInvoiceNo] = useState('');

  // Team & Priority
  const [teamId, setTeamId] = useState(currentUser.teamId || teams[0]?.id || '');
  const [priority, setPriority] = useState<RequestPriority>('normal');

  // Multiple SKU Rows
  const [skuRows, setSkuRows] = useState<SkuRow[]>([
    { id: 'sku-1', sampleSku: '', sampleSkuQty: 1, sampleSkuCostPerUnit: 50 }
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
        sampleSkuCostPerUnit: 0
      }
    ]);
  };

  const handleRemoveSkuRow = (id: string) => {
    if (skuRows.length <= 1) return;
    setSkuRows(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateSkuRow = (id: string, field: keyof SkuRow, value: any) => {
    setSkuRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  // Calculated items and totals
  const calculatedSkuItems: SkuItem[] = skuRows.map(r => {
    const qty = Number(r.sampleSkuQty) || 0;
    const unitCost = Number(r.sampleSkuCostPerUnit) || 0;
    const lineTotal = Math.round(qty * unitCost * 100) / 100;
    return {
      id: r.id,
      sampleSku: r.sampleSku,
      sampleSkuQty: r.sampleSkuQty,
      sampleSkuCostPerUnit: r.sampleSkuCostPerUnit,
      sampleSkuTotal: lineTotal
    };
  });

  const totalSkuQty = calculatedSkuItems.reduce((acc, item) => acc + (Number(item.sampleSkuQty) || 0), 0);
  const grandSkuTotal = Math.round(calculatedSkuItems.reduce((acc, item) => acc + (item.sampleSkuTotal || 0), 0) * 100) / 100;

  // Selected team balance check
  const selectedTeam = teams.find(t => t.id === teamId);
  const currentRemaining = selectedTeam ? selectedTeam.remainingBudget : 0;
  const projectedBalance = currentRemaining - grandSkuTotal;
  const isOverBudget = projectedBalance < 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const selectedCompany = companies.find(c => c.id === companyId);
    const selectedWarehouse = allWarehouses.find(w => w.id === warehouseId);
    const selectedCustomer = customers.find(c => c.id === customerId);
    // Spread last in each payload below so a linked Customer's real contact/company
    // name wins over the free-text Agent/Business Name fields.
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
      if (!department.trim() || !agentOrTeamName.trim() || !businessName.trim() || !typeOfFoc.trim()) {
        setError('Please fill in all required operational details (Department, Agent/Team, Business Name, Type of FOC)');
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
              agentOrTeamName,
              businessName,
              typeOfFoc,
              systemInvoiceNo,
              skuSummary: primarySku,
              totalSkuQty,
              grandSkuTotal
            },
            date,
            department,
            agentOrTeamName,
            businessName,
            typeOfFoc,
            systemInvoiceNo: systemInvoiceNo || undefined,
            sampleSku: primarySku,
            sampleSkuQty: totalSkuQty,
            sampleSkuCostPerUnit: calculatedSkuItems[0]?.sampleSkuCostPerUnit !== '' ? Number(calculatedSkuItems[0]?.sampleSkuCostPerUnit) : 0,
            sampleSkuTotal: grandSkuTotal,
            skuItems: calculatedSkuItems,

            // Mapped fields for backwards compatibility
            customerName: agentOrTeamName,
            customerCompany: businessName,
            requestCategory: typeOfFoc,
            requestItem: `${primarySku} (Total Qty: ${totalSkuQty})`,
            requestValue: grandSkuTotal,
            discountPercentage: 0,
            teamId,
            reason: reason.trim() || `FOC request for ${businessName} - SKUs: ${primarySku} (Total Qty: ${totalSkuQty})`,
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
        // Map dynamic form fields to standard fields intelligently
        let mappedCustomerName = currentUser.name;
        let mappedCompany = 'Enterprise Client';
        let mappedItem = selectedForm.title;
        let mappedCategory = selectedForm.category || 'General';
        let mappedValue = 0;
        let mappedReason = '';
        let mappedDate = new Date().toISOString().split('T')[0];

        // Search field values for standard meanings
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

        // Use SKU total if SKUs were entered, otherwise mappedValue
        const finalValue = grandSkuTotal > 0 ? grandSkuTotal : (mappedValue > 0 ? mappedValue : 150);

        // Build key-value map with human readable field labels for display
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
          <span>New Request</span>
        </div>
      }
      description="Select an authorized form template and submit your request for multi-level review and budget tracking"
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

        {/* Company / Warehouse / Customer Linkage */}
        <div className="p-3.5 rounded-xl bg-card border border-border space-y-3">
          <span className="text-xs font-bold text-foreground block">
            Company · Warehouse · Customer
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Issuing Company"
              value={companyId}
              onChange={(e) => handleCompanyChange(e.target.value)}
              options={companies.map(c => ({ label: c.name, value: c.id }))}
            />
            <Select
              label="Dispatch Warehouse"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              options={warehousesForCompany.map(w => ({ label: w.name, value: w.id }))}
              helperText={warehousesForCompany.length === 0 ? 'No warehouses for this company' : undefined}
            />
            <Select
              label="Customer (optional)"
              value={customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              options={[
                { label: 'None — enter details manually', value: '' },
                ...customers.map(c => ({ label: `${c.contactName} (${c.companyName})`, value: c.id }))
              ]}
              helperText={customerId ? 'Business Name auto-filled from customer record' : undefined}
            />
          </div>
        </div>

        {/* 2. DYNAMIC FIELDS OR DEFAULT STANDARD FORM */}
        {isDefaultSampleForm ? (
          /* STANDARD FORM LAYOUT */
          <>
            {/* Row 1: Date (Auto-fetched) & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Date (Auto-fetched) *
                  </label>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Current Date
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

              <Input
                label="Department *"
                placeholder="e.g. Commercial Sales / Marketing"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
              />
            </div>

            {/* Row 2: Agent/Team Name & Business Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Agent / Team Name *"
                placeholder="e.g. John Doe / Apex Sales Team"
                value={agentOrTeamName}
                onChange={(e) => setAgentOrTeamName(e.target.value)}
                required
              />
              <Input
                label="Business Name *"
                placeholder="e.g. Acme Corporation"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
              />
            </div>

            {/* Row 3: Type of FOC & System Invoice no. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Type of FOC *"
                placeholder="e.g. Promotional Sample / Customer Trial"
                value={typeOfFoc}
                onChange={(e) => setTypeOfFoc(e.target.value)}
                required
              />
              <Input
                label="System Invoice no."
                type="number"
                placeholder="e.g. 109482"
                value={systemInvoiceNo}
                onChange={(e) => setSystemInvoiceNo(e.target.value)}
              />
            </div>

            {/* Row 4: Team Allocation & Priority */}
            <div className="p-3.5 rounded-xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  Budget Ledger & Priority Allocation
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Required for departmental spend control
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label="Team Budget Ledger *"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  options={teams.map(t => ({
                    label: `${t.name} ($${(t.remainingBudget || 0).toLocaleString()} left)`,
                    value: t.id
                  }))}
                />
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

            {/* Row 5: Multiple SKU Calculators Section */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    Sample SKU Calculators ({skuRows.length})
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

              <div className="space-y-3">
                {skuRows.map((row, index) => {
                  const qty = Number(row.sampleSkuQty) || 0;
                  const unitCost = Number(row.sampleSkuCostPerUnit) || 0;
                  const lineTotal = Math.round(qty * unitCost * 100) / 100;

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

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                        <div className="sm:col-span-1">
                          <Input
                            label="Sample SKU *"
                            placeholder="e.g. SKU-RDX-8821"
                            value={row.sampleSku}
                            onChange={(e) => handleUpdateSkuRow(row.id, 'sampleSku', e.target.value)}
                            required
                          />
                        </div>

                        <div>
                          <Input
                            label="QTY *"
                            type="number"
                            min="1"
                            step="1"
                            placeholder="e.g. 5"
                            value={row.sampleSkuQty}
                            onChange={(e) => handleUpdateSkuRow(row.id, 'sampleSkuQty', e.target.value === '' ? '' : Number(e.target.value))}
                            required
                          />
                        </div>

                        <div>
                          <Input
                            label="Cost / Unit ($) *"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="e.g. 25.00"
                            value={row.sampleSkuCostPerUnit}
                            onChange={(e) => handleUpdateSkuRow(row.id, 'sampleSkuCostPerUnit', e.target.value === '' ? '' : Number(e.target.value))}
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                            Line Total
                          </label>
                          <div className="h-10 px-3 bg-muted/40 border border-border rounded-lg flex items-center justify-between font-mono font-bold text-sm text-foreground">
                            <span>${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <span className="text-[10px] uppercase font-sans font-medium text-muted-foreground">
                              {qty} × ${unitCost}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Combined SKU Grand Total Banner */}
              <div className="p-3.5 rounded-lg bg-card border-2 border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">Calculated Grand Total:</span>
                  <span className="text-xs text-muted-foreground">
                    ({totalSkuQty} total items across {skuRows.length} {skuRows.length === 1 ? 'SKU' : 'SKUs'})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold font-mono text-primary">
                    ${grandSkuTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
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
                    <span>Allocated Team Ledger: <strong>{selectedTeam.name}</strong></span>
                    <span>Remaining Balance: <strong>${(currentRemaining || 0).toLocaleString()}</strong></span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span>Cost after approval:</span>
                    <span className="font-mono font-bold">
                      -${grandSkuTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} → Projected: ${(projectedBalance || 0).toLocaleString()}
                    </span>
                  </div>
                  {isOverBudget && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 pt-1 border-t border-rose-500/20">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Warning: Grand total exceeds current team remaining balance. Authorized override will be required.</span>
                    </div>
                  )}
                </div>
              )}
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
                placeholder="Explain how this sample/request supports relationship building, evaluations, contract renewals, or corporate milestones..."
                className="w-full bg-background border border-input rounded-lg px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </>
        ) : (
          /* DYNAMIC FIELDS GENERATED FROM FORM BUILDER */
          <div className="space-y-4">
            {/* Team Allocation & Priority */}
            <div className="p-3.5 rounded-xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  Budget Ledger & Priority Allocation
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Required for departmental spend control
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label="Team Budget Ledger *"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  options={teams.map(t => ({
                    label: `${t.name} ($${(t.remainingBudget || 0).toLocaleString()} left)`,
                    value: t.id
                  }))}
                />
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

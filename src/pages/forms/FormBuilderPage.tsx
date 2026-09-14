import React, { useState } from 'react';
import {
  FormInput,
  Plus,
  Trash2,
  Settings,
  Eye,
  Save,
  ArrowLeft,
  MoveUp,
  MoveDown,
  Layers,
  HelpCircle,
  CheckCircle2,
  PenTool,
  DollarSign,
  Calendar,
  Clock,
  Mail,
  Phone,
  FileText,
  CheckSquare,
  UploadCloud,
  FileSpreadsheet
} from 'lucide-react';
import { FormField, FieldType, FormSchema } from '../../types/form';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { SignaturePad } from '../../components/common/SignaturePad';

interface FormBuilderPageProps {
  formId?: string;
  onBack: () => void;
  onSaved: (id: string) => void;
}

const FIELD_PALETTE: { type: FieldType; label: string; icon: React.ReactNode; defaultLabel: string }[] = [
  { type: 'text', label: 'Short Text', icon: <FileText className="w-3.5 h-3.5" />, defaultLabel: 'Text Field' },
  { type: 'textarea', label: 'Paragraph / Notes', icon: <FileSpreadsheet className="w-3.5 h-3.5" />, defaultLabel: 'Detailed Rationale' },
  { type: 'number', label: 'Number', icon: <span className="font-mono font-bold text-xs">#</span>, defaultLabel: 'Numeric Quantity' },
  { type: 'currency', label: 'Currency ($)', icon: <DollarSign className="w-3.5 h-3.5" />, defaultLabel: 'Budget Amount' },
  { type: 'email', label: 'Email', icon: <Mail className="w-3.5 h-3.5" />, defaultLabel: 'Recipient Email' },
  { type: 'phone', label: 'Phone', icon: <Phone className="w-3.5 h-3.5" />, defaultLabel: 'Contact Phone' },
  { type: 'date', label: 'Date', icon: <Calendar className="w-3.5 h-3.5" />, defaultLabel: 'Event Date' },
  { type: 'time', label: 'Time', icon: <Clock className="w-3.5 h-3.5" />, defaultLabel: 'Scheduled Time' },
  { type: 'dropdown', label: 'Dropdown Select', icon: <Layers className="w-3.5 h-3.5" />, defaultLabel: 'Priority Tier' },
  { type: 'radio', label: 'Radio Choice', icon: <CheckSquare className="w-3.5 h-3.5" />, defaultLabel: 'Urgency Level' },
  { type: 'checkbox', label: 'Checkbox', icon: <CheckSquare className="w-3.5 h-3.5" />, defaultLabel: 'Requires Executive Stamp' },
  { type: 'multi_select', label: 'Multi-Select', icon: <Layers className="w-3.5 h-3.5" />, defaultLabel: 'Applicable Categories' },
  { type: 'file_upload', label: 'File Document', icon: <UploadCloud className="w-3.5 h-3.5" />, defaultLabel: 'Contract Quote Attachment' },
  { type: 'image_upload', label: 'Image Upload', icon: <UploadCloud className="w-3.5 h-3.5" />, defaultLabel: 'Item Photo' },
  { type: 'signature', label: 'Digital Signature', icon: <PenTool className="w-3.5 h-3.5" />, defaultLabel: 'Director Authorization Sign-Off' },
  { type: 'notes', label: 'Guidance Notice', icon: <HelpCircle className="w-3.5 h-3.5" />, defaultLabel: 'Corporate Compliance Notice' },
];

export const FormBuilderPage: React.FC<FormBuilderPageProps> = ({ formId, onBack, onSaved }) => {
  const { currentUser } = useAuth();
  const existingForm = formId ? dataService.getFormById(formId) : null;

  const [formTitle, setFormTitle] = useState(existingForm?.title || 'New Dynamic Request Form');
  const [formDescription, setFormDescription] = useState(existingForm?.description || 'Custom workflow schema');
  const [category, setCategory] = useState(existingForm?.category || 'Corporate');
  const [fields, setFields] = useState<FormField[]>(existingForm?.fields || [
    {
      id: 'f-' + Date.now(),
      type: 'text',
      name: 'recipientName',
      label: 'Recipient Full Name',
      placeholder: 'Enter client name...',
      required: true
    },
    {
      id: 'f-' + (Date.now() + 1),
      type: 'currency',
      name: 'itemValue',
      label: 'Estimated Item Value ($)',
      placeholder: '500',
      required: true
    },
    {
      id: 'f-' + (Date.now() + 2),
      type: 'signature',
      name: 'submitterSign',
      label: 'Submitter Digital Signature',
      required: true
    }
  ]);

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(fields[0]?.id || null);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  const selectedField = fields.find(f => f.id === selectedFieldId);

  const handleAddField = (type: FieldType, defaultLabel: string) => {
    const id = 'f-' + Date.now();
    const newField: FormField = {
      id,
      type,
      name: 'field_' + Math.floor(Math.random() * 10000),
      label: defaultLabel,
      required: false,
      placeholder: `Enter ${defaultLabel.toLowerCase()}...`,
      options: ['dropdown', 'radio', 'multi_select'].includes(type)
        ? [
            { label: 'Option 1 (Standard)', value: 'standard' },
            { label: 'Option 2 (Premium)', value: 'premium' },
            { label: 'Option 3 (Executive VIP)', value: 'vip' }
          ]
        : undefined
    };

    setFields([...fields, newField]);
    setSelectedFieldId(id);
  };

  const handleUpdateSelectedField = (updates: Partial<FormField>) => {
    if (!selectedFieldId) return;
    setFields(fields.map(f => f.id === selectedFieldId ? { ...f, ...updates } : f));
  };

  const handleDeleteField = (id: string) => {
    const remaining = fields.filter(f => f.id !== id);
    setFields(remaining);
    if (selectedFieldId === id) {
      setSelectedFieldId(remaining[0]?.id || null);
    }
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newFields.length) return;
    const temp = newFields[index];
    newFields[index] = newFields[targetIdx];
    newFields[targetIdx] = temp;
    setFields(newFields);
  };

  const handleSaveForm = () => {
    const saved = dataService.saveForm(
      {
        id: formId,
        title: formTitle,
        description: formDescription,
        category,
        fields
      },
      currentUser
    );
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    onSaved(saved.id);
  };

  // Check conditional logic in preview
  const isFieldVisibleInPreview = (field: FormField): boolean => {
    if (!field.condition) return true;
    const cond = field.condition;
    const targetVal = previewValues[cond.fieldId];

    if (cond.operator === 'equals') return targetVal === cond.value;
    if (cond.operator === 'not_equals') return targetVal !== cond.value;
    if (cond.operator === 'greater_than') return Number(targetVal) > Number(cond.value);
    if (cond.operator === 'less_than') return Number(targetVal) < Number(cond.value);
    if (cond.operator === 'is_not_empty') return !!targetVal;
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FormInput className="w-5 h-5 text-primary" />
              Dynamic No-Code Form Generator
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Build and customize request forms with live conditional rules and validation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="p-1 bg-muted rounded-xl border border-border flex items-center gap-0.5">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'editor' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Schema Editor
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'preview' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Test</span>
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveForm}
            leftIcon={<Save className="w-4 h-4" />}
          >
            {saveSuccess ? 'Saved Form!' : 'Save & Publish Form'}
          </Button>
        </div>
      </div>

      {activeTab === 'editor' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Left: Palette of 16 supported field types */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs">Field Types Palette</CardTitle>
                <p className="text-[11px] text-muted-foreground">Click to add to your form layout</p>
              </CardHeader>
              <CardContent className="space-y-1.5 max-h-[70vh] overflow-y-auto">
                {FIELD_PALETTE.map((item) => (
                  <button
                    key={item.type}
                    onClick={() => handleAddField(item.type, item.defaultLabel)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border/70 hover:border-primary/40 hover:bg-primary/5 text-xs text-foreground transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-primary group-hover:scale-110 transition-transform">
                        {item.icon}
                      </span>
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Middle: Visual form canvas */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-4 space-y-3 bg-muted/20">
              <Input
                label="Form Title *"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Form Name"
                className="font-bold text-base"
              />
              <Input
                label="Form Description / Purpose"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Describe when teams should use this form..."
              />
            </Card>

            <div className="space-y-3">
              {fields.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-border rounded-2xl text-xs text-muted-foreground">
                  Your form is empty. Click any field type on the left palette to insert fields.
                </div>
              ) : (
                fields.map((field, idx) => {
                  const isSelected = field.id === selectedFieldId;

                  return (
                    <div
                      key={field.id}
                      onClick={() => setSelectedFieldId(field.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer bg-card ${
                        isSelected
                          ? 'border-primary ring-2 ring-primary/20 shadow-md'
                          : 'border-border/80 hover:border-border hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-bold">
                            {field.type.toUpperCase()}
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            {field.label}
                          </span>
                          {field.required && (
                            <span className="text-destructive font-bold text-xs">*</span>
                          )}
                          {field.condition && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-medium">
                              Conditional
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleMoveField(idx, 'up'); }}
                            disabled={idx === 0}
                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                            title="Move Up"
                          >
                            <MoveUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleMoveField(idx, 'down'); }}
                            disabled={idx === fields.length - 1}
                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                            title="Move Down"
                          >
                            <MoveDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteField(field.id); }}
                            className="p-1 text-muted-foreground hover:text-destructive"
                            title="Delete Field"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-muted-foreground">
                        <span className="italic">Placeholder:</span> "{field.placeholder || 'None'}"
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Field Inspector & Conditional Logic Settings */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-primary" />
                  Field Settings Inspector
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5 text-xs">
                {selectedField ? (
                  <>
                    <Input
                      label="Field Label"
                      value={selectedField.label}
                      onChange={(e) => handleUpdateSelectedField({ label: e.target.value })}
                    />

                    <Input
                      label="Placeholder Text"
                      value={selectedField.placeholder || ''}
                      onChange={(e) => handleUpdateSelectedField({ placeholder: e.target.value })}
                    />

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border">
                      <span className="font-semibold text-foreground">Required Field</span>
                      <input
                        type="checkbox"
                        checked={selectedField.required}
                        onChange={(e) => handleUpdateSelectedField({ required: e.target.checked })}
                        className="w-4 h-4 text-primary rounded cursor-pointer"
                      />
                    </div>

                    {/* Min / Max Length for text */}
                    {(selectedField.type === 'text' || selectedField.type === 'textarea') && (
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          label="Min Length"
                          type="number"
                          value={selectedField.minLength || ''}
                          onChange={(e) => handleUpdateSelectedField({ minLength: Number(e.target.value) || undefined })}
                        />
                        <Input
                          label="Max Length"
                          type="number"
                          value={selectedField.maxLength || ''}
                          onChange={(e) => handleUpdateSelectedField({ maxLength: Number(e.target.value) || undefined })}
                        />
                      </div>
                    )}

                    {/* Options for dropdown / radio */}
                    {['dropdown', 'radio', 'multi_select'].includes(selectedField.type) && (
                      <div className="space-y-2 pt-1 border-t border-border">
                        <span className="font-semibold text-foreground text-xs">Choice Options</span>
                        <div className="space-y-1.5">
                          {(selectedField.options || []).map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={opt.label}
                                onChange={(e) => {
                                  const newOpts = [...(selectedField.options || [])];
                                  newOpts[optIdx] = { label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') };
                                  handleUpdateSelectedField({ options: newOpts });
                                }}
                                className="w-full bg-background border border-input rounded px-2 py-1 text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Conditional Logic Builder */}
                    <div className="space-y-2 pt-2 border-t border-border">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground text-xs">Conditional Logic</span>
                        <input
                          type="checkbox"
                          checked={!!selectedField.condition}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const otherField = fields.find(f => f.id !== selectedField.id);
                              handleUpdateSelectedField({
                                condition: {
                                  fieldId: otherField ? otherField.id : '',
                                  operator: 'equals',
                                  value: 'premium',
                                  action: 'show'
                                }
                              });
                            } else {
                              handleUpdateSelectedField({ condition: undefined });
                            }
                          }}
                          className="w-4 h-4 text-primary rounded cursor-pointer"
                        />
                      </div>

                      {selectedField.condition && (
                        <div className="p-2.5 rounded-lg bg-muted/40 border border-border/80 space-y-2 text-[11px]">
                          <p className="text-muted-foreground">
                            Rule: SHOW this field only IF another field satisfies condition:
                          </p>
                          <select
                            value={selectedField.condition.fieldId}
                            onChange={(e) => handleUpdateSelectedField({
                              condition: { ...selectedField.condition!, fieldId: e.target.value }
                            })}
                            className="w-full bg-background border border-input rounded px-2 py-1"
                          >
                            {fields.filter(f => f.id !== selectedField.id).map(f => (
                              <option key={f.id} value={f.id}>{f.label}</option>
                            ))}
                          </select>

                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={selectedField.condition.operator}
                              onChange={(e) => handleUpdateSelectedField({
                                condition: { ...selectedField.condition!, operator: e.target.value as any }
                              })}
                              className="w-full bg-background border border-input rounded px-2 py-1"
                            >
                              <option value="equals">Equals</option>
                              <option value="not_equals">Not Equals</option>
                              <option value="greater_than">Greater Than</option>
                              <option value="less_than">Less Than</option>
                            </select>

                            <input
                              type="text"
                              placeholder="Match value..."
                              value={selectedField.condition.value}
                              onChange={(e) => handleUpdateSelectedField({
                                condition: { ...selectedField.condition!, value: e.target.value }
                              })}
                              className="w-full bg-background border border-input rounded px-2 py-1"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground italic text-center py-6">
                    Select a field to configure its settings and validation rules.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Live Interactive Preview */
        <Card className="max-w-2xl mx-auto p-6 space-y-6">
          <div className="border-b pb-4">
            <h3 className="text-lg font-bold text-foreground">{formTitle}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{formDescription}</p>
          </div>

          <div className="space-y-4">
            {fields.map((field) => {
              if (!isFieldVisibleInPreview(field)) return null;

              return (
                <div key={field.id} className="space-y-1.5">
                  <label className="block text-xs font-semibold text-foreground">
                    {field.label} {field.required && <span className="text-destructive">*</span>}
                  </label>

                  {field.type === 'text' || field.type === 'email' || field.type === 'phone' ? (
                    <input
                      type={field.type === 'email' ? 'email' : 'text'}
                      placeholder={field.placeholder}
                      value={previewValues[field.id] || ''}
                      onChange={(e) => setPreviewValues({ ...previewValues, [field.id]: e.target.value })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/30"
                    />
                  ) : field.type === 'number' || field.type === 'currency' ? (
                    <div className="relative">
                      {field.type === 'currency' && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                      )}
                      <input
                        type="number"
                        placeholder={field.placeholder}
                        value={previewValues[field.id] || ''}
                        onChange={(e) => setPreviewValues({ ...previewValues, [field.id]: e.target.value })}
                        className={`w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/30 ${
                          field.type === 'currency' ? 'pl-7 font-mono' : ''
                        }`}
                      />
                    </div>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      rows={3}
                      placeholder={field.placeholder}
                      value={previewValues[field.id] || ''}
                      onChange={(e) => setPreviewValues({ ...previewValues, [field.id]: e.target.value })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/30"
                    />
                  ) : field.type === 'dropdown' ? (
                    <select
                      value={previewValues[field.id] || ''}
                      onChange={(e) => setPreviewValues({ ...previewValues, [field.id]: e.target.value })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">Select option...</option>
                      {(field.options || []).map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : field.type === 'signature' ? (
                    <SignaturePad
                      value={previewValues[field.id]}
                      onChange={(sig) => setPreviewValues({ ...previewValues, [field.id]: sig })}
                      label={field.label}
                    />
                  ) : (
                    <div className="p-3 border rounded-lg bg-muted/20 text-xs text-muted-foreground">
                      [{field.type.toUpperCase()}] simulation active
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Live Interactive Preview Simulation</span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => alert('Test response simulated successfully!')}
            >
              Simulate Submit
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

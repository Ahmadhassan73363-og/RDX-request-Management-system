import React, { useState } from 'react';
import {
  Settings,
  Building,
  Palette,
  Shield,
  DollarSign,
  Mail,
  CheckCircle2,
  Save,
  Layers,
  Sliders,
  Bell
} from 'lucide-react';
import { useSystem } from '../../context/SystemContext';
import { useAuth } from '../../context/AuthContext';
import { RequestStatus } from '../../types/request';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { StatusBadge } from '../../components/common/Badge';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings } = useSystem();
  const { currentUser, hasPermission } = useAuth();

  const [activeTab, setActiveTab] = useState<'branding' | 'budget' | 'status' | 'approvals' | 'emails'>('branding');
  const [saveMessage, setSaveMessage] = useState('');

  // Branding state
  const [companyName, setCompanyName] = useState(settings?.branding?.companyName ?? 'RDX');
  const [appTitle, setAppTitle] = useState(settings?.branding?.appTitle ?? 'Request & Budget Management System');
  const [currencySymbol, setCurrencySymbol] = useState(settings?.branding?.currencySymbol ?? '$');
  const [supportEmail, setSupportEmail] = useState(settings?.branding?.supportEmail ?? 'support@enterprise.com');
  const [maxAttachmentMb, setMaxAttachmentMb] = useState(settings?.maxAttachmentSizeMb ?? 15);

  // Budget rules state
  const [warningThreshold, setWarningThreshold] = useState(settings?.budgetRules?.warningThresholdPercent ?? 80);
  const [criticalThreshold, setCriticalThreshold] = useState(settings?.budgetRules?.criticalThresholdPercent ?? 100);
  const [requireOverride, setRequireOverride] = useState(settings?.budgetRules?.requireExecutiveOverrideWhenExceeded ?? true);

  // Status configs state
  const [statusConfigs, setStatusConfigs] = useState([...(settings?.statusConfigs ?? [])]);

  const handleSaveAll = () => {
    updateSettings({
      branding: {
        ...(settings?.branding || {}),
        companyName,
        appTitle,
        currencySymbol,
        supportEmail
      },
      budgetRules: {
        ...(settings?.budgetRules || {}),
        warningThresholdPercent: Number(warningThreshold),
        criticalThresholdPercent: Number(criticalThreshold),
        requireExecutiveOverrideWhenExceeded: requireOverride,
      },
      maxAttachmentSizeMb: Number(maxAttachmentMb),
      statusConfigs
    });

    setSaveMessage('Settings successfully saved and synchronized!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleUpdateStatusLabel = (key: RequestStatus, newLabel: string) => {
    setStatusConfigs(statusConfigs.map(s => s.key === key ? { ...s, label: newLabel } : s));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Enterprise System Configuration & Policies
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage global branding, budget risk safety guards, approval rules, and status color badges
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {saveMessage && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {saveMessage}
            </span>
          )}
          <Button variant="primary" size="sm" onClick={handleSaveAll} leftIcon={<Save className="w-4 h-4" />}>
            Save All Settings
          </Button>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-border/80 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('branding')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all -mb-[1px] ${
            activeTab === 'branding' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Branding & General</span>
        </button>
        <button
          onClick={() => setActiveTab('budget')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all -mb-[1px] ${
            activeTab === 'budget' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Budget Safety Rules</span>
        </button>
        <button
          onClick={() => setActiveTab('status')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all -mb-[1px] ${
            activeTab === 'status' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Status Management</span>
        </button>
        <button
          onClick={() => setActiveTab('approvals')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all -mb-[1px] ${
            activeTab === 'approvals' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Approval Chains</span>
        </button>
        <button
          onClick={() => setActiveTab('emails')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all -mb-[1px] ${
            activeTab === 'emails' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Email & Notifications</span>
        </button>
      </div>

      {/* Tab 1: System Branding */}
      {activeTab === 'branding' && (
        <Card className="max-w-3xl space-y-4 p-6">
          <CardHeader className="p-0 pb-3">
            <CardTitle>Enterprise Branding & General Parameters</CardTitle>
            <p className="text-xs text-muted-foreground">
              Customize company name, system title, and currency units displayed across modules
            </p>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Company / Enterprise Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
              <Input
                label="Application Title"
                value={appTitle}
                onChange={(e) => setAppTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Default Currency Symbol"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
              />
              <Input
                label="Corporate Support Desk Email"
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
              />
            </div>

            <Input
              label="Maximum Attachment Size (MB)"
              type="number"
              value={maxAttachmentMb}
              onChange={(e) => setMaxAttachmentMb(Number(e.target.value))}
            />
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Budget Risk Safety Rules */}
      {activeTab === 'budget' && (
        <Card className="max-w-3xl space-y-4 p-6">
          <CardHeader className="p-0 pb-3">
            <CardTitle>Budget Risk Safety Limits & Thresholds</CardTitle>
            <p className="text-xs text-muted-foreground">
              Configure system alerts when team burn rates cross warning and exhaustion levels
            </p>
          </CardHeader>
          <CardContent className="p-0 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Warning Threshold Alert (%)"
                type="number"
                min="50"
                max="99"
                value={warningThreshold}
                onChange={(e) => setWarningThreshold(Number(e.target.value))}
                helperText="Triggers warning banner and notifications when team spending reaches this percentage"
              />
              <Input
                label="Critical Exhaustion Limit (%)"
                type="number"
                min="100"
                max="150"
                value={criticalThreshold}
                onChange={(e) => setCriticalThreshold(Number(e.target.value))}
                helperText="Deductions beyond this level automatically freeze unless authorized by override"
              />
            </div>

            <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
              <div>
                <p className="font-bold text-foreground text-xs">Require Executive Override When Exceeded</p>
                <p className="text-[11px] text-muted-foreground">
                  When enabled, standard approvers cannot approve requests that would cause a budget deficit.
                </p>
              </div>
              <input
                type="checkbox"
                checked={requireOverride}
                onChange={(e) => setRequireOverride(e.target.checked)}
                className="w-5 h-5 text-primary rounded cursor-pointer"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Configurable Status Colors & Badges (Requirement 10) */}
      {activeTab === 'status' && (
        <Card className="max-w-4xl space-y-4 p-6">
          <CardHeader className="p-0 pb-3">
            <CardTitle>Workflow Status Colors & Badges Customizer</CardTitle>
            <p className="text-xs text-muted-foreground">
              Configure status badges, display labels, and visual indicators across all views
            </p>
          </CardHeader>
          <CardContent className="p-0 space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20">
                    <th className="p-3 pl-4">System Key</th>
                    <th className="p-3">Display Label</th>
                    <th className="p-3">Live Badge Preview</th>
                    <th className="p-3 pr-4">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {statusConfigs.map((cfg) => (
                    <tr key={cfg.key} className="hover:bg-muted/40 transition-colors">
                      <td className="p-3 pl-4 font-mono font-bold text-muted-foreground">
                        {cfg.key}
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={cfg.label}
                          onChange={(e) => handleUpdateStatusLabel(cfg.key, e.target.value)}
                          className="bg-background border border-input rounded px-2 py-1 text-xs text-foreground font-semibold"
                        />
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="p-3 pr-4 text-muted-foreground text-xs">
                        {cfg.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Configurable Multi-Level Approval Chains (Requirement 9) */}
      {activeTab === 'approvals' && (
        <Card className="max-w-3xl space-y-4 p-6">
          <CardHeader className="p-0 pb-3">
            <CardTitle>Configurable Approval Chains</CardTitle>
            <p className="text-xs text-muted-foreground">
              Define the sequential role progression for corporate authorizations
            </p>
          </CardHeader>
          <CardContent className="p-0 space-y-4 text-xs">
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-foreground text-sm">Default 4-Stage Executive Chain</h4>
                  <p className="text-muted-foreground text-xs">Applied to all customer submissions</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary font-bold">
                  ACTIVE DEFAULT
                </span>
              </div>

              <div className="space-y-2 pt-2">
                {settings?.approvalChains?.[0]?.steps?.map((step) => (
                  <div key={step.id} className="p-3 rounded-lg bg-card border border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-xs">
                        {step.order}
                      </span>
                      <div>
                        <p className="font-bold text-foreground">{step.label}</p>
                        <p className="text-[11px] text-muted-foreground">Required Role: <strong>{step.roleName}</strong></p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                      REQUIRED
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 5: Email Notifications Preview */}
      {activeTab === 'emails' && (
        <Card className="max-w-3xl space-y-4 p-6">
          <CardHeader className="p-0 pb-3">
            <CardTitle>Email Notification Triggers</CardTitle>
            <p className="text-xs text-muted-foreground">
              Enterprise transactional email templates generated on system events
            </p>
          </CardHeader>
          <CardContent className="p-0 space-y-3 text-xs">
            <div className="space-y-2">
              {[
                { trigger: 'Request Submitted', target: 'Executive Committee', subject: '[ACTION REQUIRED] New Request Submitted' },
                { trigger: 'Request Approved', target: 'Submitter & Team Lead', subject: '[CONFIRMED] Request Authorized & Budget Allocated' },
                { trigger: 'Request Rejected', target: 'Submitter', subject: '[DECISION] Request Declined' },
                { trigger: 'Budget Low (<20%)', target: 'Admins & Team Lead', subject: '[BUDGET WARNING] Team balance approaching threshold' },
                { trigger: 'Budget Exhausted (100%)', target: 'Super Admins', subject: '[CRITICAL ALERT] Team budget fully consumed' },
              ].map((tmpl, i) => (
                <div key={i} className="p-3.5 rounded-xl border border-border/80 bg-muted/20 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-bold text-foreground">{tmpl.trigger}</p>
                    <p className="text-[11px] text-muted-foreground">Target Recipient: <strong>{tmpl.target}</strong></p>
                    <p className="text-[10px] text-primary font-mono">{tmpl.subject}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                    ENABLED
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

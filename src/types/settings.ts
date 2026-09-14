import { RequestStatus } from './request';
import { ApprovalChainConfig } from './approval';

export interface StatusConfigItem {
  key: RequestStatus;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  description: string;
}

export interface BrandingConfig {
  companyName: string;
  appTitle: string;
  logoUrl?: string;
  currencySymbol: string;
  currencyCode: string;
  primaryColorHex: string;
  supportEmail: string;
}

export interface BudgetRuleConfig {
  warningThresholdPercent: number; // e.g. 80%
  criticalThresholdPercent: number; // e.g. 100%
  requireExecutiveOverrideWhenExceeded: boolean;
  maxRequestDiscountAllowedPercent: number;
}

export interface EmailTemplateConfig {
  id: string;
  type: string;
  subject: string;
  bodyTemplate: string;
}

export interface SystemSettings {
  branding: BrandingConfig;
  budgetRules: BudgetRuleConfig;
  statusConfigs: StatusConfigItem[];
  approvalChains: ApprovalChainConfig[];
  categories: string[];
  departments: string[];
  maxAttachmentSizeMb: number;
}

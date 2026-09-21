export interface Company {
  id: string;
  name: string;
  shortCode: string;
  companyIdNumber?: string;
  legalName: string;
  legalId?: string;
  logoUrl?: string;
  location?: string;
  address: string;
  taxId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  defaultCurrency: string;
  color?: string;
  active: boolean;
  createdAt: string;
}

export const COMPANY_CURRENCIES = [
  { value: 'USD', label: 'Dollar (USD - $)', symbol: '$' },
  { value: 'GBP', label: 'GB (GBP - £)', symbol: '£' },
  { value: 'EUR', label: 'Euro (EUR - €)', symbol: '€' },
  { value: 'AED', label: 'AED (AED - د.إ)', symbol: 'د.إ' },
] as const;

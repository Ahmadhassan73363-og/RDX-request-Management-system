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
  { value: 'GBP', label: 'GBP (£)', symbol: '£' },
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'AED', label: 'AED (د.إ)', symbol: 'د.إ' },
  { value: 'CAD', label: 'CAD ($)', symbol: 'CA$' },
  { value: 'AUD', label: 'AUD ($)', symbol: 'A$' },
] as const;

export const getCurrencySymbol = (currencyCode?: string): string => {
  if (!currencyCode) return '£';
  const match = COMPANY_CURRENCIES.find(c => c.value === currencyCode);
  if (match) return match.symbol;
  if (currencyCode === 'GBP') return '£';
  if (currencyCode === 'EUR') return '€';
  if (currencyCode === 'AED') return 'د.إ';
  return '$';
};

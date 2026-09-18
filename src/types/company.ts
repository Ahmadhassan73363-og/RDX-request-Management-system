export interface Company {
  id: string;
  name: string;
  shortCode: string;
  legalName: string;
  logoUrl?: string;
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

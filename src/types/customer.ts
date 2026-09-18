export interface Customer {
  id: string;
  contactName: string;
  companyName: string;
  email: string;
  phone: string;
  shippingAddress: string;
  billingSameAsShipping: boolean;
  billingAddress?: string;
  accountCode: string;
  tags: string[];
  notes: string;
  active: boolean;
  createdAt: string;
}

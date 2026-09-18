export interface Warehouse {
  id: string;
  name: string;
  code: string;
  companyId: string;
  companyName: string;
  address: string;
  contactName: string;
  contactPhone: string;
  defaultCarrier?: string;
  active: boolean;
  createdAt: string;
}

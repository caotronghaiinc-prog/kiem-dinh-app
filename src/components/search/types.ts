export interface SearchCustomerResult {
  id: string;
  code: string;
  companyName: string;
}

export interface SearchEquipmentResult {
  id: string;
  code: string;
  name: string;
  customerCompanyName: string | null;
}

export interface SearchResults {
  customers: SearchCustomerResult[];
  customersTotal: number;
  equipment: SearchEquipmentResult[];
  equipmentTotal: number;
}

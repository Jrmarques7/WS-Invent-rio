export type CNHCategory = 'A' | 'B' | 'AB' | 'C' | 'AC' | 'AD' | 'AE' | 'D' | 'E';
export type DriverStatus = 'ACTIVE' | 'INACTIVE';

export const CNH_CATEGORY_LABELS: CNHCategory[] = ['A', 'B', 'AB', 'C', 'AC', 'AD', 'AE', 'D', 'E'];

export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
};

export interface Driver {
  id: string;
  name: string;
  cpf: string;
  cnh: string;
  cnh_category: CNHCategory;
  cnh_expiry: string | null;
  phone: string;
  email: string;
  status: DriverStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDriverInput {
  name: string;
  cpf: string;
  cnh: string;
  cnh_category: CNHCategory | '';
  cnh_expiry: string | null;
  phone: string;
  email: string;
  notes: string;
}

export interface UpdateDriverInput extends CreateDriverInput {
  status: DriverStatus;
}

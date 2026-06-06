export type AssetType = 'MOVEL' | 'IMOVEL' | 'CONSUMIVEL';
export type AssetStatus = 'ACTIVE' | 'INACTIVE' | 'UNDER_MAINTENANCE' | 'WRITTEN_OFF';
export type AssetCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
export type TransferPolicy = 'DIRECT' | 'DIRECT_NOTIFY' | 'REQUIRES_APPROVAL';

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  MOVEL: 'Bens',
  IMOVEL: 'Imóvel',
  CONSUMIVEL: 'Consumível',
};

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  UNDER_MAINTENANCE: 'Em Manutenção',
  WRITTEN_OFF: 'Baixado',
};

export const CONDITION_LABELS: Record<AssetCondition, string> = {
  EXCELLENT: 'Ótimo',
  GOOD: 'Bom',
  FAIR: 'Regular',
  POOR: 'Ruim',
};

export const TRANSFER_POLICY_LABELS: Record<TransferPolicy, string> = {
  DIRECT: 'Direta',
  DIRECT_NOTIFY: 'Direta com ciência ao gestor',
  REQUIRES_APPROVAL: 'Somente com permissão do gestor',
};

export interface Category {
  id: string;
  name: string;
  description: string;
  asset_type: AssetType;
  useful_life_years: number;
  depreciation_rate: number;
  depreciation_method: string;
  is_active: boolean;
}

export interface Location {
  id: string;
  name: string;
  code: string;
  type: string;
  address: string;
  parent_id: string | null;
  is_active: boolean;
}

export interface Asset {
  id: string;
  patrimony_number: string;
  name: string;
  description: string;
  category: Category | null;
  category_id: string | null;
  department: import('./departments').Department | null;
  department_id: string | null;
  asset_type: AssetType;
  brand: string;
  model: string;
  serial_number: string;
  acquisition_date: string | null;
  acquisition_value: number;
  current_value: number;
  useful_life_years: number;
  condition: AssetCondition;
  location: Location | null;
  status: AssetStatus;
  transfer_policy: TransferPolicy;
  photo: string;
  notes: string;
  write_off_date: string | null;
  write_off_reason: string;
  created_at: string;
  updated_at: string;
}

export interface Custody {
  id: string;
  asset: Asset;
  user: import('./auth').User;
  assigned_by_user: import('./auth').User;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  notes: string;
}

export interface Movement {
  id: string;
  asset: Asset;
  type: string;
  from_user: import('./auth').User | null;
  to_user: import('./auth').User | null;
  from_location: Location | null;
  to_location: Location | null;
  date: string;
  reason: string;
  performed_by: import('./auth').User;
  notes: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

import { AssetType } from './assets';

export type DepreciationMethod = 'LINEAR' | 'DECLINING_BALANCE';

export const DEPRECIATION_METHOD_LABELS: Record<DepreciationMethod, string> = {
  LINEAR: 'Linear',
  DECLINING_BALANCE: 'Saldo Decrescente',
};

export interface Category {
  id: string;
  name: string;
  description: string;
  asset_type: AssetType;
  useful_life_years: number;
  depreciation_rate: number;
  depreciation_method: DepreciationMethod;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
  asset_type: AssetType;
  useful_life_years?: number;
  depreciation_rate?: number;
  depreciation_method?: DepreciationMethod;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  useful_life_years?: number;
  depreciation_rate?: number;
  depreciation_method?: DepreciationMethod;
  is_active?: boolean;
}

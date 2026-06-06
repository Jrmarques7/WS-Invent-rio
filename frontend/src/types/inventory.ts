import { Asset, AssetCondition } from './assets';
import { Location } from './locations';
import { User } from './auth';

export type InventoryStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export const INVENTORY_STATUS_LABELS: Record<InventoryStatus, string> = {
  DRAFT: 'Rascunho',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

export interface InventoryProcess {
  id: string;
  name: string;
  year: number;
  status: InventoryStatus;
  start_date: string | null;
  end_date: string | null;
  responsible: User | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  inventory_id: string;
  inventory?: InventoryProcess;
  asset: Asset;
  expected_user: User | null;
  expected_location: Location | null;
  found: boolean | null;
  actual_condition: AssetCondition | null;
  actual_location: Location | null;
  notes: string;
  verified_by: User | null;
  verified_at: string | null;
  created_at: string;
}

export interface CreateInventoryInput {
  name: string;
  year: number;
  notes?: string;
}

export interface AddInventoryItemsInput {
  asset_ids: string[];
}

export interface VerifyItemInput {
  asset_id: string;
  found: boolean;
  actual_condition?: AssetCondition;
  actual_location_id?: string;
  notes?: string;
}

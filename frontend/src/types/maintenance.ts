import { Asset } from './assets';
import { User } from './auth';

export type MaintenanceType = 'PREVENTIVE' | 'CORRECTIVE';
export type MaintenanceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  PREVENTIVE: 'Preventiva',
  CORRECTIVE: 'Corretiva',
};

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  SCHEDULED: 'Agendada',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

export interface Maintenance {
  id: string;
  asset: Asset;
  type: MaintenanceType;
  description: string;
  provider: string;
  cost: number;
  scheduled_date: string | null;
  start_date: string | null;
  completion_date: string | null;
  status: MaintenanceStatus;
  notes: string;
  registered_by: User;
  created_at: string;
  updated_at: string;
}

export interface CreateMaintenanceInput {
  asset_id: string;
  type: MaintenanceType;
  description: string;
  provider?: string;
  cost?: number;
  scheduled_date?: string;
  notes?: string;
}

export interface UpdateMaintenanceStatusInput {
  status: MaintenanceStatus;
  start_date?: string;
  notes?: string;
}

export interface CompleteMaintenanceInput {
  completion_date: string;
  cost?: number;
  notes?: string;
}

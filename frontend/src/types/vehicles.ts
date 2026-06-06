import { AssetCondition, AssetStatus, CONDITION_LABELS, ASSET_STATUS_LABELS } from './assets';
import { Location } from './locations';
import { User } from './auth';
import { Department } from './departments';
import { Driver } from './drivers';

export type FuelType = 'GASOLINA' | 'DIESEL' | 'ETANOL' | 'HIBRIDO' | 'ELETRICO' | 'GNV';

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  GASOLINA: 'Gasolina',
  DIESEL: 'Diesel',
  ETANOL: 'Etanol',
  HIBRIDO: 'Híbrido',
  ELETRICO: 'Elétrico',
  GNV: 'GNV',
};

export interface Vehicle {
  id: string;
  patrimony_number: string;
  name: string;
  brand: string;
  model: string;
  manufacture_year: number;
  plate: string;
  renavam: string;
  chassis: string;
  engine_number: string;
  fuel_type: FuelType;
  color: string;
  acquisition_date: string | null;
  acquisition_value: number;
  current_value: number;
  condition: AssetCondition;
  status: AssetStatus;
  location: Location | null;
  location_id: string | null;
  department: Department | null;
  department_id: string | null;
  primary_driver: Driver | null;
  primary_driver_id: string | null;
  current_km: number;
  notes: string;
  ipva_due_date: string | null;
  licensing_due_date: string | null;
  insurance_due_date: string | null;
  insurance_company: string;
  write_off_date: string | null;
  write_off_reason: string;
  created_at: string;
  updated_at: string;
}

export interface KmRecord {
  id: string;
  vehicle_id: string;
  km: number;
  recorded_at: string;
  notes: string;
  recorded_by: User | null;
}

export interface VehicleMaintenance {
  id: string;
  vehicle_id: string;
  description: string;
  interval_km: number;
  last_done_km: number;
  next_due_km: number;
  last_done_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface FuelRecord {
  id: string;
  vehicle_id: string;
  km: number;
  liters: number;
  price_per_l: number;
  total_cost: number;
  station: string;
  fuel_type: FuelType;
  full_tank: boolean;
  recorded_at: string;
  recorded_by: User | null;
}

export { CONDITION_LABELS, ASSET_STATUS_LABELS };

export interface CreateVehicleInput {
  name: string;
  brand?: string;
  model?: string;
  manufacture_year?: number;
  plate?: string;
  renavam?: string;
  chassis?: string;
  engine_number?: string;
  fuel_type?: FuelType;
  color?: string;
  acquisition_date?: string;
  acquisition_value?: number;
  condition?: AssetCondition;
  location_id?: string;
  department_id?: string;
  primary_driver_id?: string;
  current_km?: number;
  notes?: string;
  ipva_due_date?: string;
  licensing_due_date?: string;
  insurance_due_date?: string;
  insurance_company?: string;
}

export interface UpdateVehicleInput {
  name?: string;
  brand?: string;
  model?: string;
  manufacture_year?: number;
  plate?: string;
  renavam?: string;
  chassis?: string;
  engine_number?: string;
  fuel_type?: FuelType;
  color?: string;
  condition?: AssetCondition;
  status?: AssetStatus;
  location_id?: string;
  department_id?: string | null;
  primary_driver_id?: string | null;
  notes?: string;
  ipva_due_date?: string | null;
  licensing_due_date?: string | null;
  insurance_due_date?: string | null;
  insurance_company?: string;
}

import api from '../client';
import { Asset, PaginatedResponse, Custody, Movement } from '@/types/assets';
import { DepreciationRecord } from '@/types/depreciation';

export interface AssetFilters {
  page?: number;
  limit?: number;
  search?: string;
  asset_type?: string;
  status?: string;
  category_id?: string;
  location_id?: string;
}

export interface CreateAssetInput {
  name: string;
  description?: string;
  category_id?: string;
  asset_type: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  acquisition_date?: string;
  acquisition_value?: number;
  useful_life_years?: number;
  condition?: string;
  location_id?: string;
  department_id?: string;
  transfer_policy?: string;
  notes?: string;
}

export interface UpdateAssetInput {
  name?: string;
  description?: string;
  category_id?: string;
  department_id?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  useful_life_years?: number;
  condition?: string;
  location_id?: string;
  status?: string;
  transfer_policy?: string;
  notes?: string;
}

export interface WriteOffInput {
  date: string;
  reason: string;
}

export const assetsApi = {
  // server: { data: [...], meta: {...} }
  list: (params?: AssetFilters) =>
    api.get<PaginatedResponse<Asset>>('/assets', { params }),

  // server: { data: {...} }
  get: (id: string) =>
    api.get<{ data: Asset }>(`/assets/${id}`),

  create: (data: CreateAssetInput) =>
    api.post<{ data: Asset }>('/assets', data),

  update: (id: string, data: UpdateAssetInput) =>
    api.put<{ data: Asset }>(`/assets/${id}`, data),

  writeOff: (id: string, data: WriteOffInput) =>
    api.post(`/assets/${id}/write-off`, data),

  delete: (id: string) =>
    api.delete(`/assets/${id}`),

  getCustody: (id: string) =>
    api.get<{ data: Custody }>(`/assets/${id}/custody`),

  getHistory: (id: string) =>
    api.get<{ data: Movement[] }>(`/assets/${id}/history`),

  getDepreciation: (id: string) =>
    api.get<{ data: DepreciationRecord[] }>(`/assets/${id}/depreciation`),

  nextNumber: (type: string) =>
    api.get<{ data: { number: string } }>('/assets/next-number', { params: { type } }),
};

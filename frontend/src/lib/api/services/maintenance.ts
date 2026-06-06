import api from '../client';
import {
  Maintenance,
  CreateMaintenanceInput,
  UpdateMaintenanceStatusInput,
  CompleteMaintenanceInput,
} from '@/types/maintenance';
import { PaginatedResponse } from '@/types/assets';

export const maintenanceApi = {
  list: (params?: { page?: number; limit?: number; asset_id?: string; status?: string }) =>
    api.get<PaginatedResponse<Maintenance>>('/maintenance', { params }),

  get: (id: string) =>
    api.get<{ data: Maintenance }>(`/maintenance/${id}`),

  create: (data: CreateMaintenanceInput) =>
    api.post<{ data: Maintenance }>('/maintenance', data),

  updateStatus: (id: string, data: UpdateMaintenanceStatusInput) =>
    api.patch<{ data: Maintenance }>(`/maintenance/${id}/status`, data),

  complete: (id: string, data: CompleteMaintenanceInput) =>
    api.post<{ data: Maintenance }>(`/maintenance/${id}/complete`, data),
};

import api from '../client';
import { Driver, CreateDriverInput, UpdateDriverInput, DriverStatus } from '@/types/drivers';

export const driversApi = {
  list: (params?: { search?: string; status?: DriverStatus }) =>
    api.get<{ data: Driver[] }>('/drivers', { params }),
  get: (id: string) => api.get<{ data: Driver }>(`/drivers/${id}`),
  create: (data: CreateDriverInput) => api.post<{ data: Driver }>('/drivers', data),
  update: (id: string, data: UpdateDriverInput) => api.put<{ data: Driver }>(`/drivers/${id}`, data),
  delete: (id: string) => api.delete(`/drivers/${id}`),
};

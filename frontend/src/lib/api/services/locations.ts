import api from '../client';
import { Location, CreateLocationInput, UpdateLocationInput } from '@/types/locations';

export const locationsApi = {
  list: (params?: { search?: string }) =>
    api.get<{ data: Location[] }>('/locations', { params }),

  get: (id: string) =>
    api.get<{ data: Location }>(`/locations/${id}`),

  create: (data: CreateLocationInput) =>
    api.post<{ data: Location }>('/locations', data),

  update: (id: string, data: UpdateLocationInput) =>
    api.put<{ data: Location }>(`/locations/${id}`, data),

  delete: (id: string) =>
    api.delete(`/locations/${id}`),
};

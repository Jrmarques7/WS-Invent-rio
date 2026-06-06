import api from '../client';
import { Department, CreateDepartmentInput } from '@/types/departments';

export const departmentsApi = {
  list: () => api.get<{ data: Department[] }>('/departments'),
  get: (id: string) => api.get<{ data: Department }>(`/departments/${id}`),
  create: (data: CreateDepartmentInput) => api.post<{ data: Department }>('/departments', data),
  update: (id: string, data: CreateDepartmentInput) => api.put<{ data: Department }>(`/departments/${id}`, data),
  delete: (id: string) => api.delete(`/departments/${id}`),
};

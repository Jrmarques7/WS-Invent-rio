import api from '../client';
import { User, UserRole } from '@/types/auth';
import { PaginatedResponse, Custody } from '@/types/assets';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  registration?: string;
  department?: string;
  department_id?: string;
  role?: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  registration?: string;
  department?: string;
  department_id?: string;
  role?: UserRole;
  is_active?: boolean;
}

export const usersApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<PaginatedResponse<User>>('/users', { params }),

  get: (id: string) =>
    api.get<{ data: User }>(`/users/${id}`),

  me: () =>
    api.get<{ data: User }>('/users/me'),

  create: (data: CreateUserInput) =>
    api.post<{ data: User }>('/users', data),

  update: (id: string, data: UpdateUserInput) =>
    api.put<{ data: User }>(`/users/${id}`, data),

  delete: (id: string) =>
    api.delete(`/users/${id}`),

  changePassword: (data: { current: string; new: string }) =>
    api.post('/users/change-password', data),

  getCarga: (id: string) =>
    api.get<{ data: Custody[] }>(`/users/${id}/carga`),
};

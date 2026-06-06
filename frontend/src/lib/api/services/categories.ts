import api from '../client';
import { Category, CreateCategoryInput, UpdateCategoryInput } from '@/types/categories';
import { AssetType } from '@/types/assets';

export const categoriesApi = {
  list: (params?: { asset_type?: AssetType; search?: string }) =>
    api.get<{ data: Category[] }>('/categories', { params }),

  get: (id: string) =>
    api.get<{ data: Category }>(`/categories/${id}`),

  create: (data: CreateCategoryInput) =>
    api.post<{ data: Category }>('/categories', data),

  update: (id: string, data: UpdateCategoryInput) =>
    api.put<{ data: Category }>(`/categories/${id}`, data),

  delete: (id: string) =>
    api.delete(`/categories/${id}`),
};

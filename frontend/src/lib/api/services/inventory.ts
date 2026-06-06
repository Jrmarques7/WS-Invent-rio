import api from '../client';
import {
  InventoryProcess,
  InventoryItem,
  CreateInventoryInput,
  VerifyItemInput,
} from '@/types/inventory';
import { PaginatedResponse } from '@/types/assets';


export const inventoryApi = {
  list: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<InventoryProcess>>('/inventory', { params }),

  get: (id: string) =>
    api.get<{ data: InventoryProcess }>(`/inventory/${id}`),

  create: (data: CreateInventoryInput) =>
    api.post<{ data: InventoryProcess }>('/inventory', data),

  start: (id: string) =>
    api.post(`/inventory/${id}/start`),

  complete: (id: string) =>
    api.post(`/inventory/${id}/complete`),

  cancel: (id: string) =>
    api.post(`/inventory/${id}/cancel`),

  getItems: (id: string) =>
    api.get<{ data: InventoryItem[] }>(`/inventory/${id}/items`),

  addItems: (id: string, assetIds: string[]) =>
    api.post(`/inventory/${id}/items`, { asset_ids: assetIds }),

  removeItem: (id: string, assetId: string) =>
    api.delete(`/inventory/${id}/items/${assetId}`),

  verifyItem: (id: string, data: VerifyItemInput) =>
    api.post(`/inventory/${id}/verify`, data),
};

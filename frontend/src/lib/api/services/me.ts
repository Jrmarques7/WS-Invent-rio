import api from '../client';
import { Custody, PaginatedResponse } from '@/types/assets';
import { InventoryItem, VerifyItemInput } from '@/types/inventory';
import { CreateMaintenanceInput, Maintenance } from '@/types/maintenance';
import { TransferRequest } from '@/types/transfers';
import { User } from '@/types/auth';

export const meApi = {
  custody: () =>
    api.get<{ data: Custody[] }>('/me/custody'),

  inventory: () =>
    api.get<{ data: InventoryItem[] }>('/me/inventory'),

  verifyInventory: (inventoryId: string, data: VerifyItemInput) =>
    api.post(`/me/inventory/${inventoryId}/verify`, data),

  createMaintenance: (assetId: string, data: Omit<CreateMaintenanceInput, 'asset_id'>) =>
    api.post<{ data: Maintenance }>(`/me/assets/${assetId}/maintenance`, data),

  transferTargets: () =>
    api.get<{ data: User[] }>('/me/transfer-targets'),

  transfers: () =>
    api.get<PaginatedResponse<TransferRequest>>('/me/transfers'),

  requestTransfer: (data: { asset_id: string; to_user_id: string; reason?: string }) =>
    api.post<{ data: TransferRequest }>('/me/transfers', data),

  acceptTransfer: (id: string, notes?: string) =>
    api.post<{ data: TransferRequest }>(`/me/transfers/${id}/accept`, { notes }),

  declineTransfer: (id: string, notes?: string) =>
    api.post<{ data: TransferRequest }>(`/me/transfers/${id}/decline`, { notes }),
};

import api from '../client';
import { Custody, PaginatedResponse } from '@/types/assets';

export interface AssignCustodyInput {
  asset_id: string;
  user_id: string;
  start_date: string;
  notes?: string;
}

export const custodyApi = {
  list: (params?: { page?: number; limit?: number; user_id?: string; asset_id?: string }) =>
    api.get<PaginatedResponse<Custody>>('/custody', { params }),

  assign: (data: AssignCustodyInput) =>
    api.post<{ data: Custody }>('/custody', data),

  release: (assetId: string, notes?: string) =>
    api.delete(`/custody/assets/${assetId}`, { data: { notes } }),
};

import api from '../client';
import { Movement, PaginatedResponse } from '@/types/assets';

export interface RegisterMovementInput {
  asset_id: string;
  type: string;
  from_user_id?: string;
  to_user_id?: string;
  from_location_id?: string;
  to_location_id?: string;
  date: string;
  reason?: string;
  notes?: string;
}

export const movementsApi = {
  list: (params?: { page?: number; limit?: number; asset_id?: string }) =>
    api.get<PaginatedResponse<Movement>>('/movements', { params }),

  register: (data: RegisterMovementInput) =>
    api.post<{ data: Movement }>('/movements', {
      ...data,
      date: data.date.length === 10 ? `${data.date}T12:00:00Z` : data.date,
    }),
};

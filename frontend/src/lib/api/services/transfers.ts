import api from '../client';
import { PaginatedResponse } from '@/types/assets';
import { TransferRequest, TransferRequestStatus } from '@/types/transfers';

export const transfersApi = {
  list: (params?: { page?: number; limit?: number; status?: TransferRequestStatus | '' }) =>
    api.get<PaginatedResponse<TransferRequest>>('/transfer-requests', { params }),

  approve: (id: string, notes?: string) =>
    api.post<{ data: TransferRequest }>(`/transfer-requests/${id}/approve`, { notes }),

  reject: (id: string, notes?: string) =>
    api.post<{ data: TransferRequest }>(`/transfer-requests/${id}/reject`, { notes }),
};

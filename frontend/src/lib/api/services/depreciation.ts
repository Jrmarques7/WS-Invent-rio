import api from '../client';
import { DepreciationRecord } from '@/types/depreciation';

export const depreciationApi = {
  getPeriod: (params: { year: number; month: number }) =>
    api.get<{ data: DepreciationRecord[] }>('/depreciation', { params }),

  calculate: (params: { year: number; month: number }) =>
    api.post<{ data: { message: string } }>('/depreciation/calculate', null, { params }),

  getAssetHistory: (assetId: string) =>
    api.get<{ data: DepreciationRecord[] }>(`/assets/${assetId}/depreciation`),
};

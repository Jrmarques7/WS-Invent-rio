import { Asset } from './assets';
import { DepreciationMethod } from './categories';

export interface DepreciationRecord {
  id: string;
  asset: Asset;
  year: number;
  month: number;
  opening_value: number;
  depreciation_amount: number;
  closing_value: number;
  rate: number;
  method: DepreciationMethod;
  created_at: string;
}

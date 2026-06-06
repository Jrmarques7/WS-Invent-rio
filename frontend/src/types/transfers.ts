import { Asset, TransferPolicy } from './assets';
import { User } from './auth';

export type TransferRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'PENDING_MANAGER_APPROVAL'
  | 'PENDING_RECIPIENT_ACCEPTANCE'
  | 'REJECTED'
  | 'EXECUTED';

export const TRANSFER_STATUS_LABELS: Record<TransferRequestStatus, string> = {
  PENDING: 'Aguardando gestor',
  APPROVED: 'Aguardando aceite',
  PENDING_MANAGER_APPROVAL: 'Aguardando gestor',
  PENDING_RECIPIENT_ACCEPTANCE: 'Aguardando aceite',
  REJECTED: 'Rejeitada',
  EXECUTED: 'Executada',
};

export interface TransferRequest {
  id: string;
  asset_id: string;
  asset: Asset | null;
  from_user_id: string;
  from_user: User | null;
  to_user_id: string;
  to_user: User | null;
  policy: TransferPolicy;
  status: TransferRequestStatus;
  reason: string;
  requested_at: string;
  reviewed_by_id: string | null;
  reviewed_by: User | null;
  reviewed_at: string | null;
  review_notes: string;
  recipient_at: string | null;
  recipient_notes: string;
  gestor_notified: boolean;
}

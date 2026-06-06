'use client';

import { useCallback, useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { usePermissions } from '@/hooks/usePermissions';
import { meApi } from '@/lib/api/services/me';
import { transfersApi } from '@/lib/api/services/transfers';
import { TransferRequest, TransferRequestStatus, TRANSFER_STATUS_LABELS } from '@/types/transfers';
import { TRANSFER_POLICY_LABELS } from '@/types/assets';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const managerPendingStatuses: TransferRequestStatus[] = ['PENDING', 'PENDING_MANAGER_APPROVAL'];
const recipientPendingStatuses: TransferRequestStatus[] = ['PENDING_RECIPIENT_ACCEPTANCE', 'APPROVED'];

export default function TransferRequestsPage() {
  const { user } = usePermissions();
  const [items, setItems] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<TransferRequestStatus | ''>('');
  const [reviewTarget, setReviewTarget] = useState<TransferRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [recipientTarget, setRecipientTarget] = useState<TransferRequest | null>(null);
  const [recipientAction, setRecipientAction] = useState<'accept' | 'decline'>('accept');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await transfersApi.list({ limit: 100, status });
      setItems(res.data.data);
    } catch {
      toast.error('Erro ao carregar transferências');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  function openReview(item: TransferRequest, action: 'approve' | 'reject') {
    setReviewTarget(item);
    setReviewAction(action);
    setNotes('');
  }

  function openRecipientResponse(item: TransferRequest, action: 'accept' | 'decline') {
    setRecipientTarget(item);
    setRecipientAction(action);
    setNotes('');
  }

  async function submitReview() {
    if (!reviewTarget) return;
    setSaving(true);
    try {
      if (reviewAction === 'approve') {
        await transfersApi.approve(reviewTarget.id, notes);
        toast.success('Transferência aprovada');
      } else {
        await transfersApi.reject(reviewTarget.id, notes);
        toast.success('Transferência rejeitada');
      }
      setReviewTarget(null);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao revisar transferência');
    } finally {
      setSaving(false);
    }
  }

  async function submitRecipientResponse() {
    if (!recipientTarget) return;
    setSaving(true);
    try {
      if (recipientAction === 'accept') {
        await meApi.acceptTransfer(recipientTarget.id, notes);
        toast.success('Transferência aceita');
      } else {
        await meApi.declineTransfer(recipientTarget.id, notes);
        toast.success('Transferência recusada');
      }
      setRecipientTarget(null);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao responder transferência');
    } finally {
      setSaving(false);
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transferências</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Solicitações e transferências de carga patrimonial</p>
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value as TransferRequestStatus | '')} className={inputCls}>
            <option value="">Todos os status</option>
            {(Object.entries(TRANSFER_STATUS_LABELS) as [TransferRequestStatus, string][]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                {['Data', 'Bem', 'Origem', 'Destino', 'Política', 'Status', 'Motivo', ''].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 8 }).map((__, j) => <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>)}</tr>
                ))
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-16 text-center text-gray-500 dark:text-gray-400">Nenhuma transferência encontrada</td></tr>
              ) : items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{new Date(item.requested_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{item.asset?.name}</div>
                    <div className="text-xs font-mono text-gray-500">{item.asset?.patrimony_number}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{item.from_user?.name || '—'}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{item.to_user?.name || '—'}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-xs">{TRANSFER_POLICY_LABELS[item.policy]}</td>
                  <td className="px-6 py-4"><StatusBadge value={item.status} label={TRANSFER_STATUS_LABELS[item.status]} /></td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400 max-w-xs truncate">{item.reason || '—'}</td>
                  <td className="px-6 py-4 text-right">
                    {managerPendingStatuses.includes(item.status) && (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openReview(item, 'approve')} className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 hover:underline">
                          <CheckCircleIcon className="w-4 h-4" /> Aprovar
                        </button>
                        <button onClick={() => openReview(item, 'reject')} className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:underline">
                          <XCircleIcon className="w-4 h-4" /> Rejeitar
                        </button>
                      </div>
                    )}
                    {user?.id === item.to_user_id && recipientPendingStatuses.includes(item.status) && (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openRecipientResponse(item, 'accept')} className="text-xs font-medium text-green-600 dark:text-green-400 hover:underline">Aceitar</button>
                        <button onClick={() => openRecipientResponse(item, 'decline')} className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline">Recusar</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!reviewTarget} onClose={() => setReviewTarget(null)} title={reviewAction === 'approve' ? 'Aprovar transferência' : 'Rejeitar transferência'}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {reviewTarget?.asset?.name} de {reviewTarget?.from_user?.name} para {reviewTarget?.to_user?.name}
          </p>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações da revisão" rows={4} className={inputCls} />
          <div className="flex justify-end gap-3">
            <button onClick={() => setReviewTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
            <button onClick={submitReview} disabled={saving} className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
              {saving ? 'Salvando...' : reviewAction === 'approve' ? 'Aprovar' : 'Rejeitar'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!recipientTarget} onClose={() => setRecipientTarget(null)} title={recipientAction === 'accept' ? 'Aceitar transferência' : 'Recusar transferência'}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {recipientTarget?.asset?.name} de {recipientTarget?.from_user?.name} para você
          </p>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações" rows={4} className={inputCls} />
          <div className="flex justify-end gap-3">
            <button onClick={() => setRecipientTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
            <button onClick={submitRecipientResponse} disabled={saving} className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${recipientAction === 'accept' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
              {saving ? 'Salvando...' : recipientAction === 'accept' ? 'Aceitar' : 'Recusar'}
            </button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}

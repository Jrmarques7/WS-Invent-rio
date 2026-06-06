'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { usePermissions } from '@/hooks/usePermissions';
import { meApi } from '@/lib/api/services/me';
import { Custody, ASSET_STATUS_LABELS, CONDITION_LABELS } from '@/types/assets';
import { CreateMaintenanceInput } from '@/types/maintenance';
import { User } from '@/types/auth';
import { TransferRequest, TRANSFER_STATUS_LABELS } from '@/types/transfers';
import { TRANSFER_POLICY_LABELS } from '@/types/assets';
import { ArchiveBoxIcon, ArrowsRightLeftIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const recipientPendingStatuses = ['PENDING_RECIPIENT_ACCEPTANCE', 'APPROVED'];

export default function MyCustodyPage() {
  const { user } = usePermissions();
  const [items, setItems] = useState<Custody[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<Custody | null>(null);
  const [transferTarget, setTransferTarget] = useState<Custody | null>(null);
  const [recipientTarget, setRecipientTarget] = useState<TransferRequest | null>(null);
  const [recipientAction, setRecipientAction] = useState<'accept' | 'decline'>('accept');
  const [targets, setTargets] = useState<User[]>([]);
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [saving, setSaving] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [responding, setResponding] = useState(false);
  const [form, setForm] = useState<Omit<CreateMaintenanceInput, 'asset_id'>>({
    type: 'CORRECTIVE',
    description: '',
    notes: '',
  });
  const [transferForm, setTransferForm] = useState({ to_user_id: '', reason: '' });
  const [recipientNotes, setRecipientNotes] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await meApi.custody();
      setItems(res.data.data);
      const [targetsRes, transfersRes] = await Promise.all([
        meApi.transferTargets(),
        meApi.transfers(),
      ]);
      setTargets(targetsRes.data.data);
      setTransfers(transfersRes.data.data);
    } catch {
      toast.error('Erro ao carregar sua carga');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openMaintenance(item: Custody) {
    setTarget(item);
    setForm({ type: 'CORRECTIVE', description: '', notes: '' });
  }

  async function submitMaintenance() {
    if (!target || !form.description.trim()) {
      toast.error('Descrição é obrigatória');
      return;
    }
    setSaving(true);
    try {
      await meApi.createMaintenance(target.asset.id, form);
      toast.success('Solicitação registrada');
      setTarget(null);
    } catch {
      toast.error('Erro ao registrar solicitação');
    } finally {
      setSaving(false);
    }
  }

  function openTransfer(item: Custody) {
    setTransferTarget(item);
    setTransferForm({ to_user_id: '', reason: '' });
  }

  async function submitTransfer() {
    if (!transferTarget || !transferForm.to_user_id) {
      toast.error('Usuário destino é obrigatório');
      return;
    }
    setTransferring(true);
    try {
      const res = await meApi.requestTransfer({
        asset_id: transferTarget.asset.id,
        to_user_id: transferForm.to_user_id,
        reason: transferForm.reason,
      });
      const status = res.data.data.status;
      toast.success(
        status === 'PENDING_MANAGER_APPROVAL' || status === 'PENDING'
          ? 'Solicitação enviada para aprovação'
          : 'Transferência enviada para aceite do destinatário'
      );
      setTransferTarget(null);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao solicitar transferência');
    } finally {
      setTransferring(false);
    }
  }

  function openRecipientResponse(item: TransferRequest, action: 'accept' | 'decline') {
    setRecipientTarget(item);
    setRecipientAction(action);
    setRecipientNotes('');
  }

  async function submitRecipientResponse() {
    if (!recipientTarget) return;
    setResponding(true);
    try {
      if (recipientAction === 'accept') {
        await meApi.acceptTransfer(recipientTarget.id, recipientNotes);
        toast.success('Transferência aceita');
      } else {
        await meApi.declineTransfer(recipientTarget.id, recipientNotes);
        toast.success('Transferência recusada');
      }
      setRecipientTarget(null);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao responder transferência');
    } finally {
      setResponding(false);
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Minha Carga</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Bens atualmente sob sua responsabilidade</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                {['Patrimônio', 'Bem', 'Localização', 'Condição', 'Status', 'Transferência', 'Recebido em', ''].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((__, j) => <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>)}</tr>
                ))
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <ArchiveBoxIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                    <p className="font-medium text-gray-500 dark:text-gray-400">Nenhum bem sob sua responsabilidade</p>
                  </div>
                </td></tr>
              ) : items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-6 py-4 font-mono text-xs text-gray-500 dark:text-gray-400">{item.asset?.patrimony_number}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{item.asset?.name}</div>
                    <div className="text-xs text-gray-500">{[item.asset?.brand, item.asset?.model].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{item.asset?.location?.name || '—'}</td>
                  <td className="px-6 py-4"><StatusBadge value={item.asset?.condition} label={CONDITION_LABELS[item.asset?.condition] ?? item.asset?.condition} /></td>
                  <td className="px-6 py-4"><StatusBadge value={item.asset?.status} label={ASSET_STATUS_LABELS[item.asset?.status] ?? item.asset?.status} /></td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-xs">{TRANSFER_POLICY_LABELS[item.asset?.transfer_policy] ?? item.asset?.transfer_policy}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{new Date(item.start_date).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => openTransfer(item)} className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                        <ArrowsRightLeftIcon className="w-4 h-4" /> Transferir
                      </button>
                      <button onClick={() => openMaintenance(item)} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                        <WrenchScrewdriverIcon className="w-4 h-4" /> Manutenção
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!target} onClose={() => setTarget(null)} title="Solicitar Manutenção">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Bem</p>
            <p className="font-medium text-gray-900 dark:text-white">{target?.asset?.name}</p>
          </div>
          <select value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value as 'PREVENTIVE' | 'CORRECTIVE' }))} className={inputCls}>
            <option value="CORRECTIVE">Corretiva</option>
            <option value="PREVENTIVE">Preventiva</option>
          </select>
          <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descreva o problema ou necessidade..." rows={4} className={inputCls} />
          <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observações adicionais" rows={3} className={inputCls} />
          <div className="flex justify-end gap-3">
            <button onClick={() => setTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
            <button onClick={submitMaintenance} disabled={saving} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">{saving ? 'Enviando...' : 'Enviar'}</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!transferTarget} onClose={() => setTransferTarget(null)} title="Transferir Carga">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Bem</p>
            <p className="font-medium text-gray-900 dark:text-white">{transferTarget?.asset?.name}</p>
            <p className="text-xs text-gray-500 mt-1">Política: {transferTarget?.asset ? TRANSFER_POLICY_LABELS[transferTarget.asset.transfer_policy] : ''}</p>
          </div>
          <select value={transferForm.to_user_id} onChange={(e) => setTransferForm(f => ({ ...f, to_user_id: e.target.value }))} className={inputCls}>
            <option value="">Selecione o usuário destino</option>
            {targets.map((user) => <option key={user.id} value={user.id}>{user.name} ({user.email})</option>)}
          </select>
          <textarea value={transferForm.reason} onChange={(e) => setTransferForm(f => ({ ...f, reason: e.target.value }))} placeholder="Motivo da transferência" rows={3} className={inputCls} />
          <div className="flex justify-end gap-3">
            <button onClick={() => setTransferTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
            <button onClick={submitTransfer} disabled={transferring} className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50">{transferring ? 'Enviando...' : 'Confirmar'}</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!recipientTarget} onClose={() => setRecipientTarget(null)} title={recipientAction === 'accept' ? 'Aceitar transferência' : 'Recusar transferência'}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {recipientTarget?.asset?.name} de {recipientTarget?.from_user?.name} para você
          </p>
          <textarea value={recipientNotes} onChange={(e) => setRecipientNotes(e.target.value)} placeholder="Observações" rows={4} className={inputCls} />
          <div className="flex justify-end gap-3">
            <button onClick={() => setRecipientTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
            <button onClick={submitRecipientResponse} disabled={responding} className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${recipientAction === 'accept' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
              {responding ? 'Salvando...' : recipientAction === 'accept' ? 'Aceitar' : 'Recusar'}
            </button>
          </div>
        </div>
      </Modal>

      {transfers.length > 0 && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Minhas transferências</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                {['Data', 'Bem', 'Origem', 'Destino', 'Status', 'Motivo', ''].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {transfers.slice(0, 8).map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{new Date(item.requested_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{item.asset?.name}</div>
                    <div className="text-xs font-mono text-gray-500">{item.asset?.patrimony_number}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{item.from_user?.name || '—'}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{item.to_user?.name || '—'}</td>
                  <td className="px-6 py-4"><StatusBadge value={item.status} label={TRANSFER_STATUS_LABELS[item.status]} /></td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400 max-w-xs truncate">{item.reason || '—'}</td>
                  <td className="px-6 py-4 text-right">
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
      )}
    </MainLayout>
  );
}

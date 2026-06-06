'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingTable } from '@/components/ui/LoadingTable';
import { Pagination } from '@/components/ui/Pagination';
import { usePermissions } from '@/hooks/usePermissions';
import { movementsApi, RegisterMovementInput } from '@/lib/api/services/movements';
import { assetsApi } from '@/lib/api/services/assets';
import { usersApi } from '@/lib/api/services/users';
import { locationsApi } from '@/lib/api/services/locations';
import { Movement } from '@/types/assets';
import { Asset } from '@/types/assets';
import { User } from '@/types/auth';
import { Location } from '@/types/locations';
import { PlusIcon, MagnifyingGlassIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const TYPE_LABELS: Record<string, string> = {
  TRANSFER: 'Transferência',
  LOAN: 'Empréstimo',
  RETURN: 'Devolução',
  RELOCATION: 'Realocação',
  WRITE_OFF: 'Baixa',
  MAINT_START: 'Início de manutenção',
  MAINT_DONE: 'Conclusão de manutenção',
  INVENTORY_DIFF: 'Divergência de inventário',
};

const MANUAL_TYPE_LABELS: Record<string, string> = {
  TRANSFER: 'Transferência', LOAN: 'Empréstimo', RETURN: 'Devolução', RELOCATION: 'Realocação',
};

export default function MovementsPage() {
  const { canWrite } = usePermissions();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, total_pages: 1 });
  const limit = 20;

  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<RegisterMovementInput>({
    asset_id: '', type: 'TRANSFER', date: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await movementsApi.list({ page, limit });
      setMovements(res.data.data);
      setMeta({ total: res.data.meta.total, total_pages: res.data.meta.total_pages });
    } catch {
      toast.error('Erro ao carregar movimentações');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    assetsApi.list({ limit: 1000 }).then(r => setAssets(r.data.data)).catch(() => {});
    usersApi.list({ limit: 1000 }).then(r => setUsers(r.data.data)).catch(() => {});
    locationsApi.list().then(r => setLocations(r.data.data)).catch(() => {});
  }, []);

  const filtered = typeFilter ? movements.filter(m => m.type === typeFilter) : movements;

  async function handleRegister() {
    if (!form.asset_id || !form.type || !form.date) { toast.error('Bem, tipo e data são obrigatórios'); return; }
    if (form.type === 'TRANSFER' && !form.to_user_id) { toast.error('Usuário de destino é obrigatório para transferência'); return; }
    if (form.type === 'RELOCATION' && !form.to_location_id) { toast.error('Local de destino é obrigatório para realocação'); return; }
    setSaving(true);
    try {
      await movementsApi.register(form);
      toast.success('Movimentação registrada');
      setModalOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao registrar movimentação');
    } finally {
      setSaving(false);
    }
  }

  function handleTypeChange(type: string) {
    setForm(f => ({
      asset_id: f.asset_id,
      type,
      date: f.date,
      reason: f.reason,
      notes: f.notes,
    }));
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Movimentações</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Histórico de transferências e movimentações</p>
          </div>
          {canWrite && (
            <button onClick={() => { setForm({ asset_id: '', type: 'TRANSFER', date: new Date().toISOString().split('T')[0] }); setModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
              <PlusIcon className="w-4 h-4" /> Registrar Movimentação
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Filtrar por bem..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" readOnly />
            </div>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos os tipos</option>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                {['Data', 'Bem', 'Tipo', 'De', 'Para', 'Realizado por'].map((h, i) => (
                  <th key={i} className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {loading ? (
                <LoadingTable cols={6} />
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <ArrowsRightLeftIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                    <p className="font-medium text-gray-500 dark:text-gray-400">Nenhuma movimentação registrada</p>
                  </div>
                </td></tr>
              ) : filtered.map(m => (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{new Date(m.date).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{m.asset?.name}</div>
                    <div className="text-xs font-mono text-gray-500">{m.asset?.patrimony_number}</div>
                  </td>
                  <td className="px-6 py-4"><StatusBadge value={m.type} label={TYPE_LABELS[m.type] ?? m.type} /></td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-xs">{m.from_user?.name || m.from_location?.name || '—'}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-xs">{m.to_user?.name || m.to_location?.name || '—'}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-xs">{m.performed_by?.name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={meta.total_pages} total={meta.total} limit={limit} onPageChange={setPage} />
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar Movimentação" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bem *</label>
              <select value={form.asset_id} onChange={e => setForm(f => ({ ...f, asset_id: e.target.value }))} className={inputCls}>
                <option value="">— Selecione um bem —</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.patrimony_number} · {a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo *</label>
              <select value={form.type} onChange={e => handleTypeChange(e.target.value)} className={inputCls}>
                {Object.entries(MANUAL_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
            </div>
            {(form.type === 'TRANSFER' || form.type === 'LOAN' || form.type === 'RETURN') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usuário de Origem</label>
                  <select value={form.from_user_id ?? ''} onChange={e => setForm(f => ({ ...f, from_user_id: e.target.value || undefined }))} className={inputCls}>
                    <option value="">— Atual, se houver —</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usuário de Destino{form.type === 'TRANSFER' ? ' *' : ''}</label>
                  <select value={form.to_user_id ?? ''} onChange={e => setForm(f => ({ ...f, to_user_id: e.target.value || undefined }))} className={inputCls}>
                    <option value="">— Nenhum —</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </>
            )}
            {(form.type === 'RELOCATION' || form.type === 'LOAN' || form.type === 'RETURN') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Local de Origem</label>
                  <select value={form.from_location_id ?? ''} onChange={e => setForm(f => ({ ...f, from_location_id: e.target.value || undefined }))} className={inputCls}>
                    <option value="">— Atual, se houver —</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Local de Destino{form.type === 'RELOCATION' ? ' *' : ''}</label>
                  <select value={form.to_location_id ?? ''} onChange={e => setForm(f => ({ ...f, to_location_id: e.target.value || undefined }))} className={inputCls}>
                    <option value="">— Nenhum —</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </>
            )}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motivo</label>
              <input value={form.reason ?? ''} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
              <textarea rows={2} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
          <button onClick={handleRegister} disabled={saving} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">{saving ? 'Salvando...' : 'Registrar'}</button>
        </div>
      </Modal>
    </MainLayout>
  );
}

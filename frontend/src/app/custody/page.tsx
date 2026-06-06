'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingTable } from '@/components/ui/LoadingTable';
import { Pagination } from '@/components/ui/Pagination';
import { usePermissions } from '@/hooks/usePermissions';
import { custodyApi, AssignCustodyInput } from '@/lib/api/services/custody';
import { assetsApi } from '@/lib/api/services/assets';
import { usersApi } from '@/lib/api/services/users';
import { Custody } from '@/types/assets';
import { Asset } from '@/types/assets';
import { User } from '@/types/auth';
import { PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function CustodyPage() {
  const { canWrite } = usePermissions();
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, total_pages: 1 });
  const limit = 20;

  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [assignModal, setAssignModal] = useState(false);
  const [form, setForm] = useState<AssignCustodyInput>({ asset_id: '', user_id: '', start_date: new Date().toISOString().split('T')[0], notes: '' });
  const [saving, setSaving] = useState(false);

  const [releaseTarget, setReleaseTarget] = useState<Custody | null>(null);
  const [releasing, setReleasing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await custodyApi.list({ page, limit });
      setCustodies(res.data.data);
      setMeta({ total: res.data.meta.total, total_pages: res.data.meta.total_pages });
    } catch {
      toast.error('Erro ao carregar custódias');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    assetsApi.list({ limit: 1000 }).then(r => setAssets(r.data.data)).catch(() => {});
    usersApi.list({ limit: 1000 }).then(r => setUsers(r.data.data)).catch(() => {});
  }, []);

  async function handleAssign() {
    if (!form.asset_id || !form.user_id || !form.start_date) { toast.error('Bem, usuário e data são obrigatórios'); return; }
    setSaving(true);
    try {
      await custodyApi.assign(form);
      toast.success('Custódia atribuída');
      setAssignModal(false);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao atribuir custódia');
    } finally {
      setSaving(false);
    }
  }

  async function handleRelease() {
    if (!releaseTarget) return;
    setReleasing(true);
    try {
      await custodyApi.release(releaseTarget.asset.id);
      toast.success('Custódia liberada');
      setReleaseTarget(null);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao liberar custódia');
    } finally {
      setReleasing(false);
    }
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Custódias</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Carga patrimonial por responsável</p>
          </div>
          {canWrite && (
            <button onClick={() => { setForm({ asset_id: '', user_id: '', start_date: new Date().toISOString().split('T')[0], notes: '' }); setAssignModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
              <PlusIcon className="w-4 h-4" /> Atribuir Custódia
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                {['Bem', 'Responsável', 'Atribuído por', 'Início', 'Término', 'Status', ''].map((h, i) => (
                  <th key={i} className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {loading ? (
                <LoadingTable cols={7} />
              ) : custodies.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl">📋</span>
                    <p className="font-medium text-gray-500 dark:text-gray-400">Nenhuma custódia registrada</p>
                  </div>
                </td></tr>
              ) : custodies.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{c.asset?.name}</div>
                    <div className="text-xs font-mono text-gray-500 mt-0.5">{c.asset?.patrimony_number}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{c.user?.name}</div>
                    <div className="text-xs text-gray-500">{c.user?.department_ref?.name || c.user?.department}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{c.assigned_by_user?.name || '—'}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{new Date(c.start_date).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{c.end_date ? new Date(c.end_date).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="px-6 py-4"><StatusBadge value={c.is_active ? 'ACTIVE' : 'INACTIVE'} label={c.is_active ? 'Ativa' : 'Encerrada'} /></td>
                  <td className="px-6 py-4">
                    {canWrite && c.is_active && (
                      <button onClick={() => setReleaseTarget(c)} className="text-sm text-red-600 dark:text-red-400 hover:underline font-medium">Liberar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={meta.total_pages} total={meta.total} limit={limit} onPageChange={setPage} />
        </div>
      </div>

      <Modal open={assignModal} onClose={() => setAssignModal(false)} title="Atribuir Custódia">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bem *</label>
            <select value={form.asset_id} onChange={e => setForm(f => ({ ...f, asset_id: e.target.value }))} className={inputCls}>
              <option value="">— Selecione um bem —</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.patrimony_number} · {a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Responsável *</label>
            <select value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))} className={inputCls}>
              <option value="">— Selecione um usuário —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} {u.department_ref?.name || u.department ? `(${u.department_ref?.name || u.department})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data de Início *</label>
            <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setAssignModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
          <button onClick={handleAssign} disabled={saving} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">{saving ? 'Salvando...' : 'Atribuir'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!releaseTarget} onClose={() => setReleaseTarget(null)} onConfirm={handleRelease} loading={releasing}
        title="Liberar Custódia" message={`Liberar custódia do bem "${releaseTarget?.asset?.name}" para ${releaseTarget?.user?.name}?`}
        confirmLabel="Liberar" confirmVariant="primary" />
    </MainLayout>
  );
}

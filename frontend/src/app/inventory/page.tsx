'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingTable } from '@/components/ui/LoadingTable';
import { Pagination } from '@/components/ui/Pagination';
import { usePermissions } from '@/hooks/usePermissions';
import { inventoryApi } from '@/lib/api/services/inventory';
import { InventoryProcess, CreateInventoryInput, INVENTORY_STATUS_LABELS } from '@/types/inventory';
import { PlusIcon, EyeIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function InventoryPage() {
  const router = useRouter();
  const { canWrite, isAdmin } = usePermissions();
  const [processes, setProcesses] = useState<InventoryProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, total_pages: 1 });
  const limit = 20;

  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState<CreateInventoryInput>({ name: '', year: new Date().getFullYear(), notes: '' });
  const [saving, setSaving] = useState(false);

  const [startTarget, setStartTarget] = useState<InventoryProcess | null>(null);
  const [starting, setStarting] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<InventoryProcess | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<InventoryProcess | null>(null);
  const [completing, setCompleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.list({ page, limit });
      setProcesses(res.data.data);
      setMeta({ total: res.data.meta.total, total_pages: res.data.meta.total_pages });
    } catch {
      toast.error('Erro ao carregar inventários');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }
    setSaving(true);
    try {
      const res = await inventoryApi.create(form);
      toast.success('Inventário criado');
      setCreateModal(false);
      router.push(`/inventory/${res.data.data.id}`);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao criar inventário');
    } finally {
      setSaving(false);
    }
  }

  async function handleStart() {
    if (!startTarget) return;
    setStarting(true);
    try {
      await inventoryApi.start(startTarget.id);
      toast.success('Inventário iniciado');
      setStartTarget(null);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao iniciar');
    } finally {
      setStarting(false);
    }
  }

  async function handleComplete() {
    if (!completeTarget) return;
    setCompleting(true);
    try {
      await inventoryApi.complete(completeTarget.id);
      toast.success('Inventário concluído');
      setCompleteTarget(null);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao concluir');
    } finally {
      setCompleting(false);
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await inventoryApi.cancel(cancelTarget.id);
      toast.success('Inventário cancelado');
      setCancelTarget(null);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao cancelar');
    } finally {
      setCancelling(false);
    }
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventário</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Processos de inventário patrimonial</p>
          </div>
          {canWrite && (
            <button onClick={() => { setForm({ name: '', year: new Date().getFullYear(), notes: '' }); setCreateModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
              <PlusIcon className="w-4 h-4" /> Novo Inventário
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                {['Nome', 'Ano', 'Responsável', 'Início', 'Conclusão', 'Status', ''].map((h, i) => (
                  <th key={i} className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {loading ? (
                <LoadingTable cols={7} />
              ) : processes.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl">📋</span>
                    <p className="font-medium text-gray-500 dark:text-gray-400">Nenhum inventário criado</p>
                    <p className="text-sm text-gray-400">Clique em <strong>Novo Inventário</strong> para iniciar</p>
                  </div>
                </td></tr>
              ) : processes.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{p.name}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{p.year}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{p.responsible?.name || '—'}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{p.start_date ? new Date(p.start_date).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{p.end_date ? new Date(p.end_date).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="px-6 py-4"><StatusBadge value={p.status} label={INVENTORY_STATUS_LABELS[p.status]} /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => router.push(`/inventory/${p.id}`)} className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><EyeIcon className="w-4 h-4" /></button>
                      {canWrite && p.status === 'DRAFT' && <button onClick={() => setStartTarget(p)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">Iniciar</button>}
                      {isAdmin && p.status === 'IN_PROGRESS' && <button onClick={() => setCompleteTarget(p)} className="text-xs text-green-600 dark:text-green-400 hover:underline font-medium">Concluir</button>}
                      {isAdmin && (p.status === 'DRAFT' || p.status === 'IN_PROGRESS') && <button onClick={() => setCancelTarget(p)} className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium">Cancelar</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={meta.total_pages} total={meta.total} limit={limit} onPageChange={setPage} />
        </div>
      </div>

      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Novo Inventário" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Inventário Anual 2025" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ano *</label>
            <input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: +e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setCreateModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
          <button onClick={handleCreate} disabled={saving} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">{saving ? 'Criando...' : 'Criar'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!startTarget} onClose={() => setStartTarget(null)} onConfirm={handleStart} loading={starting} confirmVariant="primary"
        title="Iniciar Inventário" message={`Iniciar o inventário "${startTarget?.name}"?`} confirmLabel="Iniciar" />
      <ConfirmDialog open={!!completeTarget} onClose={() => setCompleteTarget(null)} onConfirm={handleComplete} loading={completing} confirmVariant="primary"
        title="Concluir Inventário" message={`Concluir o inventário "${completeTarget?.name}"?`} confirmLabel="Concluir" />
      <ConfirmDialog open={!!cancelTarget} onClose={() => setCancelTarget(null)} onConfirm={handleCancel} loading={cancelling}
        title="Cancelar Inventário" message={`Cancelar o inventário "${cancelTarget?.name}"?`} confirmLabel="Cancelar" />
    </MainLayout>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingTable } from '@/components/ui/LoadingTable';
import { Pagination } from '@/components/ui/Pagination';
import { usePermissions } from '@/hooks/usePermissions';
import { maintenanceApi } from '@/lib/api/services/maintenance';
import { assetsApi } from '@/lib/api/services/assets';
import { formatCurrency } from '@/lib/format';
import {
  Maintenance, MaintenanceStatus, MAINTENANCE_STATUS_LABELS,
  MaintenanceType, MAINTENANCE_TYPE_LABELS, CreateMaintenanceInput, CompleteMaintenanceInput,
} from '@/types/maintenance';
import { Asset } from '@/types/assets';
import { PlusIcon, MagnifyingGlassIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function MaintenancePage() {
  const { canCreateMaintenance } = usePermissions();
  const [items, setItems] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, total_pages: 1 });
  const limit = 20;

  const [assets, setAssets] = useState<Asset[]>([]);

  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState<CreateMaintenanceInput>({ asset_id: '', type: 'PREVENTIVE', description: '' });
  const [saving, setSaving] = useState(false);

  const [completeTarget, setCompleteTarget] = useState<Maintenance | null>(null);
  const [completeForm, setCompleteForm] = useState<CompleteMaintenanceInput>({ completion_date: '', cost: 0, notes: '' });
  const [completing, setCompleting] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<Maintenance | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const [summary, setSummary] = useState({ scheduled: 0, inProgress: 0, completed: 0, totalCost: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await maintenanceApi.list({ page, limit, status: statusFilter || undefined });
      setItems(res.data.data);
      setMeta({ total: res.data.meta.total, total_pages: res.data.meta.total_pages });
    } catch {
      toast.error('Erro ao carregar manutenções');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    assetsApi.list({ limit: 1000 }).then(r => setAssets(r.data.data)).catch(() => {});
    // Load summary counts
    Promise.all([
      maintenanceApi.list({ limit: 1, status: 'SCHEDULED' }),
      maintenanceApi.list({ limit: 1, status: 'IN_PROGRESS' }),
      maintenanceApi.list({ limit: 1, status: 'COMPLETED' }),
    ]).then(([s, p, c]) => {
      const completedItems = c.data.data;
      const totalCost = completedItems.reduce((sum, m) => sum + (m.cost || 0), 0);
      setSummary({
        scheduled: s.data.meta.total,
        inProgress: p.data.meta.total,
        completed: c.data.meta.total,
        totalCost,
      });
    }).catch(() => {});
  }, []);

  async function handleCreate() {
    if (!form.asset_id || !form.description) { toast.error('Bem e descrição são obrigatórios'); return; }
    setSaving(true);
    try {
      await maintenanceApi.create(form);
      toast.success('Manutenção registrada');
      setCreateModal(false);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao criar manutenção');
    } finally {
      setSaving(false);
    }
  }

  async function handleStart(m: Maintenance) {
    try {
      await maintenanceApi.updateStatus(m.id, { status: 'IN_PROGRESS', start_date: new Date().toISOString().split('T')[0] });
      toast.success('Manutenção iniciada');
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao iniciar');
    }
  }

  async function handleComplete() {
    if (!completeTarget || !completeForm.completion_date) { toast.error('Data de conclusão é obrigatória'); return; }
    setCompleting(true);
    try {
      await maintenanceApi.complete(completeTarget.id, completeForm);
      toast.success('Manutenção concluída');
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
      await maintenanceApi.updateStatus(cancelTarget.id, { status: 'CANCELLED' });
      toast.success('Manutenção cancelada');
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manutenção</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manutenções preventivas e corretivas</p>
          </div>
          {canCreateMaintenance && (
            <button onClick={() => { setForm({ asset_id: '', type: 'PREVENTIVE', description: '' }); setCreateModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
              <PlusIcon className="w-4 h-4" /> Nova Manutenção
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Agendadas', value: summary.scheduled.toString(), color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Em Andamento', value: summary.inProgress.toString(), color: 'text-yellow-600 dark:text-yellow-400' },
            { label: 'Concluídas', value: summary.completed.toString(), color: 'text-green-600 dark:text-green-400' },
            { label: 'Custo Total', value: formatCurrency(summary.totalCost), color: 'text-purple-600 dark:text-purple-400' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Buscar manutenção..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" readOnly />
            </div>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos os status</option>
              {(Object.entries(MAINTENANCE_STATUS_LABELS) as [MaintenanceStatus, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                {['Bem', 'Tipo', 'Descrição', 'Fornecedor', 'Custo', 'Data', 'Status', ''].map((h, i) => (
                  <th key={i} className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {loading ? (
                <LoadingTable cols={8} />
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <WrenchScrewdriverIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                    <p className="font-medium text-gray-500 dark:text-gray-400">Nenhuma manutenção registrada</p>
                  </div>
                </td></tr>
              ) : items.map(m => (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{m.asset?.name}</div>
                    <div className="text-xs font-mono text-gray-500">{m.asset?.patrimony_number}</div>
                  </td>
                  <td className="px-6 py-4"><StatusBadge value={m.type} label={MAINTENANCE_TYPE_LABELS[m.type]} /></td>
                  <td className="px-6 py-4 text-gray-700 dark:text-gray-300 max-w-xs truncate">{m.description}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{m.provider || '—'}</td>
                  <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{m.cost ? formatCurrency(m.cost) : '—'}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-xs">
                    {m.scheduled_date ? new Date(m.scheduled_date).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-6 py-4"><StatusBadge value={m.status} label={MAINTENANCE_STATUS_LABELS[m.status]} /></td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 justify-end">
                      {canCreateMaintenance && m.status === 'SCHEDULED' && (
                        <button onClick={() => handleStart(m)} className="text-xs text-yellow-600 dark:text-yellow-400 hover:underline font-medium">Iniciar</button>
                      )}
                      {canCreateMaintenance && m.status === 'IN_PROGRESS' && (
                        <button onClick={() => { setCompleteTarget(m); setCompleteForm({ completion_date: new Date().toISOString().split('T')[0], cost: m.cost, notes: '' }); }} className="text-xs text-green-600 dark:text-green-400 hover:underline font-medium">Concluir</button>
                      )}
                      {canCreateMaintenance && (m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS') && (
                        <button onClick={() => setCancelTarget(m)} className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium">Cancelar</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={meta.total_pages} total={meta.total} limit={limit} onPageChange={setPage} />
        </div>
      </div>

      {/* Create Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Nova Manutenção">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bem *</label>
            <select value={form.asset_id} onChange={e => setForm(f => ({ ...f, asset_id: e.target.value }))} className={inputCls}>
              <option value="">— Selecione —</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.patrimony_number} · {a.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo *</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as MaintenanceType }))} className={inputCls}>
                {(Object.entries(MAINTENANCE_TYPE_LABELS) as [MaintenanceType, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Agendada</label>
              <input type="date" value={form.scheduled_date ?? ''} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição *</label>
            <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fornecedor</label>
              <input value={form.provider ?? ''} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Custo Previsto (R$)</label>
              <input type="number" min={0} step={0.01} value={form.cost ?? 0} onChange={e => setForm(f => ({ ...f, cost: +e.target.value }))} className={inputCls} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setCreateModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
          <button onClick={handleCreate} disabled={saving} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">{saving ? 'Salvando...' : 'Registrar'}</button>
        </div>
      </Modal>

      {/* Complete Modal */}
      <Modal open={!!completeTarget} onClose={() => setCompleteTarget(null)} title="Concluir Manutenção" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data de Conclusão *</label>
            <input type="date" value={completeForm.completion_date} onChange={e => setCompleteForm(f => ({ ...f, completion_date: e.target.value }))} className={`w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Custo Final (R$)</label>
            <input type="number" min={0} step={0.01} value={completeForm.cost ?? 0} onChange={e => setCompleteForm(f => ({ ...f, cost: +e.target.value }))} className={`w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
            <textarea rows={2} value={completeForm.notes ?? ''} onChange={e => setCompleteForm(f => ({ ...f, notes: e.target.value }))} className={`w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setCompleteTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
          <button onClick={handleComplete} disabled={completing} className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50">{completing ? 'Concluindo...' : 'Confirmar Conclusão'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!cancelTarget} onClose={() => setCancelTarget(null)} onConfirm={handleCancel} loading={cancelling}
        title="Cancelar Manutenção" message={`Cancelar a manutenção do bem "${cancelTarget?.asset?.name}"?`} confirmLabel="Cancelar Manutenção" />
    </MainLayout>
  );
}

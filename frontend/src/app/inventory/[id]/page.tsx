'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingTable } from '@/components/ui/LoadingTable';
import { usePermissions } from '@/hooks/usePermissions';
import { inventoryApi } from '@/lib/api/services/inventory';
import { assetsApi } from '@/lib/api/services/assets';
import { locationsApi } from '@/lib/api/services/locations';
import { departmentsApi } from '@/lib/api/services/departments';
import {
  InventoryProcess, InventoryItem, VerifyItemInput, INVENTORY_STATUS_LABELS,
} from '@/types/inventory';
import { Asset, AssetCondition, CONDITION_LABELS, ASSET_TYPE_LABELS, AssetType } from '@/types/assets';
import { Location } from '@/types/locations';
import { Department } from '@/types/departments';
import {
  ArrowLeftIcon, CheckCircleIcon, PlusIcon, TrashIcon, MagnifyingGlassIcon, InboxArrowDownIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function InventoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canWrite, isAdmin } = usePermissions();

  const [process, setProcess] = useState<InventoryProcess | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);

  // Verify modal
  const [verifyTarget, setVerifyTarget] = useState<InventoryItem | null>(null);
  const [verifyForm, setVerifyForm] = useState<Partial<VerifyItemInput>>({});
  const [verifying, setVerifying] = useState(false);

  // Add-assets modal
  const [addOpen, setAddOpen] = useState(false);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assetSearch, setAssetSearch] = useState('');
  const [filterDeptId, setFilterDeptId] = useState('');
  const [filterLocId, setFilterLocId] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [importingAll, setImportingAll] = useState(false);

  // Remove item
  const [removeTarget, setRemoveTarget] = useState<InventoryItem | null>(null);
  const [removing, setRemoving] = useState(false);

  // Status transitions
  const [startOpen, setStartOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [procRes, itemsRes] = await Promise.all([
        inventoryApi.get(id),
        inventoryApi.getItems(id),
      ]);
      setProcess(procRes.data.data);
      setItems(itemsRes.data.data);
    } catch {
      toast.error('Erro ao carregar inventário');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    locationsApi.list().then(r => setLocations(r.data.data)).catch(() => {});
    departmentsApi.list().then(r => setDepartments(r.data.data)).catch(() => {});
  }, []);

  const loadAssets = useCallback(async (search: string, deptId: string, locId: string) => {
    setAssetsLoading(true);
    try {
      const res = await assetsApi.list({
        search, limit: 200, status: 'ACTIVE',
        ...(deptId ? { department_id: deptId } : {}),
        ...(locId ? { location_id: locId } : {}),
      });
      setAllAssets(res.data.data);
    } catch {
      toast.error('Erro ao carregar bens');
    } finally {
      setAssetsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!addOpen) return;
    setSelectedIds(new Set());
    setAssetSearch('');
    setFilterDeptId('');
    setFilterLocId('');
    loadAssets('', '', '');
  }, [addOpen, loadAssets]);

  useEffect(() => {
    if (!addOpen) return;
    const t = setTimeout(() => loadAssets(assetSearch, filterDeptId, filterLocId), 300);
    return () => clearTimeout(t);
  }, [assetSearch, filterDeptId, filterLocId, addOpen, loadAssets]);

  const reloadItems = useCallback(async () => {
    const res = await inventoryApi.getItems(id);
    setItems(res.data.data);
  }, [id]);

  async function handleVerify() {
    if (!verifyTarget || verifyForm.found === undefined) {
      toast.error('Informe se o bem foi encontrado');
      return;
    }
    setVerifying(true);
    try {
      await inventoryApi.verifyItem(id, {
        asset_id: verifyTarget.asset.id,
        found: verifyForm.found!,
        actual_condition: verifyForm.actual_condition,
        actual_location_id: verifyForm.actual_location_id,
        notes: verifyForm.notes,
      });
      toast.success('Item verificado');
      setVerifyTarget(null);
      await reloadItems();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao verificar');
    } finally {
      setVerifying(false);
    }
  }

  async function handleImportAll() {
    setImportingAll(true);
    try {
      const ids: string[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const res = await assetsApi.list({ status: 'ACTIVE', limit: 1000, page });
        ids.push(...res.data.data.filter(a => !addedIds.has(a.id)).map(a => a.id));
        totalPages = res.data.meta.total_pages;
        page += 1;
      } while (page <= totalPages);
      if (ids.length === 0) { toast('Todos os bens já estão no inventário'); return; }
      await inventoryApi.addItems(id, ids);
      toast.success(`${ids.length} bem(ns) importado(s)`);
      await reloadItems();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao importar bens');
    } finally {
      setImportingAll(false);
    }
  }

  async function handleAddItems() {
    if (selectedIds.size === 0) return;
    setAdding(true);
    try {
      await inventoryApi.addItems(id, Array.from(selectedIds));
      toast.success(`${selectedIds.size} bem(ns) adicionado(s)`);
      setAddOpen(false);
      await reloadItems();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao adicionar bens');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveItem() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await inventoryApi.removeItem(id, removeTarget.asset.id);
      toast.success('Bem removido do inventário');
      setRemoveTarget(null);
      await reloadItems();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao remover');
    } finally {
      setRemoving(false);
    }
  }

  async function handleStart() {
    setStarting(true);
    try {
      await inventoryApi.start(id);
      toast.success('Inventário iniciado');
      setStartOpen(false);
      await loadData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao iniciar');
    } finally {
      setStarting(false);
    }
  }

  async function handleComplete() {
    setCompleting(true);
    try {
      await inventoryApi.complete(id);
      toast.success('Inventário concluído');
      setCompleteOpen(false);
      await loadData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao concluir');
    } finally {
      setCompleting(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      await inventoryApi.cancel(id);
      toast.success('Inventário cancelado');
      setCancelOpen(false);
      await loadData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao cancelar');
    } finally {
      setCancelling(false);
    }
  }

  const addedIds = new Set(items.map(i => i.asset?.id).filter(Boolean));
  const verified = items.filter(i => i.verified_at !== null).length;
  const status = process?.status;
  const isDraft = status === 'DRAFT';
  const isInProgress = status === 'IN_PROGRESS';

  const draftCols = ['Bem', 'Nº Patrimônio', 'Tipo', 'Responsável Esperado', 'Localização', 'Condição', ''];
  const progressCols = ['Bem', 'Responsável Esperado', 'Local Esperado', 'Encontrado', 'Condição Real', 'Local Real', 'Verificado por', ''];
  const cols = isDraft ? draftCols : progressCols;

  return (
    <MainLayout>
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.push('/inventory')}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mt-0.5"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                {process?.name ?? '...'}
              </h1>
              {process && (
                <StatusBadge value={process.status} label={INVENTORY_STATUS_LABELS[process.status]} />
              )}
              {process && (
                <span className="text-gray-400 text-sm">• {process.year}</span>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
              {loading ? '…' : isDraft
                ? `${items.length} bem${items.length !== 1 ? 's' : ''} selecionado${items.length !== 1 ? 's' : ''}`
                : `${verified} de ${items.length} itens verificados`}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
            {isDraft && canWrite && (
              <button
                onClick={() => setStartOpen(true)}
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Iniciar
              </button>
            )}
            {isInProgress && isAdmin && (
              <button
                onClick={() => setCompleteOpen(true)}
                className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Concluir
              </button>
            )}
            {(isDraft || isInProgress) && isAdmin && (
              <button
                onClick={() => setCancelOpen(true)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>

        {/* Progress bar — IN_PROGRESS only */}
        {isInProgress && items.length > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{verified} verificados de {items.length}</span>
              <span className="font-semibold">{Math.round((verified / items.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(verified / items.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Add assets toolbar — DRAFT only */}
        {isDraft && canWrite && (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleImportAll}
              disabled={importingAll}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors text-sm disabled:opacity-50"
              title="Importa todos os bens ativos do sistema de uma vez"
            >
              <InboxArrowDownIcon className="w-4 h-4" />
              {importingAll ? 'Importando…' : 'Importar Todos'}
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
            >
              <PlusIcon className="w-4 h-4" /> Adicionar Bens
            </button>
          </div>
        )}

        {/* Items table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                {cols.map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {loading ? (
                <LoadingTable cols={cols.length} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={cols.length} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">📋</span>
                      <p className="font-medium text-gray-500 dark:text-gray-400">
                        {isDraft ? 'Nenhum bem adicionado ainda' : 'Nenhum item neste inventário'}
                      </p>
                      {isDraft && canWrite && (
                        <p className="text-sm text-gray-400">
                          Clique em <strong>Adicionar Bens</strong> para começar
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : isDraft ? (
                /* ── DRAFT rows ── */
                items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 group">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {item.asset?.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {item.asset?.patrimony_number}
                    </td>
                    <td className="px-4 py-3">
                      {item.asset?.asset_type && (
                        <StatusBadge
                          value={item.asset.asset_type}
                          label={ASSET_TYPE_LABELS[item.asset.asset_type as AssetType] ?? item.asset.asset_type}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {item.expected_user?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {item.expected_location?.name || item.asset?.location?.name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {item.asset?.condition && (
                        <StatusBadge value={item.asset.condition} label={CONDITION_LABELS[item.asset.condition]} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canWrite && (
                        <button
                          onClick={() => setRemoveTarget(item)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                          title="Remover bem"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                /* ── IN_PROGRESS / COMPLETED rows ── */
                items.map(item => (
                  <tr
                    key={item.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${item.verified_at ? 'opacity-60' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{item.asset?.name}</div>
                      <div className="text-xs font-mono text-gray-400">{item.asset?.patrimony_number}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {item.expected_user?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {item.expected_location?.name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {item.verified_at !== null ? (
                        <StatusBadge
                          value={item.found ? 'ACTIVE' : 'WRITTEN_OFF'}
                          label={item.found ? 'Sim' : 'Não'}
                        />
                      ) : (
                        <span className="text-xs text-gray-400">Pendente</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {item.actual_condition
                        ? <StatusBadge value={item.actual_condition} label={CONDITION_LABELS[item.actual_condition]} />
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {item.actual_location?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {item.verified_by?.name || '—'}
                      {item.verified_at && (
                        <div className="text-gray-400">{new Date(item.verified_at).toLocaleDateString('pt-BR')}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isInProgress && !item.verified_at ? (
                        <button
                          onClick={() => { setVerifyTarget(item); setVerifyForm({ notes: '' }); }}
                          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          <CheckCircleIcon className="w-4 h-4" /> Verificar
                        </button>
                      ) : item.verified_at ? (
                        <CheckCircleIcon className="w-4 h-4 text-green-500" />
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Verify Modal ── */}
      <Modal
        open={!!verifyTarget}
        onClose={() => setVerifyTarget(null)}
        title={`Verificar: ${verifyTarget?.asset?.name}`}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bem encontrado? *
            </label>
            <div className="flex gap-3">
              {[{ v: true, l: 'Sim' }, { v: false, l: 'Não' }].map(({ v, l }) => (
                <button
                  key={String(v)}
                  onClick={() => setVerifyForm(f => ({ ...f, found: v }))}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    verifyForm.found === v
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Condição Atual
            </label>
            <select
              value={verifyForm.actual_condition ?? ''}
              onChange={e => setVerifyForm(f => ({ ...f, actual_condition: (e.target.value as AssetCondition) || undefined }))}
              className={inputCls}
            >
              <option value="">— Não informado —</option>
              {(Object.entries(CONDITION_LABELS) as [AssetCondition, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Localização Real
            </label>
            <select
              value={verifyForm.actual_location_id ?? ''}
              onChange={e => setVerifyForm(f => ({ ...f, actual_location_id: e.target.value || undefined }))}
              className={inputCls}
            >
              <option value="">— Não informado —</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Observações
            </label>
            <textarea
              rows={2}
              value={verifyForm.notes ?? ''}
              onChange={e => setVerifyForm(f => ({ ...f, notes: e.target.value }))}
              className={inputCls}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setVerifyTarget(null)}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {verifying ? 'Salvando…' : 'Confirmar'}
          </button>
        </div>
      </Modal>

      {/* ── Add Assets Modal ── */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Adicionar Bens ao Inventário"
        size="lg"
      >
        <div className="space-y-3">
          {/* Search + filters */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              value={assetSearch}
              onChange={e => setAssetSearch(e.target.value)}
              placeholder="Buscar por nome ou nº patrimônio…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={filterDeptId}
              onChange={e => setFilterDeptId(e.target.value)}
              className={inputCls}
            >
              <option value="">Todas as unidades</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <select
              value={filterLocId}
              onChange={e => setFilterLocId(e.target.value)}
              className={inputCls}
            >
              <option value="">Todos os locais</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Select all / deselect row */}
          {!assetsLoading && allAssets.length > 0 && (() => {
            const selectable = allAssets.filter(a => !addedIds.has(a.id));
            const allSelected = selectable.length > 0 && selectable.every(a => selectedIds.has(a.id));
            return (
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{allAssets.length} bem(ns) encontrado(s)</span>
                <button
                  onClick={() => {
                    if (allSelected) {
                      setSelectedIds(new Set());
                    } else {
                      setSelectedIds(new Set(selectable.map(a => a.id)));
                    }
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  {allSelected ? 'Desmarcar todos' : `Selecionar todos (${selectable.length})`}
                </button>
              </div>
            );
          })()}

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ maxHeight: '340px', overflowY: 'auto' }}>
            {assetsLoading ? (
              <div className="p-10 text-center text-sm text-gray-400">Carregando…</div>
            ) : allAssets.length === 0 ? (
              <div className="p-10 text-center text-sm text-gray-400">Nenhum bem encontrado</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
                  <tr>
                    {['', 'Bem', 'Nº Patrimônio', 'Localização', 'Condição'].map((h, i) => (
                      <th key={i} className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {allAssets.map(asset => {
                    const alreadyAdded = addedIds.has(asset.id);
                    const selected = selectedIds.has(asset.id);
                    return (
                      <tr
                        key={asset.id}
                        onClick={() => {
                          if (alreadyAdded) return;
                          setSelectedIds(prev => {
                            const next = new Set(prev);
                            if (next.has(asset.id)) {
                              next.delete(asset.id);
                            } else {
                              next.add(asset.id);
                            }
                            return next;
                          });
                        }}
                        className={`transition-colors ${
                          alreadyAdded
                            ? 'opacity-40 cursor-not-allowed'
                            : selected
                              ? 'bg-blue-50 dark:bg-blue-900/20 cursor-pointer'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer'
                        }`}
                      >
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={alreadyAdded || selected}
                            disabled={alreadyAdded}
                            readOnly
                            className="rounded accent-blue-600"
                          />
                        </td>
                        <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-white">
                          {asset.name}
                          {alreadyAdded && (
                            <span className="ml-2 text-xs text-gray-400">já adicionado</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs text-gray-500">
                          {asset.patrimony_number}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                          {asset.location?.name || '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          {asset.condition && (
                            <StatusBadge value={asset.condition} label={CONDITION_LABELS[asset.condition]} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {selectedIds.size > 0 && (
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              {selectedIds.size} bem(ns) selecionado(s)
            </p>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={() => setAddOpen(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleAddItems}
            disabled={adding || selectedIds.size === 0}
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {adding ? 'Adicionando…' : `Adicionar${selectedIds.size > 0 ? ` ${selectedIds.size} bem(ns)` : ''}`}
          </button>
        </div>
      </Modal>

      {/* ── Confirm Dialogs ── */}
      <ConfirmDialog
        open={startOpen} onClose={() => setStartOpen(false)} onConfirm={handleStart} loading={starting}
        confirmVariant="primary" title="Iniciar Inventário"
        message={`Iniciar "${process?.name}"? Após iniciado não será possível adicionar ou remover bens.`}
        confirmLabel="Iniciar"
      />
      <ConfirmDialog
        open={completeOpen} onClose={() => setCompleteOpen(false)} onConfirm={handleComplete} loading={completing}
        confirmVariant="primary" title="Concluir Inventário"
        message={`Concluir o inventário "${process?.name}"?`}
        confirmLabel="Concluir"
      />
      <ConfirmDialog
        open={cancelOpen} onClose={() => setCancelOpen(false)} onConfirm={handleCancel} loading={cancelling}
        title="Cancelar Inventário"
        message={`Cancelar o inventário "${process?.name}"?`}
        confirmLabel="Cancelar"
      />
      <ConfirmDialog
        open={!!removeTarget} onClose={() => setRemoveTarget(null)} onConfirm={handleRemoveItem} loading={removing}
        title="Remover Bem"
        message={`Remover "${removeTarget?.asset?.name}" do inventário?`}
        confirmLabel="Remover"
      />
    </MainLayout>
  );
}

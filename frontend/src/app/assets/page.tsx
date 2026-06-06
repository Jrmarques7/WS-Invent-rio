'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingTable } from '@/components/ui/LoadingTable';
import { Pagination } from '@/components/ui/Pagination';
import { usePermissions } from '@/hooks/usePermissions';
import { assetsApi, CreateAssetInput, UpdateAssetInput, WriteOffInput } from '@/lib/api/services/assets';
import { categoriesApi } from '@/lib/api/services/categories';
import { locationsApi } from '@/lib/api/services/locations';
import { departmentsApi } from '@/lib/api/services/departments';
import { formatCurrency } from '@/lib/format';
import { Asset, AssetType, AssetStatus, AssetCondition, TransferPolicy, ASSET_TYPE_LABELS, ASSET_STATUS_LABELS, CONDITION_LABELS, TRANSFER_POLICY_LABELS, Custody } from '@/types/assets';
import { Category } from '@/types/categories';
import { Location } from '@/types/locations';
import { Department, buildFlatTree } from '@/types/departments';
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon, EyeIcon, ArchiveBoxIcon, ArchiveBoxXMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const emptyCreate: CreateAssetInput = {
  name: '', description: '', asset_type: 'MOVEL', brand: '', model: '',
  serial_number: '', acquisition_value: 0, useful_life_years: 0, transfer_policy: 'REQUIRES_APPROVAL', notes: '',
};

export default function AssetsPage() {
  const { canWrite, canDelete } = usePermissions();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<AssetType | ''>('');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | ''>('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, total_pages: 1 });
  const limit = 20;

  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [createForm, setCreateForm] = useState<CreateAssetInput>(emptyCreate);
  const [editForm, setEditForm] = useState<UpdateAssetInput>({});
  const [nextNumber, setNextNumber] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const [writeOffTarget, setWriteOffTarget] = useState<Asset | null>(null);
  const [writeOffForm, setWriteOffForm] = useState<WriteOffInput>({ date: '', reason: '' });
  const [savingWriteOff, setSavingWriteOff] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);
  const [custodyInfo, setCustodyInfo] = useState<Custody | null>(null);
  const [loadingCustody, setLoadingCustody] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await assetsApi.list({
        page, limit,
        search: search || undefined,
        asset_type: typeFilter || undefined,
        status: statusFilter || undefined,
      });
      setAssets(res.data.data);
      setMeta({ total: res.data.meta.total, total_pages: res.data.meta.total_pages });
    } catch {
      toast.error('Erro ao carregar bens');
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    categoriesApi.list().then(r => setCategories(r.data.data)).catch(() => {});
    locationsApi.list().then(r => setLocations(r.data.data)).catch(() => {});
    departmentsApi.list().then(r => setDepartments(r.data.data)).catch(() => {});
  }, []);

  function openCreate() {
    setEditing(null);
    setCreateForm(emptyCreate);
    setNextNumber('');
    assetsApi.nextNumber('MOVEL').then(r => setNextNumber(r.data.data.number)).catch(() => {});
    setModalOpen(true);
  }

  function openEdit(a: Asset) {
    setEditing(a);
    setEditForm({
      name: a.name, description: a.description, brand: a.brand, model: a.model,
      serial_number: a.serial_number, useful_life_years: a.useful_life_years,
      condition: a.condition, notes: a.notes, status: a.status,
      transfer_policy: a.transfer_policy,
      category_id: a.category?.id, location_id: a.location?.id,
      department_id: a.department?.id ?? undefined,
    });
    setModalOpen(true);
  }

  async function openDetail(a: Asset) {
    setDetailAsset(a);
    setCustodyInfo(null);
    setLoadingCustody(true);
    try {
      const res = await assetsApi.getCustody(a.id);
      setCustodyInfo(res.data.data);
    } catch {
      setCustodyInfo(null);
    } finally {
      setLoadingCustody(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editing) {
        await assetsApi.update(editing.id, editForm);
        toast.success('Bem atualizado');
      } else {
        if (!createForm.name.trim() || !createForm.asset_type) { toast.error('Nome e tipo são obrigatórios'); setSaving(false); return; }
        await assetsApi.create(createForm);
        toast.success('Bem cadastrado');
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function handleWriteOff() {
    if (!writeOffTarget || !writeOffForm.date || !writeOffForm.reason) { toast.error('Data e motivo são obrigatórios'); return; }
    setSavingWriteOff(true);
    try {
      await assetsApi.writeOff(writeOffTarget.id, writeOffForm);
      toast.success('Baixa registrada');
      setWriteOffTarget(null);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao dar baixa');
    } finally {
      setSavingWriteOff(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await assetsApi.delete(deleteTarget.id);
      toast.success('Bem excluído');
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao excluir');
    } finally {
      setDeleting(false);
    }
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bens Patrimoniais</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{meta.total} bens cadastrados</p>
          </div>
          {canWrite && (
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
              <PlusIcon className="w-4 h-4" /> Novo Bem
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} type="text" placeholder="Buscar por nome, patrimônio ou série..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value as AssetType | ''); setPage(1); }} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos os tipos</option>
              {(Object.entries(ASSET_TYPE_LABELS) as [AssetType, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as AssetStatus | ''); setPage(1); }} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos os status</option>
              {(Object.entries(ASSET_STATUS_LABELS) as [AssetStatus, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                {['Patrimônio', 'Nome', 'Tipo', 'Categoria', 'Localização', 'Condição', 'Valor Atual', 'Status', ''].map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {loading ? (
                <LoadingTable cols={9} />
              ) : assets.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <ArchiveBoxIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                    <p className="font-medium text-gray-500 dark:text-gray-400">Nenhum bem encontrado</p>
                  </div>
                </td></tr>
              ) : assets.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer" onClick={() => openDetail(a)}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{a.patrimony_number}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">{a.name}</div>
                    {a.brand && <div className="text-xs text-gray-500 mt-0.5">{a.brand}{a.model ? ` · ${a.model}` : ''}</div>}
                    {a.department && <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">{a.department.name}</div>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge value={a.asset_type} label={ASSET_TYPE_LABELS[a.asset_type]} /></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{a.category?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{a.location?.name || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge value={a.condition} label={CONDITION_LABELS[a.condition]} /></td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">{formatCurrency(a.current_value)}</td>
                  <td className="px-4 py-3"><StatusBadge value={a.status} label={ASSET_STATUS_LABELS[a.status]} /></td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openDetail(a)} className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><EyeIcon className="w-4 h-4" /></button>
                      {canWrite && <button onClick={() => openEdit(a)} className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><PencilIcon className="w-4 h-4" /></button>}
                      {canDelete && a.status !== 'WRITTEN_OFF' && <button onClick={() => { setWriteOffTarget(a); setWriteOffForm({ date: new Date().toISOString().split('T')[0], reason: '' }); }} className="p-1.5 text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Dar Baixa"><ArchiveBoxXMarkIcon className="w-4 h-4" /></button>}
                      {canDelete && <button onClick={() => setDeleteTarget(a)} className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><TrashIcon className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={meta.total_pages} total={meta.total} limit={limit} onPageChange={setPage} />
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Bem' : 'Novo Bem'} size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
              {editing
                ? <input value={editForm.name ?? ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                : <input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
              }
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
              {editing ? (
                <input disabled value={ASSET_TYPE_LABELS[editing.asset_type]} className={`${inputCls} opacity-60`} />
              ) : (
                <>
                  <select
                    value={createForm.asset_type}
                    onChange={e => {
                      const t = e.target.value as AssetType;
                      setCreateForm(f => ({ ...f, asset_type: t }));
                      setNextNumber('');
                      assetsApi.nextNumber(t).then(r => setNextNumber(r.data.data.number)).catch(() => {});
                    }}
                    className={inputCls}
                  >
                    {(Object.entries(ASSET_TYPE_LABELS) as [AssetType, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  {nextNumber && (
                    <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 font-mono">
                      Próximo nº de patrimônio: <strong>{nextNumber}</strong>
                    </p>
                  )}
                </>
              )}
            </div>
            {editing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select value={editForm.status ?? editing.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as AssetStatus }))} className={inputCls}>
                  {(Object.entries(ASSET_STATUS_LABELS) as [AssetStatus, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
              <select
                value={editing ? (editForm.category_id ?? '') : (createForm.category_id ?? '')}
                onChange={e => editing
                  ? setEditForm(f => ({ ...f, category_id: e.target.value || undefined }))
                  : setCreateForm(f => ({ ...f, category_id: e.target.value || undefined }))}
                className={inputCls}>
                <option value="">— Sem categoria —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marca</label>
              {editing
                ? <input value={editForm.brand ?? ''} onChange={e => setEditForm(f => ({ ...f, brand: e.target.value }))} className={inputCls} />
                : <input value={createForm.brand} onChange={e => setCreateForm(f => ({ ...f, brand: e.target.value }))} className={inputCls} />
              }
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modelo</label>
              {editing
                ? <input value={editForm.model ?? ''} onChange={e => setEditForm(f => ({ ...f, model: e.target.value }))} className={inputCls} />
                : <input value={createForm.model} onChange={e => setCreateForm(f => ({ ...f, model: e.target.value }))} className={inputCls} />
              }
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nº de Série</label>
              {editing
                ? <input value={editForm.serial_number ?? ''} onChange={e => setEditForm(f => ({ ...f, serial_number: e.target.value }))} className={inputCls} />
                : <input value={createForm.serial_number} onChange={e => setCreateForm(f => ({ ...f, serial_number: e.target.value }))} className={inputCls} />
              }
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Localização</label>
              <select
                value={editing ? (editForm.location_id ?? '') : (createForm.location_id ?? '')}
                onChange={e => editing
                  ? setEditForm(f => ({ ...f, location_id: e.target.value || undefined }))
                  : setCreateForm(f => ({ ...f, location_id: e.target.value || undefined }))}
                className={inputCls}>
                <option value="">— Sem localização —</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unidade</label>
              <select
                value={editing ? (editForm.department_id ?? '') : (createForm.department_id ?? '')}
                onChange={e => editing
                  ? setEditForm(f => ({ ...f, department_id: e.target.value || undefined }))
                  : setCreateForm(f => ({ ...f, department_id: e.target.value || undefined }))}
                className={inputCls}>
                <option value="">— Sem unidade —</option>
                {buildFlatTree(departments).map(node => (
                  <option key={node.id} value={node.id}>
                    {'　'.repeat(node.depth)}{node.depth > 0 ? '↳ ' : ''}{node.name}
                    {node.type ? ` (${node.type})` : ''}
                  </option>
                ))}
              </select>
            </div>
            {!editing && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data de Aquisição</label>
                  <input type="date" value={createForm.acquisition_date ?? ''} onChange={e => setCreateForm(f => ({ ...f, acquisition_date: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor de Aquisição (R$)</label>
                  <input type="number" min={0} step={0.01} value={createForm.acquisition_value} onChange={e => setCreateForm(f => ({ ...f, acquisition_value: +e.target.value }))} className={inputCls} />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vida Útil (anos)</label>
              {editing
                ? <input type="number" min={0} value={editForm.useful_life_years ?? 0} onChange={e => setEditForm(f => ({ ...f, useful_life_years: +e.target.value }))} className={inputCls} />
                : <input type="number" min={0} value={createForm.useful_life_years} onChange={e => setCreateForm(f => ({ ...f, useful_life_years: +e.target.value }))} className={inputCls} />
              }
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Condição</label>
              <select
                value={editing ? (editForm.condition ?? 'GOOD') : (createForm.condition ?? 'GOOD')}
                onChange={e => editing
                  ? setEditForm(f => ({ ...f, condition: e.target.value as AssetCondition }))
                  : setCreateForm(f => ({ ...f, condition: e.target.value as AssetCondition }))}
                className={inputCls}>
                {(Object.entries(CONDITION_LABELS) as [AssetCondition, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Política de transferência</label>
              <select
                value={editing ? (editForm.transfer_policy ?? 'REQUIRES_APPROVAL') : (createForm.transfer_policy ?? 'REQUIRES_APPROVAL')}
                onChange={e => editing
                  ? setEditForm(f => ({ ...f, transfer_policy: e.target.value as TransferPolicy }))
                  : setCreateForm(f => ({ ...f, transfer_policy: e.target.value as TransferPolicy }))}
                className={inputCls}>
                {(Object.entries(TRANSFER_POLICY_LABELS) as [TransferPolicy, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
              {editing
                ? <textarea rows={2} value={editForm.notes ?? ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} />
                : <textarea rows={2} value={createForm.notes} onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} />
              }
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailAsset} onClose={() => setDetailAsset(null)} title={detailAsset?.name ?? ''} size="lg">
        {detailAsset && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500 dark:text-gray-400">Patrimônio</span><p className="font-mono font-medium text-gray-900 dark:text-white mt-0.5">{detailAsset.patrimony_number}</p></div>
              <div><span className="text-gray-500 dark:text-gray-400">Tipo</span><div className="mt-0.5"><StatusBadge value={detailAsset.asset_type} label={ASSET_TYPE_LABELS[detailAsset.asset_type]} /></div></div>
              <div><span className="text-gray-500 dark:text-gray-400">Valor de Aquisição</span><p className="font-medium text-gray-900 dark:text-white mt-0.5">{formatCurrency(detailAsset.acquisition_value)}</p></div>
              <div><span className="text-gray-500 dark:text-gray-400">Valor Atual</span><p className="font-medium text-gray-900 dark:text-white mt-0.5">{formatCurrency(detailAsset.current_value)}</p></div>
              <div><span className="text-gray-500 dark:text-gray-400">Transferência</span><p className="font-medium text-gray-900 dark:text-white mt-0.5">{TRANSFER_POLICY_LABELS[detailAsset.transfer_policy] ?? detailAsset.transfer_policy}</p></div>
              {detailAsset.brand && <div><span className="text-gray-500 dark:text-gray-400">Marca / Modelo</span><p className="font-medium text-gray-900 dark:text-white mt-0.5">{detailAsset.brand} {detailAsset.model}</p></div>}
              {detailAsset.serial_number && <div><span className="text-gray-500 dark:text-gray-400">Nº de Série</span><p className="font-mono font-medium text-gray-900 dark:text-white mt-0.5">{detailAsset.serial_number}</p></div>}
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Custódia Atual</h3>
              {loadingCustody ? (
                <div className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
              ) : custodyInfo ? (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                  <p className="font-medium text-blue-900 dark:text-blue-300">{custodyInfo.user?.name}</p>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mt-0.5">{custodyInfo.user?.department_ref?.name || custodyInfo.user?.department || custodyInfo.user?.email}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">Desde {new Date(custodyInfo.start_date).toLocaleDateString('pt-BR')}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Sem custódia ativa</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Write-off Modal */}
      <Modal open={!!writeOffTarget} onClose={() => setWriteOffTarget(null)} title={`Dar Baixa — ${writeOffTarget?.name}`} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data da Baixa *</label>
            <input type="date" value={writeOffForm.date} onChange={e => setWriteOffForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motivo *</label>
            <textarea rows={3} value={writeOffForm.reason} onChange={e => setWriteOffForm(f => ({ ...f, reason: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setWriteOffTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
          <button onClick={handleWriteOff} disabled={savingWriteOff} className="px-4 py-2 text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50">{savingWriteOff ? 'Processando...' : 'Confirmar Baixa'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting}
        title="Excluir Bem" message={`Excluir permanentemente "${deleteTarget?.name}" (${deleteTarget?.patrimony_number})?`} confirmLabel="Excluir" />
    </MainLayout>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingTable } from '@/components/ui/LoadingTable';
import { usePermissions } from '@/hooks/usePermissions';
import { categoriesApi } from '@/lib/api/services/categories';
import { Category, CreateCategoryInput, UpdateCategoryInput, DepreciationMethod, DEPRECIATION_METHOD_LABELS } from '@/types/categories';
import { AssetType, ASSET_TYPE_LABELS } from '@/types/assets';
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const emptyForm: CreateCategoryInput = {
  name: '', description: '', asset_type: 'MOVEL', useful_life_years: 0,
  depreciation_rate: 0, depreciation_method: 'LINEAR',
};

export default function CategoriesPage() {
  const { canWrite, canDelete } = usePermissions();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<AssetType | ''>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CreateCategoryInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await categoriesApi.list({
        search: search || undefined,
        asset_type: typeFilter || undefined,
      });
      setCategories(res.data.data);
    } catch {
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setForm({
      name: cat.name, description: cat.description, asset_type: cat.asset_type,
      useful_life_years: cat.useful_life_years, depreciation_rate: cat.depreciation_rate,
      depreciation_method: cat.depreciation_method,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }
    setSaving(true);
    try {
      if (editing) {
        const input: UpdateCategoryInput = { ...form };
        await categoriesApi.update(editing.id, input);
        toast.success('Categoria atualizada');
      } else {
        await categoriesApi.create(form);
        toast.success('Categoria criada');
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao salvar categoria');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await categoriesApi.delete(deleteTarget.id);
      toast.success('Categoria excluída');
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categorias</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Categorias de bens patrimoniais</p>
          </div>
          {canWrite && (
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
              <PlusIcon className="w-4 h-4" /> Nova Categoria
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Buscar categoria..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as AssetType | '')} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos os tipos</option>
              {(Object.entries(ASSET_TYPE_LABELS) as [AssetType, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                {['Nome', 'Tipo', 'Vida Útil', 'Taxa Deprec.', 'Método', 'Status', ''].map((h, i) => (
                  <th key={i} className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {loading ? (
                <LoadingTable cols={7} />
              ) : categories.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl">🏷️</span>
                    <p className="font-medium text-gray-500 dark:text-gray-400">Nenhuma categoria cadastrada</p>
                  </div>
                </td></tr>
              ) : categories.map(cat => (
                <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{cat.name}</div>
                    {cat.description && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{cat.description}</div>}
                  </td>
                  <td className="px-6 py-4"><StatusBadge value={cat.asset_type} label={ASSET_TYPE_LABELS[cat.asset_type]} /></td>
                  <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{cat.useful_life_years ? `${cat.useful_life_years} anos` : '—'}</td>
                  <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{cat.depreciation_rate ? `${cat.depreciation_rate}% a.a.` : '—'}</td>
                  <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{DEPRECIATION_METHOD_LABELS[cat.depreciation_method] ?? cat.depreciation_method}</td>
                  <td className="px-6 py-4"><StatusBadge value={cat.is_active ? 'ACTIVE' : 'INACTIVE'} label={cat.is_active ? 'Ativa' : 'Inativa'} /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      {canWrite && <button onClick={() => openEdit(cat)} className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><PencilIcon className="w-4 h-4" /></button>}
                      {canDelete && <button onClick={() => setDeleteTarget(cat)} className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><TrashIcon className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Categoria' : 'Nova Categoria'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Bem *</label>
            <select value={form.asset_type} onChange={e => setForm(f => ({ ...f, asset_type: e.target.value as AssetType }))} disabled={!!editing} className={`${inputCls} disabled:opacity-60`}>
              {(Object.entries(ASSET_TYPE_LABELS) as [AssetType, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vida Útil (anos)</label>
              <input type="number" min={0} value={form.useful_life_years} onChange={e => setForm(f => ({ ...f, useful_life_years: +e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Taxa Deprec. (% a.a.)</label>
              <input type="number" min={0} step={0.01} value={form.depreciation_rate} onChange={e => setForm(f => ({ ...f, depreciation_rate: +e.target.value }))} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Método de Depreciação</label>
            <select value={form.depreciation_method} onChange={e => setForm(f => ({ ...f, depreciation_method: e.target.value as DepreciationMethod }))} className={inputCls}>
              {(Object.entries(DEPRECIATION_METHOD_LABELS) as [DepreciationMethod, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting}
        title="Excluir Categoria" message={`Tem certeza que deseja excluir a categoria "${deleteTarget?.name}"?`} confirmLabel="Excluir" />
    </MainLayout>
  );
}

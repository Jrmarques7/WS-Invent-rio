'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { departmentsApi } from '@/lib/api/services/departments';
import {
  Department, CreateDepartmentInput,
  buildFlatTree, DepartmentNode, deptTypeBadgeColor,
} from '@/types/departments';
import { OrgChart } from './OrgChart';
import { PlusIcon, BuildingOfficeIcon, ChevronRightIcon, ListBulletIcon, ShareIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

const empty: CreateDepartmentInput = { name: '', type: '', parent_id: null, description: '' };

type View = 'list' | 'chart';

export default function DepartmentsPage() {
  const { canWrite, canDelete } = usePermissions();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [flat, setFlat] = useState<DepartmentNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('list');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState<CreateDepartmentInput>(empty);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await departmentsApi.list();
      const data = res.data.data;
      setDepartments(data);
      setFlat(buildFlatTree(data));
    } catch {
      toast.error('Erro ao carregar unidades');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }
    setSaving(true);
    try {
      const payload = { ...form, parent_id: form.parent_id || null };
      if (editing) {
        await departmentsApi.update(editing.id, payload);
        toast.success('Unidade atualizada');
      } else {
        await departmentsApi.create(payload);
        toast.success('Unidade cadastrada');
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await departmentsApi.delete(deleteTarget.id);
      toast.success('Unidade excluída');
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao excluir');
    } finally {
      setDeleting(false);
    }
  }

  function openCreate(parentId?: string) {
    setEditing(null);
    setForm({ ...empty, parent_id: parentId ?? null });
    setModalOpen(true);
  }

  function openEdit(d: Department) {
    setEditing(d);
    setForm({ name: d.name, type: d.type, parent_id: d.parent_id, description: d.description });
    setModalOpen(true);
  }

  const parentOptions = departments.filter(d => editing ? d.id !== editing.id : true);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Unidades</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Estrutura organizacional da prefeitura
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                onClick={() => setView('list')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <ListBulletIcon className="w-4 h-4" /> Lista
              </button>
              <button
                onClick={() => setView('chart')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${view === 'chart' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <ShareIcon className="w-4 h-4" /> Organograma
              </button>
            </div>
            {canWrite && (
              <button onClick={() => openCreate()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                <PlusIcon className="w-4 h-4" /> Nova Unidade
              </button>
            )}
          </div>
        </div>

        {/* Org chart view */}
        {view === 'chart' && !loading && (
          <OrgChart
            departments={departments}
            canWrite={canWrite}
            canDelete={canDelete}
            onEdit={openEdit}
            onAddChild={openCreate}
            onDelete={setDeleteTarget}
            onReload={load}
          />
        )}

        {/* List view */}
        {view === 'list' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  {['Unidade', 'Tipo', 'Descrição', ''].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {[1, 2, 3, 4].map(j => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : flat.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <BuildingOfficeIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                        <p className="font-medium text-gray-500 dark:text-gray-400">Nenhuma unidade cadastrada</p>
                        {canWrite && (
                          <p className="text-sm text-gray-400">Clique em <strong>Nova Unidade</strong> para começar</p>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : flat.map(node => (
                  <tr key={node.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1" style={{ paddingLeft: `${node.depth * 20}px` }}>
                        {node.depth > 0 && (
                          <ChevronRightIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        )}
                        <span className={`font-medium ${node.depth === 0 ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                          {node.name}
                        </span>
                        {node.children.length > 0 && (
                          <span className="ml-1 text-xs text-gray-400">({node.children.length})</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {node.type ? (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${deptTypeBadgeColor(node.type)}`}>
                          {node.type}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs max-w-xs truncate">
                      {node.description || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        {canWrite && (
                          <>
                            <button
                              onClick={() => openCreate(node.id)}
                              className="text-xs text-green-600 dark:text-green-400 hover:underline font-medium"
                            >+ Sub</button>
                            <button onClick={() => openEdit(node)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">Editar</button>
                          </>
                        )}
                        {canDelete && (
                          <button onClick={() => setDeleteTarget(node)} className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium">Excluir</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Editar: ${editing.name}` : 'Nova Unidade'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className={inputCls}
              placeholder="Ex: Secretaria de Saúde"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
            <input
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className={inputCls}
              placeholder="Ex: Secretaria, Diretoria, Coordenação..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pertence a</label>
            <select
              value={form.parent_id ?? ''}
              onChange={e => setForm(f => ({ ...f, parent_id: e.target.value || null }))}
              className={inputCls}
            >
              <option value="">— Nível raiz —</option>
              {buildFlatTree(parentOptions).map(node => (
                <option key={node.id} value={node.id}>
                  {'　'.repeat(node.depth)}{node.depth > 0 ? '↳ ' : ''}{node.name}
                  {node.type ? ` (${node.type})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className={inputCls}
              placeholder="Descrição opcional"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">
            {saving ? 'Salvando...' : editing ? 'Salvar' : 'Cadastrar'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Excluir Unidade"
        message={`Excluir "${deleteTarget?.name}"? Sub-unidades vinculadas perderão o vínculo com o pai.`}
        confirmLabel="Excluir"
      />
    </MainLayout>
  );
}

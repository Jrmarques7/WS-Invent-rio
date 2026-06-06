'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingTable } from '@/components/ui/LoadingTable';
import { usePermissions } from '@/hooks/usePermissions';
import { locationsApi } from '@/lib/api/services/locations';
import { Location, LocationType, LOCATION_TYPE_LABELS, CreateLocationInput } from '@/types/locations';
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon, MapPinIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const emptyForm: CreateLocationInput = { name: '', code: '', type: 'BUILDING', address: '', parent_id: '' };

export default function LocationsPage() {
  const { canWrite, canDelete } = usePermissions();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState<CreateLocationInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await locationsApi.list({ search: search || undefined });
      setLocations(res.data.data);
    } catch {
      toast.error('Erro ao carregar localizações');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(loc: Location) {
    setEditing(loc);
    setForm({ name: loc.name, code: loc.code, type: loc.type, address: loc.address, parent_id: loc.parent_id || '' });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }
    setSaving(true);
    try {
      const payload = { ...form, parent_id: form.parent_id || undefined };
      if (editing) {
        await locationsApi.update(editing.id, payload);
        toast.success('Localização atualizada');
      } else {
        await locationsApi.create(payload);
        toast.success('Localização criada');
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
      await locationsApi.delete(deleteTarget.id);
      toast.success('Localização excluída');
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Localizações</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Prédios, andares, salas e setores</p>
          </div>
          {canWrite && (
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
              <PlusIcon className="w-4 h-4" /> Nova Localização
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} type="text" placeholder="Buscar por nome ou código..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                {['Nome', 'Código', 'Tipo', 'Endereço', 'Pertence a', ''].map((h, i) => (
                  <th key={i} className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {loading ? (
                <LoadingTable cols={6} />
              ) : locations.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <MapPinIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                    <p className="font-medium text-gray-500 dark:text-gray-400">Nenhuma localização cadastrada</p>
                  </div>
                </td></tr>
              ) : locations.map(loc => (
                <tr key={loc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{loc.name}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400 font-mono text-xs">{loc.code || '—'}</td>
                  <td className="px-6 py-4"><StatusBadge value={loc.type} label={LOCATION_TYPE_LABELS[loc.type]} /></td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{loc.address || '—'}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                    {loc.parent?.name || (loc.parent_id ? '...' : '—')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      {canWrite && <button onClick={() => openEdit(loc)} className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><PencilIcon className="w-4 h-4" /></button>}
                      {canDelete && <button onClick={() => setDeleteTarget(loc)} className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><TrashIcon className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Localização' : 'Nova Localização'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Código</label>
              <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo *</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as LocationType }))} className={inputCls}>
                {(Object.entries(LOCATION_TYPE_LABELS) as [LocationType, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endereço</label>
            <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pertence a</label>
            <select value={form.parent_id} onChange={e => setForm(f => ({ ...f, parent_id: e.target.value }))} className={inputCls}>
              <option value="">— Nível raiz —</option>
              {locations.filter(l => l.id !== editing?.id).map(l => (
                <option key={l.id} value={l.id}>{l.name} ({LOCATION_TYPE_LABELS[l.type]})</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting}
        title="Excluir Localização" message={`Excluir "${deleteTarget?.name}"?`} confirmLabel="Excluir" />
    </MainLayout>
  );
}

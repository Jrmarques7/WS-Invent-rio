'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingTable } from '@/components/ui/LoadingTable';
import { Pagination } from '@/components/ui/Pagination';
import { usePermissions } from '@/hooks/usePermissions';
import { usersApi, CreateUserInput, UpdateUserInput } from '@/lib/api/services/users';
import { departmentsApi } from '@/lib/api/services/departments';
import { User, UserRole } from '@/types/auth';
import { Department, buildFlatTree } from '@/types/departments';
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon, KeyIcon, UserIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const ROLE_LABELS: Record<UserRole, string> = { ADMIN: 'Administrador', GESTOR: 'Gestor', RESPONSAVEL: 'Responsável', CONSULTA: 'Consulta' };

const emptyCreate: CreateUserInput = { name: '', email: '', password: '', registration: '', department_id: '', role: 'RESPONSAVEL' };

export default function UsersPage() {
  const { canWrite, canDelete } = usePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, total_pages: 1 });
  const limit = 20;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [createForm, setCreateForm] = useState<CreateUserInput>(emptyCreate);
  const [editForm, setEditForm] = useState<UpdateUserInput>({});
  const [saving, setSaving] = useState(false);

  const [passwordModal, setPasswordModal] = useState<User | null>(null);
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.list({ page, limit, search: search || undefined });
      setUsers(res.data.data);
      setMeta({ total: res.data.meta.total, total_pages: res.data.meta.total_pages });
    } catch {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    departmentsApi.list().then(r => setDepartments(r.data.data)).catch(() => {});
  }, []);

  function openCreate() {
    setEditing(null);
    setCreateForm(emptyCreate);
    setModalOpen(true);
  }

  function openEdit(u: User) {
    setEditing(u);
    setEditForm({ name: u.name, registration: u.registration, department_id: u.department_id ?? undefined, role: u.role, is_active: u.is_active });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editing) {
        await usersApi.update(editing.id, editForm);
        toast.success('Usuário atualizado');
      } else {
        if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password) {
          toast.error('Nome, e-mail e senha são obrigatórios'); setSaving(false); return;
        }
        await usersApi.create(createForm);
        toast.success('Usuário criado');
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao salvar usuário');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!pwForm.new || pwForm.new !== pwForm.confirm) { toast.error('As senhas não coincidem'); return; }
    setSavingPw(true);
    try {
      await usersApi.changePassword({ current: pwForm.current, new: pwForm.new });
      toast.success('Senha alterada');
      setPasswordModal(null);
      setPwForm({ current: '', new: '', confirm: '' });
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao alterar senha');
    } finally {
      setSavingPw(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await usersApi.delete(deleteTarget.id);
      toast.success('Usuário excluído');
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Usuários</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Gerenciamento de usuários e permissões</p>
          </div>
          {canWrite && (
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
              <PlusIcon className="w-4 h-4" /> Novo Usuário
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} type="text" placeholder="Buscar usuário..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                {['Nome', 'E-mail', 'Matrícula', 'Setor', 'Perfil', 'Status', ''].map((h, i) => (
                  <th key={i} className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {loading ? (
                <LoadingTable cols={7} />
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <UserIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                    <p className="font-medium text-gray-500 dark:text-gray-400">Nenhum usuário encontrado</p>
                  </div>
                </td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{u.name}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{u.email}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{u.registration || '—'}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{u.department_ref?.name || u.department || '—'}</td>
                  <td className="px-6 py-4"><StatusBadge value={u.role} label={ROLE_LABELS[u.role]} /></td>
                  <td className="px-6 py-4"><StatusBadge value={u.is_active ? 'ACTIVE' : 'INACTIVE'} label={u.is_active ? 'Ativo' : 'Inativo'} /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setPasswordModal(u)} className="p-1.5 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Alterar Senha"><KeyIcon className="w-4 h-4" /></button>
                      {canWrite && <button onClick={() => openEdit(u)} className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><PencilIcon className="w-4 h-4" /></button>}
                      {canDelete && <button onClick={() => setDeleteTarget(u)} className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><TrashIcon className="w-4 h-4" /></button>}
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
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Usuário' : 'Novo Usuário'}>
        <div className="space-y-4">
          {!editing && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
                <input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail *</label>
                <input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha *</label>
                <input type="password" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Matrícula</label>
                  <input value={createForm.registration} onChange={e => setCreateForm(f => ({ ...f, registration: e.target.value }))} className={inputCls} />
                </div>
                <div>
	                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unidade</label>
	                  <select value={createForm.department_id ?? ''} onChange={e => setCreateForm(f => ({ ...f, department_id: e.target.value || undefined }))} className={inputCls}>
	                    <option value="">— Sem unidade —</option>
	                    {buildFlatTree(departments).map(node => (
	                      <option key={node.id} value={node.id}>{'　'.repeat(node.depth)}{node.depth > 0 ? '↳ ' : ''}{node.name}</option>
	                    ))}
	                  </select>
	                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Perfil</label>
                <select value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value as UserRole }))} className={inputCls}>
                  {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </>
          )}
          {editing && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
                <input value={editForm.name ?? ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Matrícula</label>
                  <input value={editForm.registration ?? ''} onChange={e => setEditForm(f => ({ ...f, registration: e.target.value }))} className={inputCls} />
                </div>
                <div>
	                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unidade</label>
	                  <select value={editForm.department_id ?? ''} onChange={e => setEditForm(f => ({ ...f, department_id: e.target.value || undefined }))} className={inputCls}>
	                    <option value="">— Sem unidade —</option>
	                    {buildFlatTree(departments).map(node => (
	                      <option key={node.id} value={node.id}>{'　'.repeat(node.depth)}{node.depth > 0 ? '↳ ' : ''}{node.name}</option>
	                    ))}
	                  </select>
	                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Perfil</label>
                <select value={editForm.role ?? 'RESPONSAVEL'} onChange={e => setEditForm(f => ({ ...f, role: e.target.value as UserRole }))} className={inputCls}>
                  {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={editForm.is_active ?? true} onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded border-gray-300" />
                <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">Usuário ativo</label>
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal open={!!passwordModal} onClose={() => setPasswordModal(null)} title={`Alterar Senha — ${passwordModal?.name}`} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha atual</label>
            <input type="password" value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nova senha</label>
            <input type="password" value={pwForm.new} onChange={e => setPwForm(f => ({ ...f, new: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirmar nova senha</label>
            <input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setPasswordModal(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
          <button onClick={handleChangePassword} disabled={savingPw} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">{savingPw ? 'Salvando...' : 'Alterar Senha'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting}
        title="Excluir Usuário" message={`Excluir o usuário "${deleteTarget?.name}"?`} confirmLabel="Excluir" />
    </MainLayout>
  );
}

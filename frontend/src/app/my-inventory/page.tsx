'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { meApi } from '@/lib/api/services/me';
import { InventoryItem, VerifyItemInput } from '@/types/inventory';
import { AssetCondition, CONDITION_LABELS } from '@/types/assets';
import { ChatBubbleLeftRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function MyInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<InventoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Omit<VerifyItemInput, 'asset_id'>>({
    found: true,
    actual_condition: 'GOOD',
    notes: '',
  });

  async function load() {
    setLoading(true);
    try {
      const res = await meApi.inventory();
      setItems(res.data.data);
    } catch {
      toast.error('Erro ao carregar seu inventário');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openFeedback(item: InventoryItem) {
    setTarget(item);
    setForm({
      found: item.found ?? true,
      actual_condition: item.actual_condition ?? item.asset?.condition ?? 'GOOD',
      notes: item.notes ?? '',
    });
  }

  async function submitFeedback() {
    if (!target) return;
    setSaving(true);
    try {
      await meApi.verifyInventory(target.inventory_id, {
        ...form,
        asset_id: target.asset.id,
      });
      toast.success('Feedback registrado');
      setTarget(null);
      load();
    } catch {
      toast.error('Erro ao registrar feedback');
    } finally {
      setSaving(false);
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meu Inventário</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Conferência dos bens sob sua responsabilidade</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                {['Inventário', 'Bem', 'Responsável esperado', 'Local esperado', 'Condição informada', 'Feedback', ''].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 6 }).map((__, j) => <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>)}</tr>
                ))
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                    <p className="font-medium text-gray-500 dark:text-gray-400">Nenhuma pendência de inventário</p>
                  </div>
                </td></tr>
              ) : items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{item.inventory?.name ?? 'Inventário'}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{item.asset?.name}</div>
                    <div className="text-xs font-mono text-gray-500">{item.asset?.patrimony_number}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{item.expected_user?.name || '—'}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{item.expected_location?.name || item.asset?.location?.name || '—'}</td>
                  <td className="px-6 py-4">{item.actual_condition ? <StatusBadge value={item.actual_condition} label={CONDITION_LABELS[item.actual_condition]} /> : '—'}</td>
                  <td className="px-6 py-4">
                    {item.verified_at ? (
                      <span className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400"><CheckCircleIcon className="w-4 h-4" /> Enviado</span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">Pendente</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openFeedback(item)} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                      {item.verified_at ? 'Editar feedback' : 'Enviar feedback'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!target} onClose={() => setTarget(null)} title="Feedback de Inventário">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Bem</p>
            <p className="font-medium text-gray-900 dark:text-white">{target?.asset?.name}</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={form.found} onChange={(e) => setForm(f => ({ ...f, found: e.target.checked }))} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            Bem encontrado
          </label>
          <select value={form.actual_condition} onChange={(e) => setForm(f => ({ ...f, actual_condition: e.target.value as AssetCondition }))} className={inputCls}>
            {(Object.entries(CONDITION_LABELS) as [AssetCondition, string][]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observações sobre o bem" rows={4} className={inputCls} />
          <div className="flex justify-end gap-3">
            <button onClick={() => setTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
            <button onClick={submitFeedback} disabled={saving} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">{saving ? 'Enviando...' : 'Enviar'}</button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}

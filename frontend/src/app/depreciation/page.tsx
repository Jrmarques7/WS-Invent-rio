'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { LoadingTable } from '@/components/ui/LoadingTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { usePermissions } from '@/hooks/usePermissions';
import { depreciationApi } from '@/lib/api/services/depreciation';
import { formatCurrency } from '@/lib/format';
import { DepreciationRecord } from '@/types/depreciation';
import { DEPRECIATION_METHOD_LABELS } from '@/types/categories';
import { ArrowPathIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function DepreciationPage() {
  const { canWrite } = usePermissions();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [records, setRecords] = useState<DepreciationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await depreciationApi.getPeriod({ year, month });
      setRecords(res.data.data);
    } catch {
      toast.error('Erro ao carregar depreciações');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  async function handleCalculate() {
    setCalculating(true);
    try {
      await depreciationApi.calculate({ year, month });
      toast.success(`Depreciação calculada para ${MONTHS[month - 1]}/${year}`);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao calcular depreciação');
    } finally {
      setCalculating(false);
    }
  }

  const totalDeprec = records.reduce((s, r) => s + r.depreciation_amount, 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Depreciação</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Cálculo e histórico de depreciação dos bens</p>
          </div>
          {canWrite && (
            <button onClick={handleCalculate} disabled={calculating} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
              <ArrowPathIcon className={`w-4 h-4 ${calculating ? 'animate-spin' : ''}`} />
              {calculating ? 'Calculando...' : 'Calcular Mês'}
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Período:</span>
            <select value={month} onChange={e => setMonth(+e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(+e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {records.length > 0 && (
              <span className="ml-auto text-sm text-gray-600 dark:text-gray-400">
                Total depreciado: <strong className="text-gray-900 dark:text-white">{formatCurrency(totalDeprec)}</strong>
              </span>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                {['Bem', 'Nº Patrimônio', 'Valor Inicial', 'Depreciação', 'Valor Final', 'Método'].map((h, i) => (
                  <th key={i} className={`px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${h === 'Bem' ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {loading ? (
                <LoadingTable cols={6} />
              ) : records.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <CurrencyDollarIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                    <p className="font-medium text-gray-500 dark:text-gray-400">Nenhum registro de depreciação para o período</p>
                    {canWrite && <p className="text-sm text-gray-400">Clique em <strong>Calcular Mês</strong> para processar</p>}
                  </div>
                </td></tr>
              ) : records.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{r.asset?.name}</td>
                  <td className="px-6 py-4 text-right font-mono text-xs text-gray-600 dark:text-gray-400">{r.asset?.patrimony_number}</td>
                  <td className="px-6 py-4 text-right text-gray-700 dark:text-gray-300">{formatCurrency(r.opening_value)}</td>
                  <td className="px-6 py-4 text-right text-red-600 dark:text-red-400 font-medium">-{formatCurrency(r.depreciation_amount)}</td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(r.closing_value)}</td>
                  <td className="px-6 py-4 text-right">
                    <StatusBadge value={r.method} label={DEPRECIATION_METHOD_LABELS[r.method] ?? r.method} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}

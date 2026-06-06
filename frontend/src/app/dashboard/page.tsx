'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { assetsApi } from '@/lib/api/services/assets';
import { movementsApi } from '@/lib/api/services/movements';
import { maintenanceApi } from '@/lib/api/services/maintenance';
import { meApi } from '@/lib/api/services/me';
import { usePermissions } from '@/hooks/usePermissions';
import { Movement, Custody } from '@/types/assets';
import { CONDITION_LABELS, ASSET_STATUS_LABELS } from '@/types/assets';
import {
  ArchiveBoxIcon,
  ArchiveBoxXMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';

const TYPE_LABELS: Record<string, string> = {
  TRANSFER: 'Transferência', LOAN: 'Empréstimo', RETURN: 'Devolução', RELOCATION: 'Realocação',
};

interface Stats {
  total: number;
  active: number;
  maintenance: number;
  writtenOff: number;
  scheduledMaintenance: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { isResponsavel, user } = usePermissions();

  // General stats (ADMIN/GESTOR/CONSULTA)
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, maintenance: 0, writtenOff: 0, scheduledMaintenance: 0 });
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  // RESPONSAVEL view
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [custodiesLoading, setCustodiesLoading] = useState(true);

  useEffect(() => {
    if (isResponsavel) {
      if (!user) return;
      meApi.custody()
        .then(r => setCustodies(r.data.data))
        .catch(() => {})
        .finally(() => setCustodiesLoading(false));
      return;
    }

    async function load() {
      try {
        const [totalRes, activeRes, maintRes, offRes, schedRes, movRes] = await Promise.all([
          assetsApi.list({ limit: 1 }),
          assetsApi.list({ status: 'ACTIVE', limit: 1 }),
          assetsApi.list({ status: 'UNDER_MAINTENANCE', limit: 1 }),
          assetsApi.list({ status: 'WRITTEN_OFF', limit: 1 }),
          maintenanceApi.list({ status: 'SCHEDULED', limit: 1 }),
          movementsApi.list({ limit: 5 }),
        ]);
        setStats({
          total: totalRes.data.meta.total,
          active: activeRes.data.meta.total,
          maintenance: maintRes.data.meta.total,
          writtenOff: offRes.data.meta.total,
          scheduledMaintenance: schedRes.data.meta.total,
        });
        setMovements(movRes.data.data);
      } catch {
        // silently fail — page still renders with zeros
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isResponsavel, user]);

  if (isResponsavel) {
    const active = custodies.filter(c => c.is_active);
    return (
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Minha Carga Patrimonial</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Bens sob sua responsabilidade</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <p className={`text-3xl font-bold ${custodiesLoading ? 'text-gray-300 dark:text-gray-600' : 'text-blue-600 dark:text-blue-400'}`}>
                {custodiesLoading ? '—' : active.length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Bens sob custódia</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 md:col-span-2 flex items-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Para registrar manutenções ou verificar o inventário dos seus bens, use os itens no menu lateral.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">Bens Sob Custódia</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  {['Nº Patrimônio', 'Bem', 'Localização', 'Condição', 'Status'].map((h, i) => (
                    <th key={i} className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {custodiesLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : active.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <ArchiveBoxIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                        <p className="font-medium text-gray-500 dark:text-gray-400">Nenhum bem sob sua custódia</p>
                      </div>
                    </td>
                  </tr>
                ) : active.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-6 py-4 font-mono text-xs text-gray-500 dark:text-gray-400">{c.asset?.patrimony_number}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{c.asset?.name}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{c.asset?.location?.name || '—'}</td>
                    <td className="px-6 py-4"><StatusBadge value={c.asset?.condition} label={CONDITION_LABELS[c.asset?.condition] ?? c.asset?.condition} /></td>
                    <td className="px-6 py-4"><StatusBadge value={c.asset?.status} label={ASSET_STATUS_LABELS[c.asset?.status] ?? c.asset?.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </MainLayout>
    );
  }

  const statCards = [
    { label: 'Total de Bens', value: stats.total, color: 'blue', icon: ArchiveBoxIcon, href: '/assets' },
    { label: 'Bens Ativos', value: stats.active, color: 'green', icon: CheckCircleIcon, href: '/assets?status=ACTIVE' },
    { label: 'Em Manutenção', value: stats.maintenance, color: 'yellow', icon: WrenchScrewdriverIcon, href: '/maintenance' },
    { label: 'Baixados', value: stats.writtenOff, color: 'red', icon: ArchiveBoxXMarkIcon, href: '/assets?status=WRITTEN_OFF' },
  ];

  const colorMap: Record<string, string> = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    red: 'text-red-600 dark:text-red-400',
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Visão geral do patrimônio</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
            <button key={stat.label} onClick={() => router.push(stat.href)}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-left hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all">
              <div className="flex items-center justify-between mb-4">
                <Icon className={`w-7 h-7 ${colorMap[stat.color]}`} />
              </div>
              <p className={`text-3xl font-bold ${loading ? 'text-gray-300 dark:text-gray-600' : colorMap[stat.color]}`}>
                {loading ? '—' : stat.value.toLocaleString('pt-BR')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stat.label}</p>
            </button>
            );
          })}
        </div>

        {stats.scheduledMaintenance > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 flex items-center gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 flex-shrink-0" />
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              <strong>{stats.scheduledMaintenance}</strong> manutenção{stats.scheduledMaintenance !== 1 ? 'ões' : ''} agendada{stats.scheduledMaintenance !== 1 ? 's' : ''} pendente{stats.scheduledMaintenance !== 1 ? 's' : ''}.{' '}
              <button onClick={() => router.push('/maintenance')} className="underline font-medium">Ver manutenções</button>
            </p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white">Últimas Movimentações</h2>
            <button onClick={() => router.push('/movements')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Ver todas</button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                {['Data', 'Bem', 'Tipo', 'De', 'Para'].map((h, i) => (
                  <th key={i} className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : movements.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 text-sm">Nenhuma movimentação registrada</td></tr>
              ) : movements.map(m => (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{new Date(m.date).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{m.asset?.name}</div>
                    <div className="text-xs font-mono text-gray-500">{m.asset?.patrimony_number}</div>
                  </td>
                  <td className="px-6 py-4"><StatusBadge value={m.type} label={TYPE_LABELS[m.type] ?? m.type} /></td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-xs">{m.from_user?.name || m.from_location?.name || '—'}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-xs">{m.to_user?.name || m.to_location?.name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}

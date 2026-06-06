'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  ArchiveBoxIcon,
  ArchiveBoxXMarkIcon,
  ArrowsRightLeftIcon,
  CurrencyDollarIcon,
  DocumentArrowDownIcon,
  MapPinIcon,
  UserIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { assetsApi } from '@/lib/api/services/assets';
import { custodyApi } from '@/lib/api/services/custody';
import { movementsApi } from '@/lib/api/services/movements';
import { maintenanceApi } from '@/lib/api/services/maintenance';
import { depreciationApi } from '@/lib/api/services/depreciation';
import { formatCurrency, formatDateBR } from '@/lib/format';
import { Asset, Movement, Custody } from '@/types/assets';
import { Maintenance } from '@/types/maintenance';
import { DepreciationRecord } from '@/types/depreciation';
import toast from 'react-hot-toast';

type ReportFormat = 'pdf' | 'excel';

const ASSET_TYPE_LABELS: Record<string, string> = { MOVEL: 'Bens', IMOVEL: 'Imóvel', CONSUMIVEL: 'Consumível' };
const ASSET_STATUS_LABELS: Record<string, string> = { ACTIVE: 'Ativo', UNDER_MAINTENANCE: 'Em Manutenção', WRITTEN_OFF: 'Baixado', INACTIVE: 'Inativo' };
const CONDITION_LABELS: Record<string, string> = { EXCELLENT: 'Ótimo', GOOD: 'Bom', FAIR: 'Regular', POOR: 'Ruim' };
const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  TRANSFER: 'Transferência',
  LOAN: 'Empréstimo',
  RETURN: 'Devolução',
  RELOCATION: 'Realocação',
  WRITE_OFF: 'Baixa',
  MAINT_START: 'Início de manutenção',
  MAINT_DONE: 'Conclusão de manutenção',
  INVENTORY_DIFF: 'Divergência de inventário',
};
const MAINTENANCE_TYPE_LABELS: Record<string, string> = { PREVENTIVE: 'Preventiva', CORRECTIVE: 'Corretiva' };
const MAINTENANCE_STATUS_LABELS: Record<string, string> = { SCHEDULED: 'Agendada', IN_PROGRESS: 'Em Andamento', COMPLETED: 'Concluída', CANCELLED: 'Cancelada' };
const DEPRECIATION_METHOD_LABELS: Record<string, string> = { LINEAR: 'Linear', DECLINING_BALANCE: 'Saldo Decrescente' };

async function fetchAll<T>(fetcher: (page: number) => Promise<{ data: T[], meta: { total_pages: number } }>): Promise<T[]> {
  const first = await fetcher(1);
  const pages = first.meta.total_pages;
  if (pages <= 1) return first.data;
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => fetcher(i + 2)));
  return [first.data, ...rest.map(r => r.data)].flat();
}

async function generatePDF(title: string, headers: string[], rows: string[][]): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 28);
  autoTable(doc, { head: [headers], body: rows, startY: 34, styles: { fontSize: 8 }, headStyles: { fillColor: [37, 99, 235] } });
  doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}.pdf`);
}

async function generateExcel(title: string, headers: string[], rows: string[][]): Promise<void> {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
  XLSX.writeFile(wb, `${title.toLowerCase().replace(/\s+/g, '_')}.xlsx`);
}

type ReportHandler = (format: ReportFormat) => Promise<void>;

function makeReportHandlers(): Record<string, ReportHandler> {
  return {
    assets: async (format) => {
      const data = await fetchAll<Asset>(async (page) => {
        const r = await assetsApi.list({ page, limit: 100 });
        return r.data;
      });
      const headers = ['Patrimônio', 'Nome', 'Tipo', 'Categoria', 'Localização', 'Condição', 'Status', 'Valor Aquisição', 'Valor Atual'];
      const rows = data.map(a => [
        a.patrimony_number, a.name, ASSET_TYPE_LABELS[a.asset_type] ?? a.asset_type,
        a.category?.name ?? '—', a.location?.name ?? '—',
        CONDITION_LABELS[a.condition] ?? a.condition,
        ASSET_STATUS_LABELS[a.status] ?? a.status,
        formatCurrency(a.acquisition_value ?? 0), formatCurrency(a.current_value ?? 0),
      ]);
      if (format === 'pdf') await generatePDF('Inventário de Bens', headers, rows);
      else await generateExcel('Inventário de Bens', headers, rows);
    },

    custody: async (format) => {
      const data = await fetchAll<Custody>(async (page) => {
        const r = await custodyApi.list({ page, limit: 100 });
        return r.data;
      });
      const headers = ['Patrimônio', 'Bem', 'Responsável', 'Matrícula', 'Setor', 'Início', 'Término', 'Status'];
      const rows = data.map(c => [
        c.asset?.patrimony_number ?? '—', c.asset?.name ?? '—',
        c.user?.name ?? '—', c.user?.registration ?? '—', c.user?.department_ref?.name ?? c.user?.department ?? '—',
        formatDateBR(c.start_date), formatDateBR(c.end_date),
        c.end_date ? 'Encerrada' : 'Ativa',
      ]);
      if (format === 'pdf') await generatePDF('Carga Patrimonial por Usuário', headers, rows);
      else await generateExcel('Carga Patrimonial por Usuário', headers, rows);
    },

    byLocation: async (format) => {
      const data = await fetchAll<Asset>(async (page) => {
        const r = await assetsApi.list({ page, limit: 100 });
        return r.data;
      });
      const headers = ['Localização', 'Patrimônio', 'Nome', 'Tipo', 'Condição', 'Status'];
      const rows = data
        .sort((a, b) => (a.location?.name ?? '').localeCompare(b.location?.name ?? ''))
        .map(a => [
          a.location?.name ?? '—', a.patrimony_number, a.name,
          ASSET_TYPE_LABELS[a.asset_type] ?? a.asset_type,
          CONDITION_LABELS[a.condition] ?? a.condition,
          ASSET_STATUS_LABELS[a.status] ?? a.status,
        ]);
      if (format === 'pdf') await generatePDF('Bens por Localização', headers, rows);
      else await generateExcel('Bens por Localização', headers, rows);
    },

    movements: async (format) => {
      const data = await fetchAll<Movement>(async (page) => {
        const r = await movementsApi.list({ page, limit: 100 });
        return r.data;
      });
      const headers = ['Data', 'Patrimônio', 'Bem', 'Tipo', 'De', 'Para', 'Realizado por', 'Motivo'];
      const rows = data.map(m => [
        formatDateBR(m.date), m.asset?.patrimony_number ?? '—', m.asset?.name ?? '—',
        MOVEMENT_TYPE_LABELS[m.type] ?? m.type,
        m.from_user?.name || m.from_location?.name || '—',
        m.to_user?.name || m.to_location?.name || '—',
        m.performed_by?.name ?? '—', m.reason ?? '—',
      ]);
      if (format === 'pdf') await generatePDF('Histórico de Movimentações', headers, rows);
      else await generateExcel('Histórico de Movimentações', headers, rows);
    },

    maintenance: async (format) => {
      const data = await fetchAll<Maintenance>(async (page) => {
        const r = await maintenanceApi.list({ page, limit: 100 });
        return r.data;
      });
      const headers = ['Bem', 'Tipo', 'Status', 'Fornecedor', 'Agendado', 'Concluído', 'Custo'];
      const rows = data.map(m => [
        m.asset?.name ?? '—',
        MAINTENANCE_TYPE_LABELS[m.type] ?? m.type,
        MAINTENANCE_STATUS_LABELS[m.status] ?? m.status,
        m.provider ?? '—',
        formatDateBR(m.scheduled_date),
        formatDateBR(m.completion_date),
        m.cost != null ? formatCurrency(m.cost) : '—',
      ]);
      if (format === 'pdf') await generatePDF('Manutenções e Custos', headers, rows);
      else await generateExcel('Manutenções e Custos', headers, rows);
    },

    depreciation: async (format) => {
      const now = new Date();
      const r = await depreciationApi.getPeriod({ year: now.getFullYear(), month: now.getMonth() + 1 });
      const data: DepreciationRecord[] = r.data.data;
      const headers = ['Patrimônio', 'Bem', 'Valor Inicial', 'Depreciação', 'Valor Final', 'Método'];
      const rows = data.map(d => [
        d.asset?.patrimony_number ?? '—', d.asset?.name ?? '—',
        formatCurrency(d.opening_value), formatCurrency(d.depreciation_amount), formatCurrency(d.closing_value),
        DEPRECIATION_METHOD_LABELS[d.method] ?? d.method,
      ]);
      if (format === 'pdf') await generatePDF('Depreciação Acumulada', headers, rows);
      else await generateExcel('Depreciação Acumulada', headers, rows);
    },

    writeOff: async (format) => {
      const data = await fetchAll<Asset>(async (page) => {
        const r = await assetsApi.list({ page, limit: 100, status: 'WRITTEN_OFF' });
        return r.data;
      });
      const poor = await fetchAll<Asset>(async (page) => {
        const r = await assetsApi.list({ page, limit: 100 });
        return r.data;
      });
      const combined = [...data, ...poor.filter(a => a.condition === 'POOR' && a.status !== 'WRITTEN_OFF')];
      const unique = Array.from(new Map(combined.map(a => [a.id, a])).values());
      const headers = ['Patrimônio', 'Nome', 'Tipo', 'Condição', 'Status', 'Valor Atual', 'Localização', 'Data da Baixa', 'Motivo da Baixa'];
      const rows = unique.map(a => [
        a.patrimony_number, a.name,
        ASSET_TYPE_LABELS[a.asset_type] ?? a.asset_type,
        CONDITION_LABELS[a.condition] ?? a.condition,
        ASSET_STATUS_LABELS[a.status] ?? a.status,
        formatCurrency(a.current_value ?? 0), a.location?.name ?? '—',
        formatDateBR(a.write_off_date), a.write_off_reason || '—',
      ]);
      if (format === 'pdf') await generatePDF('Bens para Baixa', headers, rows);
      else await generateExcel('Bens para Baixa', headers, rows);
    },
  };
}

const reports = [
  { id: 'assets', title: 'Inventário de Bens', description: 'Lista completa de todos os bens patrimoniais com status atual', icon: ArchiveBoxIcon, formats: ['pdf', 'excel'] as ReportFormat[] },
  { id: 'custody', title: 'Carga Patrimonial por Usuário', description: 'Bens sob responsabilidade de cada usuário/setor', icon: UserIcon, formats: ['pdf', 'excel'] as ReportFormat[] },
  { id: 'byLocation', title: 'Bens por Localização', description: 'Distribuição de bens por prédio, andar e sala', icon: MapPinIcon, formats: ['pdf'] as ReportFormat[] },
  { id: 'movements', title: 'Trilha de Auditoria Patrimonial', description: 'Eventos oficiais de custódia, movimentação, baixa, manutenção e inventário', icon: ArrowsRightLeftIcon, formats: ['excel'] as ReportFormat[] },
  { id: 'maintenance', title: 'Manutenções e Custos', description: 'Histórico de manutenções e gastos por bem', icon: WrenchScrewdriverIcon, formats: ['pdf', 'excel'] as ReportFormat[] },
  { id: 'depreciation', title: 'Depreciação do Mês Atual', description: 'Valor atual vs valor de aquisição dos bens', icon: CurrencyDollarIcon, formats: ['pdf', 'excel'] as ReportFormat[] },
  { id: 'writeOff', title: 'Bens para Baixa', description: 'Bens com vida útil encerrada ou em condição ruim', icon: ArchiveBoxXMarkIcon, formats: ['pdf'] as ReportFormat[] },
];

export default function ReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null);

  async function handleGenerate(reportId: string, format: ReportFormat) {
    const key = `${reportId}-${format}`;
    setGenerating(key);
    try {
      const handlers = makeReportHandlers();
      await handlers[reportId](format);
      toast.success('Relatório gerado com sucesso');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao gerar relatório');
    } finally {
      setGenerating(null);
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gere relatórios em PDF ou Excel</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map(r => {
            const Icon = r.icon;
            return (
            <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <Icon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <div className="flex gap-1">
                  {r.formats.map(f => (
                    <span key={f} className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 uppercase">{f}</span>
                  ))}
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{r.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{r.description}</p>
              <div className="flex gap-2 flex-wrap">
                {r.formats.map(f => {
                  const key = `${r.id}-${f}`;
                  const isLoading = generating === key;
                  return (
                    <button key={f} onClick={() => handleGenerate(r.id, f)} disabled={generating !== null}
                      className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 transition-colors">
                      <DocumentArrowDownIcon className={`w-4 h-4 ${isLoading ? 'animate-bounce' : ''}`} />
                      {isLoading ? 'Gerando...' : f.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}

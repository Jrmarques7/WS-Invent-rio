'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { usePermissions } from '@/hooks/usePermissions';
import { vehiclesApi } from '@/lib/api/services/vehicles';
import { daysUntil } from '@/lib/date';
import { formatCurrency, formatDateBR } from '@/lib/format';
import { calculateAverageConsumption } from '@/lib/vehicles';
import { Vehicle, KmRecord, VehicleMaintenance, FuelRecord, FUEL_TYPE_LABELS, FuelType } from '@/types/vehicles';
import { CONDITION_LABELS, ASSET_STATUS_LABELS } from '@/types/assets';
import { ArrowLeftIcon, CheckCircleIcon, ExclamationTriangleIcon, PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

type Tab = 'dados' | 'km' | 'manutencoes' | 'abastecimentos';

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canWrite, canDelete } = usePermissions();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dados');

  const [kmHistory, setKmHistory] = useState<KmRecord[]>([]);
  const [maintenances, setMaintenances] = useState<VehicleMaintenance[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);

  const [loading, setLoading] = useState(true);

  // KM modal
  const [kmModal, setKmModal] = useState(false);
  const [kmForm, setKmForm] = useState({ km: 0, notes: '' });
  const [savingKm, setSavingKm] = useState(false);

  // Maintenance modal
  const [maintModal, setMaintModal] = useState(false);
  const [maintForm, setMaintForm] = useState({ description: '', interval_km: 0, last_done_km: 0, notes: '' });
  const [savingMaint, setSavingMaint] = useState(false);
  const [deleteMaintTarget, setDeleteMaintTarget] = useState<VehicleMaintenance | null>(null);
  const [deletingMaint, setDeletingMaint] = useState(false);
  const [markDoneTarget, setMarkDoneTarget] = useState<VehicleMaintenance | null>(null);
  const [doneKmForm, setDoneKmForm] = useState(0);
  const [markingDone, setMarkingDone] = useState(false);

  // Fuel modal
  const [fuelModal, setFuelModal] = useState(false);
  const [fuelForm, setFuelForm] = useState({ km: 0, liters: 0, price_per_l: 0, station: '', fuel_type: '' as FuelType | '', full_tank: true });
  const [savingFuel, setSavingFuel] = useState(false);

  const loadVehicle = useCallback(async () => {
    try {
      const r = await vehiclesApi.get(id);
      setVehicle(r.data.data);
    } catch {
      toast.error('Erro ao carregar veículo');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadTabData = useCallback(async (tab: Tab) => {
    try {
      if (tab === 'km') {
        const r = await vehiclesApi.getKmHistory(id);
        setKmHistory(r.data.data);
      } else if (tab === 'manutencoes') {
        const r = await vehiclesApi.getMaintenances(id);
        setMaintenances(r.data.data);
      } else if (tab === 'abastecimentos') {
        const r = await vehiclesApi.getFuelRecords(id);
        setFuelRecords(r.data.data);
      }
    } catch {
      toast.error('Erro ao carregar dados');
    }
  }, [id]);

  useEffect(() => { loadVehicle(); }, [loadVehicle]);
  useEffect(() => { if (activeTab !== 'dados') loadTabData(activeTab); }, [activeTab, loadTabData]);

  async function handleRecordKM() {
    if (!kmForm.km) { toast.error('KM é obrigatório'); return; }
    setSavingKm(true);
    try {
      await vehiclesApi.recordKM(id, kmForm.km, kmForm.notes);
      toast.success('KM registrado');
      setKmModal(false);
      loadVehicle();
      loadTabData('km');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao registrar KM');
    } finally {
      setSavingKm(false);
    }
  }

  async function handleCreateMaintenance() {
    if (!maintForm.description) { toast.error('Descrição é obrigatória'); return; }
    setSavingMaint(true);
    try {
      await vehiclesApi.createMaintenance(id, maintForm);
      toast.success('Manutenção criada');
      setMaintModal(false);
      loadTabData('manutencoes');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao criar manutenção');
    } finally {
      setSavingMaint(false);
    }
  }

  async function handleMarkDone() {
    if (!markDoneTarget || !doneKmForm) { toast.error('KM é obrigatório'); return; }
    setMarkingDone(true);
    try {
      await vehiclesApi.markMaintenanceDone(id, markDoneTarget.id, doneKmForm);
      toast.success('Manutenção concluída');
      setMarkDoneTarget(null);
      loadTabData('manutencoes');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao concluir manutenção');
    } finally {
      setMarkingDone(false);
    }
  }

  async function handleDeleteMaintenance() {
    if (!deleteMaintTarget) return;
    setDeletingMaint(true);
    try {
      await vehiclesApi.deleteMaintenance(id, deleteMaintTarget.id);
      toast.success('Manutenção excluída');
      setDeleteMaintTarget(null);
      loadTabData('manutencoes');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao excluir manutenção');
    } finally {
      setDeletingMaint(false);
    }
  }

  async function handleAddFuel() {
    if (!fuelForm.liters || !fuelForm.price_per_l) { toast.error('Litros e preço são obrigatórios'); return; }
    setSavingFuel(true);
    try {
      await vehiclesApi.addFuelRecord(id, { ...fuelForm, fuel_type: fuelForm.fuel_type || undefined });
      toast.success('Abastecimento registrado');
      setFuelModal(false);
      loadVehicle();
      loadTabData('abastecimentos');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao registrar abastecimento');
    } finally {
      setSavingFuel(false);
    }
  }

  const avgConsumption = calculateAverageConsumption(fuelRecords);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'dados', label: 'Dados' },
    { id: 'km', label: 'KM' },
    { id: 'manutencoes', label: 'Manutenções' },
    { id: 'abastecimentos', label: 'Abastecimentos' },
  ];

  if (loading) return (
    <MainLayout>
      <div className="flex items-center justify-center py-32 text-gray-400">Carregando...</div>
    </MainLayout>
  );

  if (!vehicle) return (
    <MainLayout>
      <div className="flex items-center justify-center py-32 text-gray-400">Veículo não encontrado.</div>
    </MainLayout>
  );

  const docAlerts = [
    { label: 'IPVA', date: vehicle.ipva_due_date, days: daysUntil(vehicle.ipva_due_date) },
    { label: 'Licenciamento', date: vehicle.licensing_due_date, days: daysUntil(vehicle.licensing_due_date) },
    { label: 'Seguro', date: vehicle.insurance_due_date, days: daysUntil(vehicle.insurance_due_date) },
  ].filter(d => d.days !== null && d.days <= 30);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/vehicles')} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{vehicle.name}</h1>
              {vehicle.plate && <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">{vehicle.plate}</span>}
              <StatusBadge value={vehicle.status} label={ASSET_STATUS_LABELS[vehicle.status] ?? vehicle.status} />
              {vehicle.fuel_type && <StatusBadge value={vehicle.fuel_type} label={FUEL_TYPE_LABELS[vehicle.fuel_type] ?? vehicle.fuel_type} />}
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{[vehicle.brand, vehicle.model, vehicle.manufacture_year, vehicle.color].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{vehicle.current_km.toLocaleString('pt-BR')}<span className="text-sm font-normal text-gray-400 ml-1">km</span></p>
            <p className="text-xs text-gray-500 dark:text-gray-400">KM atual</p>
          </div>
        </div>

        {docAlerts.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 flex gap-2 flex-wrap">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
            {docAlerts.map(d => (
              <span key={d.label} className="text-sm text-red-700 dark:text-red-400">
                <strong>{d.label}</strong> vence em {formatDateBR(d.date)} ({d.days! <= 0 ? 'VENCIDO' : `${d.days} dias`})
              </span>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-1">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === t.id ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab: Dados */}
        {activeTab === 'dados' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm uppercase tracking-wider">Identificação</h3>
              {[
                ['Patrimônio', vehicle.patrimony_number],
                ['Placa', vehicle.plate || '—'],
                ['RENAVAM', vehicle.renavam || '—'],
                ['Chassi', vehicle.chassis || '—'],
                ['Nº Motor', vehicle.engine_number || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{k}</span>
                  <span className="font-medium text-gray-900 dark:text-white font-mono">{v}</span>
                </div>
              ))}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm uppercase tracking-wider">Características</h3>
              {[
                ['Marca/Modelo', [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || '—'],
                ['Ano Fabricação', vehicle.manufacture_year || '—'],
                ['Cor', vehicle.color || '—'],
                ['Combustível', vehicle.fuel_type ? FUEL_TYPE_LABELS[vehicle.fuel_type] : '—'],
                ['Condição', CONDITION_LABELS[vehicle.condition] ?? vehicle.condition],
                ['Localização', vehicle.location?.name || '—'],
                ['Unidade', vehicle.department?.name || '—'],
                ['Condutor Principal', vehicle.primary_driver?.name || '—'],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{k}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{String(v)}</span>
                </div>
              ))}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm uppercase tracking-wider">Financeiro</h3>
              {[
                ['Valor Aquisição', formatCurrency(vehicle.acquisition_value)],
                ['Valor Atual', formatCurrency(vehicle.current_value)],
                ['Data Aquisição', formatDateBR(vehicle.acquisition_date)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{k}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{v}</span>
                </div>
              ))}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm uppercase tracking-wider">Documentos</h3>
              {[
                { label: 'IPVA', date: vehicle.ipva_due_date },
                { label: 'Licenciamento', date: vehicle.licensing_due_date },
                { label: 'Seguro', date: vehicle.insurance_due_date },
                { label: 'Seguradora', date: null, value: vehicle.insurance_company || '—' },
              ].map(d => {
                const days = d.date ? daysUntil(d.date) : null;
                const val = d.value ?? formatDateBR(d.date);
                const expired = days !== null && days <= 0;
                const soon = days !== null && days > 0 && days <= 30;
                return (
                  <div key={d.label} className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{d.label}</span>
                    <span className={`font-medium ${expired ? 'text-red-600 dark:text-red-400' : soon ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}`}>{val}</span>
                  </div>
                );
              })}
            </div>
            {vehicle.notes && (
              <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm uppercase tracking-wider mb-2">Observações</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{vehicle.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Tab: KM */}
        {activeTab === 'km' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              {canWrite && (
                <button onClick={() => { setKmForm({ km: vehicle.current_km, notes: '' }); setKmModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                  <PlusIcon className="w-4 h-4" /> Registrar KM
                </button>
              )}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    {['Data', 'KM', 'Registrado por', 'Observações'].map((h, i) => (
                      <th key={i} className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {kmHistory.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm">Nenhum registro de KM</td></tr>
                  ) : kmHistory.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{new Date(r.recorded_at).toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{r.km.toLocaleString('pt-BR')} km</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-xs">{r.recorded_by?.name || '—'}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-xs">{r.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Manutenções */}
        {activeTab === 'manutencoes' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              {canWrite && (
                <button onClick={() => { setMaintForm({ description: '', interval_km: 10000, last_done_km: vehicle.current_km, notes: '' }); setMaintModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                  <PlusIcon className="w-4 h-4" /> Nova Manutenção
                </button>
              )}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    {['Descrição', 'Intervalo', 'Último (KM)', 'Próximo (KM)', 'Situação', ''].map((h, i) => (
                      <th key={i} className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {maintenances.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">Nenhuma manutenção programada</td></tr>
                  ) : maintenances.map(m => {
                    const overdue = vehicle.current_km >= m.next_due_km && m.next_due_km > 0;
                    const soon = !overdue && m.next_due_km > 0 && (m.next_due_km - vehicle.current_km) <= 500;
                    return (
                      <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{m.description}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{m.interval_km > 0 ? `${m.interval_km.toLocaleString('pt-BR')} km` : '—'}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{m.last_done_km > 0 ? `${m.last_done_km.toLocaleString('pt-BR')} km` : '—'}</td>
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{m.next_due_km > 0 ? `${m.next_due_km.toLocaleString('pt-BR')} km` : '—'}</td>
                        <td className="px-6 py-4">
                          {overdue ? <StatusBadge value="WRITTEN_OFF" label="Vencida" /> : soon ? <StatusBadge value="UNDER_MAINTENANCE" label="Em breve" /> : <StatusBadge value="ACTIVE" label="OK" />}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {canWrite && <button onClick={() => { setMarkDoneTarget(m); setDoneKmForm(vehicle.current_km); }} className="text-xs text-green-600 dark:text-green-400 hover:underline font-medium">Concluída</button>}
                            {canDelete && <button onClick={() => setDeleteMaintTarget(m)} className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium">Excluir</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Abastecimentos */}
        {activeTab === 'abastecimentos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {avgConsumption ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-2">
                  <p className="text-sm text-green-800 dark:text-green-300">Consumo médio: <strong>{avgConsumption} km/l</strong></p>
                </div>
              ) : <div />}
              {canWrite && (
                <button onClick={() => { setFuelForm({ km: vehicle.current_km, liters: 0, price_per_l: 0, station: '', fuel_type: vehicle.fuel_type ?? '', full_tank: true }); setFuelModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                  <PlusIcon className="w-4 h-4" /> Registrar Abastecimento
                </button>
              )}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    {['Data', 'KM', 'Litros', 'Preço/L', 'Total', 'Posto', 'Combustível', 'Tanque Cheio'].map((h, i) => (
                      <th key={i} className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {fuelRecords.length === 0 ? (
                    <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-400 text-sm">Nenhum abastecimento registrado</td></tr>
                  ) : fuelRecords.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{new Date(r.recorded_at).toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{r.km.toLocaleString('pt-BR')} km</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{r.liters.toFixed(3)} L</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{formatCurrency(r.price_per_l)}</td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{formatCurrency(r.total_cost)}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-xs">{r.station || '—'}</td>
                      <td className="px-6 py-4">{r.fuel_type ? <StatusBadge value={r.fuel_type} label={FUEL_TYPE_LABELS[r.fuel_type] ?? r.fuel_type} /> : '—'}</td>
                      <td className="px-6 py-4 text-center">
                        {r.full_tank ? <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto" /> : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* KM Modal */}
      <Modal open={kmModal} onClose={() => setKmModal(false)} title="Registrar KM" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">KM Atual *</label>
            <input type="number" min="0" value={kmForm.km} onChange={e => setKmForm(f => ({ ...f, km: +e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
            <input value={kmForm.notes} onChange={e => setKmForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setKmModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
          <button onClick={handleRecordKM} disabled={savingKm} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">{savingKm ? 'Salvando...' : 'Registrar'}</button>
        </div>
      </Modal>

      {/* Maintenance Modal */}
      <Modal open={maintModal} onClose={() => setMaintModal(false)} title="Nova Manutenção por KM" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição *</label>
            <input value={maintForm.description} onChange={e => setMaintForm(f => ({ ...f, description: e.target.value }))} className={inputCls} placeholder="Ex: Troca de óleo" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Intervalo (km)</label>
            <input type="number" min="0" value={maintForm.interval_km} onChange={e => setMaintForm(f => ({ ...f, interval_km: +e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">KM da última vez feita</label>
            <input type="number" min="0" value={maintForm.last_done_km} onChange={e => setMaintForm(f => ({ ...f, last_done_km: +e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
            <input value={maintForm.notes} onChange={e => setMaintForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} />
          </div>
          <p className="text-xs text-gray-400">Próxima manutenção: {(maintForm.last_done_km + maintForm.interval_km).toLocaleString('pt-BR')} km</p>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setMaintModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
          <button onClick={handleCreateMaintenance} disabled={savingMaint} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">{savingMaint ? 'Salvando...' : 'Criar'}</button>
        </div>
      </Modal>

      {/* Mark Done Modal */}
      <Modal open={!!markDoneTarget} onClose={() => setMarkDoneTarget(null)} title={`Concluir: ${markDoneTarget?.description}`} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">KM em que foi feita *</label>
            <input type="number" min="0" value={doneKmForm} onChange={e => setDoneKmForm(+e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setMarkDoneTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
          <button onClick={handleMarkDone} disabled={markingDone} className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50">{markingDone ? 'Salvando...' : 'Confirmar'}</button>
        </div>
      </Modal>

      {/* Fuel Modal */}
      <Modal open={fuelModal} onClose={() => setFuelModal(false)} title="Registrar Abastecimento" size="sm">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">KM Atual</label>
              <input type="number" min="0" value={fuelForm.km} onChange={e => setFuelForm(f => ({ ...f, km: +e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Litros *</label>
              <input type="number" min="0" step="0.001" value={fuelForm.liters || ''} onChange={e => setFuelForm(f => ({ ...f, liters: +e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preço/L (R$) *</label>
              <input type="number" min="0" step="0.001" value={fuelForm.price_per_l || ''} onChange={e => setFuelForm(f => ({ ...f, price_per_l: +e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total</label>
              <input readOnly value={formatCurrency(fuelForm.liters * fuelForm.price_per_l)} className={`${inputCls} opacity-60`} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Combustível</label>
            <select value={fuelForm.fuel_type} onChange={e => setFuelForm(f => ({ ...f, fuel_type: e.target.value as FuelType }))} className={inputCls}>
              <option value="">— Mesmo do veículo —</option>
              {Object.entries(FUEL_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Posto</label>
            <input value={fuelForm.station} onChange={e => setFuelForm(f => ({ ...f, station: e.target.value }))} className={inputCls} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={fuelForm.full_tank} onChange={e => setFuelForm(f => ({ ...f, full_tank: e.target.checked }))} className="rounded" />
            Tanque cheio (usado para calcular consumo médio)
          </label>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setFuelModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
          <button onClick={handleAddFuel} disabled={savingFuel} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">{savingFuel ? 'Salvando...' : 'Registrar'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteMaintTarget} onClose={() => setDeleteMaintTarget(null)} onConfirm={handleDeleteMaintenance} loading={deletingMaint}
        title="Excluir Manutenção" message={`Excluir "${deleteMaintTarget?.description}"?`} confirmLabel="Excluir" />
    </MainLayout>
  );
}

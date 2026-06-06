'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LoadingTable } from '@/components/ui/LoadingTable';
import { Pagination } from '@/components/ui/Pagination';
import { usePermissions } from '@/hooks/usePermissions';
import { vehiclesApi } from '@/lib/api/services/vehicles';
import { locationsApi } from '@/lib/api/services/locations';
import { departmentsApi } from '@/lib/api/services/departments';
import { driversApi } from '@/lib/api/services/drivers';
import { daysUntil } from '@/lib/date';
import { formatDateBR } from '@/lib/format';
import { Vehicle, CreateVehicleInput, UpdateVehicleInput, FUEL_TYPE_LABELS, FuelType } from '@/types/vehicles';
import { ASSET_STATUS_LABELS, AssetStatus, CONDITION_LABELS, AssetCondition } from '@/types/assets';
import { Location } from '@/types/locations';
import { Department, buildFlatTree } from '@/types/departments';
import { Driver, CreateDriverInput, UpdateDriverInput, CNH_CATEGORY_LABELS, DRIVER_STATUS_LABELS, DriverStatus, CNHCategory } from '@/types/drivers';
import { BoltIcon, ExclamationTriangleIcon, PlusIcon, EyeIcon, TruckIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

type Tab = 'vehicles' | 'drivers';

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

const emptyVehicle: CreateVehicleInput = {
  name: '', brand: '', model: '', manufacture_year: new Date().getFullYear(),
  plate: '', renavam: '', chassis: '', engine_number: '',
  fuel_type: 'GASOLINA', color: '', acquisition_value: 0,
  condition: 'GOOD', current_km: 0, notes: '',
  ipva_due_date: '', licensing_due_date: '', insurance_due_date: '', insurance_company: '',
  department_id: '', primary_driver_id: '',
};

const emptyDriver: CreateDriverInput = {
  name: '', cpf: '', cnh: '', cnh_category: '', cnh_expiry: null, phone: '', email: '', notes: '',
};

export default function VehiclesPage() {
  const router = useRouter();
  const { canWrite, canDelete } = usePermissions();
  const [tab, setTab] = useState<Tab>('vehicles');

  // shared reference data
  const [locations, setLocations] = useState<Location[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);

  const [nextVehicleNumber, setNextVehicleNumber] = useState('');

  // ---------- Vehicles ----------
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingV, setLoadingV] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fuelFilter, setFuelFilter] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, total_pages: 1 });
  const limit = 20;

  const [vModal, setVModal] = useState(false);
  const [editingV, setEditingV] = useState<Vehicle | null>(null);
  const [createVForm, setCreateVForm] = useState<CreateVehicleInput>(emptyVehicle);
  const [editVForm, setEditVForm] = useState<UpdateVehicleInput>({});
  const [savingV, setSavingV] = useState(false);
  const [writeOffTarget, setWriteOffTarget] = useState<Vehicle | null>(null);
  const [writeOffForm, setWriteOffForm] = useState({ date: '', reason: '' });
  const [writingOff, setWritingOff] = useState(false);
  const [deleteVTarget, setDeleteVTarget] = useState<Vehicle | null>(null);
  const [deletingV, setDeletingV] = useState(false);

  // ---------- Drivers ----------
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverSearch, setDriverSearch] = useState('');
  const [driverStatusFilter, setDriverStatusFilter] = useState('');
  const [loadingD, setLoadingD] = useState(false);
  const [driverModal, setDriverModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [driverForm, setDriverForm] = useState<CreateDriverInput>(emptyDriver);
  const [editDriverForm, setEditDriverForm] = useState<UpdateDriverInput>({ ...emptyDriver, status: 'ACTIVE' });
  const [savingDriver, setSavingDriver] = useState(false);
  const [deleteDriverTarget, setDeleteDriverTarget] = useState<Driver | null>(null);
  const [deletingDriver, setDeletingDriver] = useState(false);

  // ---------- Loaders ----------
  const loadVehicles = useCallback(async () => {
    setLoadingV(true);
    try {
      const res = await vehiclesApi.list({ page, limit, search: search || undefined, status: statusFilter || undefined, fuel_type: fuelFilter || undefined });
      setVehicles(res.data.data);
      setMeta({ total: res.data.meta.total, total_pages: res.data.meta.total_pages });
    } catch { toast.error('Erro ao carregar veículos'); }
    finally { setLoadingV(false); }
  }, [page, search, statusFilter, fuelFilter]);

  const loadDrivers = useCallback(async () => {
    setLoadingD(true);
    try {
      const res = await driversApi.list({ search: driverSearch || undefined, status: driverStatusFilter as DriverStatus || undefined });
      setDrivers(res.data.data);
    } catch { toast.error('Erro ao carregar condutores'); }
    finally { setLoadingD(false); }
  }, [driverSearch, driverStatusFilter]);

  useEffect(() => { loadVehicles(); }, [loadVehicles]);
  useEffect(() => {
    locationsApi.list().then(r => setLocations(r.data.data)).catch(() => {});
    departmentsApi.list().then(r => setDepartments(r.data.data)).catch(() => {});
    // load all active drivers for the vehicle form select
    driversApi.list({ status: 'ACTIVE' }).then(r => setAllDrivers(r.data.data)).catch(() => {});
  }, []);
  useEffect(() => { loadDrivers(); }, [loadDrivers]);
  useEffect(() => { if (tab === 'drivers') loadDrivers(); }, [tab, loadDrivers]);

  // ---------- Vehicle actions ----------
  const docsExpiring = vehicles.filter(v => {
    return [daysUntil(v.ipva_due_date), daysUntil(v.licensing_due_date), daysUntil(v.insurance_due_date)].some(d => d !== null && d <= 30);
  }).length;

  async function saveVehicle() {
    setSavingV(true);
    try {
      if (editingV) {
        await vehiclesApi.update(editingV.id, editVForm);
        toast.success('Veículo atualizado');
      } else {
        if (!createVForm.name) { toast.error('Nome é obrigatório'); setSavingV(false); return; }
        await vehiclesApi.create(createVForm);
        toast.success('Veículo cadastrado');
      }
      setVModal(false);
      loadVehicles();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Erro ao salvar'); }
    finally { setSavingV(false); }
  }

  async function handleWriteOff() {
    if (!writeOffTarget || !writeOffForm.date || !writeOffForm.reason) { toast.error('Data e motivo são obrigatórios'); return; }
    setWritingOff(true);
    try {
      await vehiclesApi.writeOff(writeOffTarget.id, writeOffForm);
      toast.success('Baixa registrada');
      setWriteOffTarget(null);
      loadVehicles();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Erro ao dar baixa'); }
    finally { setWritingOff(false); }
  }

  async function deleteVehicle() {
    if (!deleteVTarget) return;
    setDeletingV(true);
    try {
      await vehiclesApi.delete(deleteVTarget.id);
      toast.success('Veículo excluído');
      setDeleteVTarget(null);
      loadVehicles();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Erro ao excluir'); }
    finally { setDeletingV(false); }
  }

  function openCreateV() {
    setEditingV(null);
    setCreateVForm(emptyVehicle);
    setNextVehicleNumber('');
    vehiclesApi.nextNumber().then(r => setNextVehicleNumber(r.data.data.number)).catch(() => {});
    setVModal(true);
  }

  function openEditV(v: Vehicle) {
    setEditingV(v);
    setEditVForm({
      name: v.name, brand: v.brand, model: v.model, manufacture_year: v.manufacture_year,
      plate: v.plate, renavam: v.renavam, chassis: v.chassis, engine_number: v.engine_number,
      fuel_type: v.fuel_type, color: v.color, condition: v.condition, status: v.status,
      location_id: v.location?.id ?? undefined,
      department_id: v.department?.id ?? null,
      primary_driver_id: v.primary_driver?.id ?? null,
      notes: v.notes, insurance_company: v.insurance_company,
      ipva_due_date: v.ipva_due_date?.split('T')[0] ?? undefined,
      licensing_due_date: v.licensing_due_date?.split('T')[0] ?? undefined,
      insurance_due_date: v.insurance_due_date?.split('T')[0] ?? undefined,
    });
    setVModal(true);
  }

  const setCF = (k: keyof CreateVehicleInput, val: any) => setCreateVForm(f => ({ ...f, [k]: val }));
  const setEF = (k: keyof UpdateVehicleInput, val: any) => setEditVForm(f => ({ ...f, [k]: val }));

  // ---------- Driver actions ----------
  async function saveDriver() {
    setSavingDriver(true);
    try {
      if (editingDriver) {
        await driversApi.update(editingDriver.id, editDriverForm);
        toast.success('Condutor atualizado');
      } else {
        if (!driverForm.name) { toast.error('Nome é obrigatório'); setSavingDriver(false); return; }
        await driversApi.create(driverForm);
        toast.success('Condutor cadastrado');
      }
      setDriverModal(false);
      loadDrivers();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Erro ao salvar'); }
    finally { setSavingDriver(false); }
  }

  async function deleteDriver() {
    if (!deleteDriverTarget) return;
    setDeletingDriver(true);
    try {
      await driversApi.delete(deleteDriverTarget.id);
      toast.success('Condutor excluído');
      setDeleteDriverTarget(null);
      loadDrivers();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Erro ao excluir'); }
    finally { setDeletingDriver(false); }
  }

  function openCreateDriver() { setEditingDriver(null); setDriverForm(emptyDriver); setDriverModal(true); }

  function openEditDriver(d: Driver) {
    setEditingDriver(d);
    setEditDriverForm({
      name: d.name, cpf: d.cpf, cnh: d.cnh, cnh_category: d.cnh_category,
      cnh_expiry: d.cnh_expiry ? d.cnh_expiry.split('T')[0] : null,
      phone: d.phone, email: d.email, notes: d.notes, status: d.status,
    });
    setDriverModal(true);
  }

  const cnhExpired = (d: Driver) => d.cnh_expiry ? new Date(d.cnh_expiry) < new Date() : false;
  const cnhExpiring = (d: Driver) => { const days = daysUntil(d.cnh_expiry); return days !== null && days >= 0 && days <= 30; };

  const tabs = [
    { key: 'vehicles' as Tab, label: 'Veículos', icon: TruckIcon, count: meta.total },
    { key: 'drivers' as Tab, label: 'Condutores', icon: UserGroupIcon, count: drivers.length },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Frota</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Gestão de frota e condutores</p>
          </div>
          {canWrite && tab === 'vehicles' && (
            <button onClick={openCreateV} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
              <PlusIcon className="w-4 h-4" /> Novo Veículo
            </button>
          )}
          {canWrite && tab === 'drivers' && (
            <button onClick={openCreateDriver} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
              <PlusIcon className="w-4 h-4" /> Novo Condutor
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-1">
            {tabs.map(t => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${active ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                  <Icon className="w-4 h-4" />
                  {t.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>{t.count}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* ======================== TAB: VEÍCULOS ======================== */}
        {tab === 'vehicles' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total', value: meta.total, color: 'text-blue-600 dark:text-blue-400' },
                { label: 'Ativos', value: vehicles.filter(v => v.status === 'ACTIVE').length, color: 'text-green-600 dark:text-green-400' },
                { label: 'Em Manutenção', value: vehicles.filter(v => v.status === 'UNDER_MAINTENANCE').length, color: 'text-yellow-600 dark:text-yellow-400' },
                { label: 'Docs Vencendo', value: docsExpiring, color: 'text-red-600 dark:text-red-400' },
              ].map(s => (
                <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <p className={`text-2xl font-bold ${s.color}`}>{loadingV ? '—' : s.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex gap-3 flex-wrap">
                <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar por nome, placa, RENAVAM..." className="flex-1 min-w-48 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Todos os status</option>
                  {Object.entries(ASSET_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <select value={fuelFilter} onChange={e => { setFuelFilter(e.target.value); setPage(1); }} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Todos os combustíveis</option>
                  {Object.entries(FUEL_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    {['Placa', 'Veículo', 'Unidade', 'Condutor', 'KM Atual', 'Status', ''].map((h, i) => (
                      <th key={i} className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {loadingV ? (
                    <LoadingTable cols={7} />
                  ) : vehicles.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <TruckIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                        <p className="font-medium text-gray-500 dark:text-gray-400">Nenhum veículo cadastrado</p>
                        {canWrite && <p className="text-sm text-gray-400">Clique em <strong>Novo Veículo</strong> para começar</p>}
                      </div>
                    </td></tr>
                  ) : vehicles.map(v => (
                    <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer" onClick={() => router.push(`/vehicles/${v.id}`)}>
                      <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900 dark:text-white">{v.plate || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">{v.name}</div>
                        <div className="text-xs text-gray-500">{[v.brand, v.model, v.manufacture_year].filter(Boolean).join(' · ')}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{v.department?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{v.primary_driver?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{(v.current_km ?? 0).toLocaleString('pt-BR')} km</td>
                      <td className="px-4 py-3"><StatusBadge value={v.status} label={ASSET_STATUS_LABELS[v.status] ?? v.status} /></td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => router.push(`/vehicles/${v.id}`)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><EyeIcon className="w-4 h-4" /></button>
                          {canWrite && <button onClick={() => openEditV(v)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">Editar</button>}
                          {canWrite && v.status !== 'WRITTEN_OFF' && <button onClick={() => { setWriteOffTarget(v); setWriteOffForm({ date: new Date().toISOString().split('T')[0], reason: '' }); }} className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-medium">Baixa</button>}
                          {canDelete && <button onClick={() => setDeleteVTarget(v)} className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium">Excluir</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination page={page} totalPages={meta.total_pages} total={meta.total} limit={limit} onPageChange={setPage} />
            </div>
          </>
        )}

        {/* ======================== TAB: CONDUTORES ======================== */}
        {tab === 'drivers' && (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex gap-3 flex-wrap">
                <input type="text" value={driverSearch} onChange={e => setDriverSearch(e.target.value)} placeholder="Buscar por nome, CPF ou CNH..." className="flex-1 min-w-48 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={driverStatusFilter} onChange={e => setDriverStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Todos</option>
                  {Object.entries(DRIVER_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    {['Nome', 'CPF', 'CNH', 'Categoria', 'Validade CNH', 'Telefone', 'Status', ''].map((h, i) => (
                      <th key={i} className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {loadingD ? (
                    <LoadingTable cols={8} />
                  ) : drivers.length === 0 ? (
                    <tr><td colSpan={8} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <UserGroupIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                        <p className="font-medium text-gray-500 dark:text-gray-400">Nenhum condutor cadastrado</p>
                        {canWrite && <p className="text-sm text-gray-400">Clique em <strong>Novo Condutor</strong> para começar</p>}
                      </div>
                    </td></tr>
                  ) : drivers.map(d => {
                    const expired = cnhExpired(d);
                    const expiring = cnhExpiring(d);
                    return (
                      <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{d.name}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{d.cpf || '—'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{d.cnh || '—'}</td>
                        <td className="px-4 py-3">
                          {d.cnh_category ? <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-semibold">{d.cnh_category}</span> : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {d.cnh_expiry ? (
                            <span className={`text-xs font-medium ${expired ? 'text-red-600 dark:text-red-400' : expiring ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400'}`}>
                              {expired && <ExclamationTriangleIcon className="inline w-4 h-4 mr-1 text-red-500" />}
                              {!expired && expiring && <BoltIcon className="inline w-4 h-4 mr-1 text-yellow-500" />}
                              {formatDateBR(d.cnh_expiry)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{d.phone || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.status === 'ACTIVE' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                            {DRIVER_STATUS_LABELS[d.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            {canWrite && <button onClick={() => openEditDriver(d)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">Editar</button>}
                            {canDelete && <button onClick={() => setDeleteDriverTarget(d)} className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium">Excluir</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ======= Vehicle Modal ======= */}
      <Modal open={vModal} onClose={() => setVModal(false)} title={editingV ? `Editar: ${editingV.name}` : 'Novo Veículo'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
            <input value={editingV ? (editVForm.name ?? '') : createVForm.name} onChange={e => editingV ? setEF('name', e.target.value) : setCF('name', e.target.value)} className={inputCls} placeholder="Ex: Fiat Strada 2023" />
            {!editingV && nextVehicleNumber && (
              <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 font-mono">
                Próximo nº de patrimônio: <strong>{nextVehicleNumber}</strong>
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Placa</label>
            <input value={editingV ? (editVForm.plate ?? '') : (createVForm.plate ?? '')} onChange={e => editingV ? setEF('plate', e.target.value) : setCF('plate', e.target.value)} className={inputCls} placeholder="ABC-1234" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">RENAVAM</label>
            <input value={editingV ? (editVForm.renavam ?? '') : (createVForm.renavam ?? '')} onChange={e => editingV ? setEF('renavam', e.target.value) : setCF('renavam', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chassi</label>
            <input value={editingV ? (editVForm.chassis ?? '') : (createVForm.chassis ?? '')} onChange={e => editingV ? setEF('chassis', e.target.value) : setCF('chassis', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nº Motor</label>
            <input value={editingV ? (editVForm.engine_number ?? '') : (createVForm.engine_number ?? '')} onChange={e => editingV ? setEF('engine_number', e.target.value) : setCF('engine_number', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marca</label>
            <input value={editingV ? (editVForm.brand ?? '') : (createVForm.brand ?? '')} onChange={e => editingV ? setEF('brand', e.target.value) : setCF('brand', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modelo</label>
            <input value={editingV ? (editVForm.model ?? '') : (createVForm.model ?? '')} onChange={e => editingV ? setEF('model', e.target.value) : setCF('model', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ano Fabricação</label>
            <input type="number" value={editingV ? (editVForm.manufacture_year ?? '') : (createVForm.manufacture_year ?? '')} onChange={e => editingV ? setEF('manufacture_year', +e.target.value) : setCF('manufacture_year', +e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cor</label>
            <input value={editingV ? (editVForm.color ?? '') : (createVForm.color ?? '')} onChange={e => editingV ? setEF('color', e.target.value) : setCF('color', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Combustível</label>
            <select value={editingV ? (editVForm.fuel_type ?? '') : (createVForm.fuel_type ?? '')} onChange={e => editingV ? setEF('fuel_type', e.target.value as FuelType) : setCF('fuel_type', e.target.value as FuelType)} className={inputCls}>
              {Object.entries(FUEL_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Condição</label>
            <select value={editingV ? (editVForm.condition ?? '') : (createVForm.condition ?? '')} onChange={e => editingV ? setEF('condition', e.target.value as AssetCondition) : setCF('condition', e.target.value as AssetCondition)} className={inputCls}>
              {Object.entries(CONDITION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {editingV && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select value={editVForm.status ?? ''} onChange={e => setEF('status', e.target.value as AssetStatus)} className={inputCls}>
                {Object.entries(ASSET_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          )}
          {!editingV && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">KM Atual</label>
                <input type="number" min="0" value={createVForm.current_km ?? 0} onChange={e => setCF('current_km', +e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor de Aquisição</label>
                <input type="number" min="0" step="0.01" value={createVForm.acquisition_value ?? 0} onChange={e => setCF('acquisition_value', +e.target.value)} className={inputCls} />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unidade</label>
            <select value={editingV ? (editVForm.department_id ?? '') : (createVForm.department_id ?? '')} onChange={e => editingV ? setEF('department_id', e.target.value || null) : setCF('department_id', e.target.value || undefined)} className={inputCls}>
              <option value="">— Nenhuma —</option>
              {buildFlatTree(departments).map(node => (
                <option key={node.id} value={node.id}>
                  {'　'.repeat(node.depth)}{node.depth > 0 ? '↳ ' : ''}{node.name}
                  {node.type ? ` (${node.type})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Condutor Principal</label>
            <select value={editingV ? (editVForm.primary_driver_id ?? '') : (createVForm.primary_driver_id ?? '')} onChange={e => editingV ? setEF('primary_driver_id', e.target.value || null) : setCF('primary_driver_id', e.target.value || undefined)} className={inputCls}>
              <option value="">— Nenhum —</option>
              {allDrivers.map(d => <option key={d.id} value={d.id}>{d.name}{d.cnh ? ` (CNH ${d.cnh})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Localização</label>
            <select value={editingV ? (editVForm.location_id ?? '') : (createVForm.location_id ?? '')} onChange={e => editingV ? setEF('location_id', e.target.value || undefined) : setCF('location_id', e.target.value || undefined)} className={inputCls}>
              <option value="">— Nenhuma —</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <p className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider pt-2">Documentos</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vencimento IPVA</label>
            <input type="date" value={editingV ? (editVForm.ipva_due_date?.split('T')[0] ?? '') : (createVForm.ipva_due_date ?? '')} onChange={e => editingV ? setEF('ipva_due_date', e.target.value || null) : setCF('ipva_due_date', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vencimento Licenciamento</label>
            <input type="date" value={editingV ? (editVForm.licensing_due_date?.split('T')[0] ?? '') : (createVForm.licensing_due_date ?? '')} onChange={e => editingV ? setEF('licensing_due_date', e.target.value || null) : setCF('licensing_due_date', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vencimento Seguro</label>
            <input type="date" value={editingV ? (editVForm.insurance_due_date?.split('T')[0] ?? '') : (createVForm.insurance_due_date ?? '')} onChange={e => editingV ? setEF('insurance_due_date', e.target.value || null) : setCF('insurance_due_date', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seguradora</label>
            <input value={editingV ? (editVForm.insurance_company ?? '') : (createVForm.insurance_company ?? '')} onChange={e => editingV ? setEF('insurance_company', e.target.value) : setCF('insurance_company', e.target.value)} className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
            <textarea rows={2} value={editingV ? (editVForm.notes ?? '') : (createVForm.notes ?? '')} onChange={e => editingV ? setEF('notes', e.target.value) : setCF('notes', e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setVModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
          <button onClick={saveVehicle} disabled={savingV} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">{savingV ? 'Salvando...' : editingV ? 'Salvar' : 'Cadastrar'}</button>
        </div>
      </Modal>

      <Modal open={!!writeOffTarget} onClose={() => setWriteOffTarget(null)} title={`Dar Baixa: ${writeOffTarget?.name}`} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data da Baixa *</label>
            <input type="date" value={writeOffForm.date} onChange={e => setWriteOffForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motivo *</label>
            <textarea rows={3} value={writeOffForm.reason} onChange={e => setWriteOffForm(f => ({ ...f, reason: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setWriteOffTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
          <button onClick={handleWriteOff} disabled={writingOff} className="px-4 py-2 text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50">{writingOff ? 'Salvando...' : 'Confirmar Baixa'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteVTarget} onClose={() => setDeleteVTarget(null)} onConfirm={deleteVehicle} loading={deletingV}
        title="Excluir Veículo" message={`Excluir "${deleteVTarget?.name}"? Esta ação não pode ser desfeita.`} confirmLabel="Excluir" />

      {/* ======= Driver Modal ======= */}
      <Modal open={driverModal} onClose={() => setDriverModal(false)} title={editingDriver ? `Editar: ${editingDriver.name}` : 'Novo Condutor'} size="md">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
            <input value={editingDriver ? editDriverForm.name : driverForm.name} onChange={e => editingDriver ? setEditDriverForm(f => ({ ...f, name: e.target.value })) : setDriverForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CPF</label>
            <input value={editingDriver ? editDriverForm.cpf : driverForm.cpf} onChange={e => editingDriver ? setEditDriverForm(f => ({ ...f, cpf: e.target.value })) : setDriverForm(f => ({ ...f, cpf: e.target.value }))} className={inputCls} placeholder="000.000.000-00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nº CNH</label>
            <input value={editingDriver ? editDriverForm.cnh : driverForm.cnh} onChange={e => editingDriver ? setEditDriverForm(f => ({ ...f, cnh: e.target.value })) : setDriverForm(f => ({ ...f, cnh: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria CNH</label>
            <select value={editingDriver ? editDriverForm.cnh_category : driverForm.cnh_category} onChange={e => editingDriver ? setEditDriverForm(f => ({ ...f, cnh_category: e.target.value as CNHCategory })) : setDriverForm(f => ({ ...f, cnh_category: e.target.value as CNHCategory }))} className={inputCls}>
              <option value="">— Selecione —</option>
              {CNH_CATEGORY_LABELS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Validade CNH</label>
            <input type="date" value={(editingDriver ? editDriverForm.cnh_expiry : driverForm.cnh_expiry) ?? ''} onChange={e => editingDriver ? setEditDriverForm(f => ({ ...f, cnh_expiry: e.target.value || null })) : setDriverForm(f => ({ ...f, cnh_expiry: e.target.value || null }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
            <input value={editingDriver ? editDriverForm.phone : driverForm.phone} onChange={e => editingDriver ? setEditDriverForm(f => ({ ...f, phone: e.target.value })) : setDriverForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} placeholder="(00) 90000-0000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail</label>
            <input type="email" value={editingDriver ? editDriverForm.email : driverForm.email} onChange={e => editingDriver ? setEditDriverForm(f => ({ ...f, email: e.target.value })) : setDriverForm(f => ({ ...f, email: e.target.value }))} className={inputCls} />
          </div>
          {editingDriver && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select value={editDriverForm.status} onChange={e => setEditDriverForm(f => ({ ...f, status: e.target.value as DriverStatus }))} className={inputCls}>
                {Object.entries(DRIVER_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          )}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
            <textarea rows={2} value={editingDriver ? editDriverForm.notes : driverForm.notes} onChange={e => editingDriver ? setEditDriverForm(f => ({ ...f, notes: e.target.value })) : setDriverForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setDriverModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancelar</button>
          <button onClick={saveDriver} disabled={savingDriver} className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">{savingDriver ? 'Salvando...' : editingDriver ? 'Salvar' : 'Cadastrar'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteDriverTarget} onClose={() => setDeleteDriverTarget(null)} onConfirm={deleteDriver} loading={deletingDriver}
        title="Excluir Condutor" message={`Excluir "${deleteDriverTarget?.name}"? Esta ação não pode ser desfeita.`} confirmLabel="Excluir" />
    </MainLayout>
  );
}

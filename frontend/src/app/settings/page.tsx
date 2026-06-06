'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'patrimonio_settings';

interface Settings {
  org_name: string;
  cnpj: string;
  fiscal_year: string;
  default_depreciation_method: string;
  default_depreciation_rate: string;
  patrimony_prefix: string;
  patrimony_start_seq: string;
  alert_email: string;
}

const DEFAULT_SETTINGS: Settings = {
  org_name: '',
  cnpj: '',
  fiscal_year: new Date().getFullYear().toString(),
  default_depreciation_method: 'LINEAR',
  default_depreciation_rate: '10',
  patrimony_prefix: 'PAT',
  patrimony_start_seq: '1',
  alert_email: '',
};

function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  function set(key: keyof Settings, value: string) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    toast.success('Configurações salvas');
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Parâmetros gerais do sistema</p>
        </div>

        <div className="space-y-6 max-w-2xl">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Geral</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Organização</label>
                <input type="text" value={settings.org_name} onChange={e => set('org_name', e.target.value)} placeholder="Ex: Prefeitura Municipal de ..." className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CNPJ</label>
                <input type="text" value={settings.cnpj} onChange={e => set('cnpj', e.target.value)} placeholder="00.000.000/0000-00" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Exercício Fiscal</label>
                <input type="number" value={settings.fiscal_year} onChange={e => set('fiscal_year', e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Depreciação</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Método padrão</label>
                <select value={settings.default_depreciation_method} onChange={e => set('default_depreciation_method', e.target.value)} className={inputCls}>
                  <option value="LINEAR">Linear</option>
                  <option value="DECLINING_BALANCE">Saldo Decrescente</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Taxa anual padrão (%)</label>
                <input type="number" min="0" max="100" step="0.01" value={settings.default_depreciation_rate} onChange={e => set('default_depreciation_rate', e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Numeração Patrimonial</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prefixo</label>
                <input type="text" value={settings.patrimony_prefix} onChange={e => set('patrimony_prefix', e.target.value)} placeholder="PAT" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sequência inicial</label>
                <input type="number" min="1" value={settings.patrimony_start_seq} onChange={e => set('patrimony_start_seq', e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Notificações</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail para alertas</label>
              <input type="email" value={settings.alert_email} onChange={e => set('alert_email', e.target.value)} placeholder="gestor@exemplo.gov.br" className={inputCls} />
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={handleSave} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
              Salvar Configurações
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

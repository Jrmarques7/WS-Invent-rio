'use client';

const colorMap: Record<string, string> = {
  // Asset status
  ACTIVE:            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  INACTIVE:          'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  UNDER_MAINTENANCE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  WRITTEN_OFF:       'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  // Asset type
  MOVEL:             'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  IMOVEL:            'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  VEICULO:           'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  CONSUMIVEL:        'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  // Maintenance status
  SCHEDULED:         'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  IN_PROGRESS:       'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  COMPLETED:         'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED:         'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  // Inventory status
  DRAFT:             'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  // Maintenance type
  PREVENTIVE:        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CORRECTIVE:        'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  // Movement type
  TRANSFER:          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  LOAN:              'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  RETURN:            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  RELOCATION:        'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  WRITE_OFF:         'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MAINT_START:       'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  MAINT_DONE:        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  INVENTORY_DIFF:    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  // Transfer request status
  PENDING:           'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED:          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECTED:          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  EXECUTED:          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  // Condition
  EXCELLENT:         'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  GOOD:              'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  FAIR:              'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  POOR:              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  // User roles
  ADMIN:             'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  GESTOR:            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  RESPONSAVEL:       'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CONSULTA:          'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  // Location types
  BUILDING:          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  FLOOR:             'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  ROOM:              'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  SECTOR:            'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  // Fuel types
  GASOLINA:          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  DIESEL:            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  ETANOL:            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  HIBRIDO:           'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  ELETRICO:          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  GNV:               'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

interface StatusBadgeProps {
  value: string;
  label: string;
}

export function StatusBadge({ value, label }: StatusBadgeProps) {
  const cls = colorMap[value] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

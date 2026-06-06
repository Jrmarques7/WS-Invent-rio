'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { usePermissions } from '@/hooks/usePermissions';
import {
  HomeIcon,
  ArchiveBoxIcon,
  TagIcon,
  MapPinIcon,
  UserGroupIcon,
  ArrowsRightLeftIcon,
  WrenchScrewdriverIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CurrencyDollarIcon,
  TruckIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

interface SidebarProps {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}

interface MenuItem {
  name: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  submenu?: { name: string; href: string; icon: React.ComponentType<{ className?: string }>; roles?: string[] }[];
}

const menuItems: MenuItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Minha Carga', href: '/my-custody', icon: UserGroupIcon, roles: ['RESPONSAVEL'] },
  { name: 'Meu Inventário', href: '/my-inventory', icon: ChatBubbleLeftRightIcon, roles: ['RESPONSAVEL'] },
  {
    name: 'Patrimônio',
    icon: ArchiveBoxIcon,
    roles: ['ADMIN', 'GESTOR', 'CONSULTA'],
    submenu: [
      { name: 'Todos os Bens', href: '/assets', icon: ArchiveBoxIcon },
      { name: 'Categorias', href: '/categories', icon: TagIcon, roles: ['ADMIN', 'GESTOR'] },
      { name: 'Localizações', href: '/locations', icon: MapPinIcon, roles: ['ADMIN', 'GESTOR'] },
    ],
  },
  {
    name: 'Carga Patrimonial',
    icon: UserGroupIcon,
    roles: ['ADMIN', 'GESTOR'],
    submenu: [
      { name: 'Custódias', href: '/custody', icon: UserGroupIcon },
      { name: 'Movimentações', href: '/movements', icon: ArrowsRightLeftIcon },
      { name: 'Transferências', href: '/transfer-requests', icon: ChatBubbleLeftRightIcon },
    ],
  },
  { name: 'Manutenção', href: '/maintenance', icon: WrenchScrewdriverIcon, roles: ['ADMIN', 'GESTOR'] },
  { name: 'Frota', href: '/vehicles', icon: TruckIcon, roles: ['ADMIN', 'GESTOR', 'CONSULTA'] },
  { name: 'Unidades', href: '/departments', icon: BuildingOfficeIcon, roles: ['ADMIN', 'GESTOR'] },
  { name: 'Inventário', href: '/inventory', icon: ClipboardDocumentListIcon, roles: ['ADMIN', 'GESTOR'] },
  { name: 'Depreciação', href: '/depreciation', icon: CurrencyDollarIcon, roles: ['ADMIN', 'GESTOR'] },
  { name: 'Relatórios', href: '/reports', icon: ChartBarIcon, roles: ['ADMIN', 'GESTOR', 'CONSULTA'] },
  { name: 'Usuários', href: '/users', icon: UsersIcon, roles: ['ADMIN'] },
  { name: 'Configurações', href: '/settings', icon: Cog6ToothIcon, roles: ['ADMIN'] },
];

export function Sidebar({ open, collapsed, onClose, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
  const { role } = usePermissions();

  const visibleItems = menuItems
    .filter(item => !item.roles || item.roles.includes(role))
    .map(item => ({
      ...item,
      submenu: item.submenu?.filter(sub => !sub.roles || sub.roles.includes(role)),
    }))
    .filter(item => !item.submenu || item.submenu.length > 0);

  const toggleSubmenu = (name: string) => {
    setOpenSubmenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`fixed top-0 left-0 h-full z-30 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 hidden lg:flex flex-col ${collapsed ? 'w-16' : 'w-64'}`}>
        {/* Logo */}
        <div className={`flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-700 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <ArchiveBoxIcon className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-900 dark:text-white">Patrimônio</span>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {collapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeftIcon className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {visibleItems.map((item) => {
            if (item.submenu) {
              const isOpen = openSubmenus[item.name];
              const anyActive = item.submenu.some(s => isActive(s.href));
              return (
                <div key={item.name}>
                  <button
                    onClick={() => !collapsed && toggleSubmenu(item.name)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${anyActive ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'} ${collapsed ? 'justify-center' : ''}`}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.name}</span>
                        {isOpen ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                      </>
                    )}
                  </button>
                  {!collapsed && isOpen && (
                    <div className="mt-1 ml-4 space-y-1">
                      {item.submenu.map(sub => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive(sub.href) ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                          <sub.icon className="w-4 h-4 flex-shrink-0" />
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href!}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(item.href!) ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'} ${collapsed ? 'justify-center' : ''}`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 z-30 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col lg:hidden transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <ArchiveBoxIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white">Patrimônio</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600">
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {visibleItems.map((item) =>
            item.submenu ? (
              <div key={item.name}>
                {item.submenu.map(sub => (
                  <Link key={sub.href} href={sub.href} onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive(sub.href) ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                    <sub.icon className="w-4 h-4" />
                    {sub.name}
                  </Link>
                ))}
              </div>
            ) : (
              <Link key={item.href} href={item.href!} onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(item.href!) ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}>
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            )
          )}
        </nav>
      </aside>
    </>
  );
}

'use client';

import { useState, ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { usePermissions } from '@/hooks/usePermissions';

const ROUTE_ACCESS: [string, string[]][] = [
  ['/users', ['ADMIN']],
  ['/settings', ['ADMIN']],
  ['/depreciation', ['ADMIN', 'GESTOR']],
  ['/reports', ['ADMIN', 'GESTOR', 'CONSULTA']],
  ['/categories', ['ADMIN', 'GESTOR']],
  ['/locations', ['ADMIN', 'GESTOR']],
  ['/assets', ['ADMIN', 'GESTOR', 'CONSULTA']],
  ['/departments', ['ADMIN', 'GESTOR']],
  ['/custody', ['ADMIN', 'GESTOR']],
  ['/movements', ['ADMIN', 'GESTOR']],
  ['/transfer-requests', ['ADMIN', 'GESTOR']],
  ['/inventory', ['ADMIN', 'GESTOR']],
  ['/maintenance', ['ADMIN', 'GESTOR']],
  ['/vehicles', ['ADMIN', 'GESTOR', 'CONSULTA']],
  ['/my-custody', ['RESPONSAVEL']],
  ['/my-inventory', ['RESPONSAVEL']],
];

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { role, user } = usePermissions();

  useEffect(() => {
    if (!user || !role) return;
    const restricted = ROUTE_ACCESS.find(([prefix]) => pathname.startsWith(prefix));
    if (restricted && !restricted[1].includes(role)) {
      router.replace('/dashboard');
    }
  }, [pathname, role, user, router]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

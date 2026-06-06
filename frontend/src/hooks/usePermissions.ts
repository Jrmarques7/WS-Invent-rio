import { useAuthStore } from '@/store/authStore';

export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? '';
  return {
    role,
    user,
    isAdmin: role === 'ADMIN',
    isGestor: role === 'GESTOR',
	    isResponsavel: role === 'RESPONSAVEL',
	    isConsulta: role === 'CONSULTA',
	    canManagePatrimony: ['ADMIN', 'GESTOR'].includes(role),
	    canManageCustody: ['ADMIN', 'GESTOR'].includes(role),
	    canManageMaintenance: ['ADMIN', 'GESTOR'].includes(role),
	    canViewOwnCustody: role === 'RESPONSAVEL',
	    canRespondOwnInventory: role === 'RESPONSAVEL',
	    canRequestOwnMaintenance: role === 'RESPONSAVEL',
	    canWrite: ['ADMIN', 'GESTOR'].includes(role),
	    canDelete: role === 'ADMIN',
	    canCreateMaintenance: ['ADMIN', 'GESTOR'].includes(role),
	    canVerifyInventory: ['ADMIN', 'GESTOR'].includes(role),
	    canManageInventory: ['ADMIN', 'GESTOR'].includes(role),
    canManageUsers: role === 'ADMIN',
    canViewReports: ['ADMIN', 'GESTOR', 'CONSULTA'].includes(role),
    canViewDepreciation: ['ADMIN', 'GESTOR'].includes(role),
  };
}

import { Department } from './departments';

export type UserRole = 'ADMIN' | 'GESTOR' | 'RESPONSAVEL' | 'CONSULTA';

export interface User {
  id: string;
  name: string;
  email: string;
  registration: string;
  department: string;
  department_id: string | null;
  department_ref?: Department | null;
  role: UserRole;
  is_active: boolean;
  avatar: string;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

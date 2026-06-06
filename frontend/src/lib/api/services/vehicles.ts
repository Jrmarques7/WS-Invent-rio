import api from '../client';
import { Vehicle, KmRecord, VehicleMaintenance, FuelRecord, CreateVehicleInput, UpdateVehicleInput } from '@/types/vehicles';
import { PaginatedResponse } from '@/types/assets';

export interface VehicleFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  fuel_type?: string;
  location_id?: string;
}

export const vehiclesApi = {
  list: (params?: VehicleFilters) =>
    api.get<PaginatedResponse<Vehicle>>('/vehicles', { params }),

  get: (id: string) =>
    api.get<{ data: Vehicle }>(`/vehicles/${id}`),

  create: (data: CreateVehicleInput) =>
    api.post<{ data: Vehicle }>('/vehicles', data),

  update: (id: string, data: UpdateVehicleInput) =>
    api.put<{ data: Vehicle }>(`/vehicles/${id}`, data),

  writeOff: (id: string, data: { date: string; reason: string }) =>
    api.post(`/vehicles/${id}/write-off`, data),

  delete: (id: string) =>
    api.delete(`/vehicles/${id}`),

  getKmHistory: (id: string) =>
    api.get<{ data: KmRecord[] }>(`/vehicles/${id}/km`),

  recordKM: (id: string, km: number, notes?: string) =>
    api.post(`/vehicles/${id}/km`, { km, notes }),

  getMaintenances: (id: string) =>
    api.get<{ data: VehicleMaintenance[] }>(`/vehicles/${id}/maintenances`),

  createMaintenance: (id: string, data: { description: string; interval_km: number; last_done_km: number; notes?: string }) =>
    api.post(`/vehicles/${id}/maintenances`, data),

  markMaintenanceDone: (vehicleId: string, maintenanceId: string, done_km: number) =>
    api.put(`/vehicles/${vehicleId}/maintenances/${maintenanceId}`, { done_km }),

  deleteMaintenance: (vehicleId: string, maintenanceId: string) =>
    api.delete(`/vehicles/${vehicleId}/maintenances/${maintenanceId}`),

  getFuelRecords: (id: string) =>
    api.get<{ data: FuelRecord[] }>(`/vehicles/${id}/fuel`),

  addFuelRecord: (id: string, data: { km?: number; liters: number; price_per_l: number; station?: string; fuel_type?: string; full_tank?: boolean }) =>
    api.post(`/vehicles/${id}/fuel`, data),

  nextNumber: () =>
    api.get<{ data: { number: string } }>('/vehicles/next-number'),
};

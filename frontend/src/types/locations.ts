export type LocationType = 'BUILDING' | 'FLOOR' | 'ROOM' | 'SECTOR';

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  BUILDING: 'Prédio',
  FLOOR: 'Andar',
  ROOM: 'Sala',
  SECTOR: 'Setor',
};

export interface Location {
  id: string;
  name: string;
  code: string;
  type: LocationType;
  address: string;
  parent_id: string | null;
  parent?: Location;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateLocationInput {
  name: string;
  code?: string;
  type: LocationType;
  address?: string;
  parent_id?: string;
}

export interface UpdateLocationInput {
  name?: string;
  code?: string;
  type?: LocationType;
  address?: string;
  parent_id?: string;
  is_active?: boolean;
}

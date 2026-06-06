import { FuelRecord } from '@/types/vehicles';

export function calculateAverageConsumption(records: FuelRecord[]) {
  const fullTankRecords = [...records].filter((record) => record.full_tank).sort((a, b) => a.km - b.km);
  if (fullTankRecords.length < 2) return null;

  let totalKm = 0;
  let totalLiters = 0;
  for (let i = 1; i < fullTankRecords.length; i++) {
    totalKm += fullTankRecords[i].km - fullTankRecords[i - 1].km;
    totalLiters += fullTankRecords[i].liters;
  }

  return totalLiters > 0 ? (totalKm / totalLiters).toFixed(1) : null;
}

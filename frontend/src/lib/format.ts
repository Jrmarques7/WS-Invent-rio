export function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDateBR(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString('pt-BR') : '—';
}

export function formatKm(value: number) {
  return `${value.toLocaleString('pt-BR')} km`;
}

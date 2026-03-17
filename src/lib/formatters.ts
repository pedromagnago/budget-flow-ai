export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Math.abs(value));

export const formatCurrencyCompact = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `R$ ${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `R$ ${(abs / 1_000).toFixed(0)}k`;
  return formatCurrency(value);
};

export const formatPercent = (value: number, decimals = 1): string =>
  `${(value * 100).toFixed(decimals)}%`;

export const formatDate = (date: string | Date): string =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(typeof date === 'string' ? new Date(date) : date);

export const formatDateTime = (date: string | Date): string =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(typeof date === 'string' ? new Date(date) : date);

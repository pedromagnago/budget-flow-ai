import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';

interface CurrencyDisplayProps {
  value: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-2xl',
};

export function CurrencyDisplay({ value, className, size = 'md' }: CurrencyDisplayProps) {
  return (
    <span className={cn('font-mono tabular-nums font-bold', sizeClasses[size], className)}>
      {formatCurrency(value)}
    </span>
  );
}

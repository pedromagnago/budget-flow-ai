import { cn } from '@/lib/utils';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/constants';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
        STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground',
        className
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

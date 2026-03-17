import { cn } from '@/lib/utils';

interface ScoreBadgeProps {
  score: number;
  className?: string;
}

export function ScoreBadge({ score, className }: ScoreBadgeProps) {
  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold',
        score >= 0.85
          ? 'bg-consumido/10 text-consumido'
          : score >= 0.60
          ? 'bg-module-dashboard/10 text-module-dashboard'
          : 'bg-destructive/10 text-destructive',
        className
      )}
    >
      {(score * 100).toFixed(0)}% MATCH
    </span>
  );
}

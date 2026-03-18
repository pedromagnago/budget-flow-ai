import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon = PackageOpen,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-5">{description}</p>
      {actionLabel && actionHref && (
        <Button asChild size="sm" className="gap-1.5">
          <Link to={actionHref}>{actionLabel}</Link>
        </Button>
      )}
      {actionLabel && onAction && !actionHref && (
        <Button size="sm" className="gap-1.5" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

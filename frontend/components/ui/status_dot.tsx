import { cn } from '@/lib/utils';

interface StatusDotProps {
  status: 'online' | 'offline' | 'warning' | 'idle';
  animate?: boolean;
}

export function StatusDot({ status, animate = true }: StatusDotProps) {
  const colorMap = {
    online: 'bg-[var(--color-success)]',
    offline: 'bg-[var(--color-text-muted)]',
    warning: 'bg-[var(--color-warning)]',
    idle: 'bg-[var(--color-energy)]'
  };

  return (
    <span className="relative flex h-3 w-3">
      {animate && status !== 'offline' && (
        <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", colorMap[status])} />
      )}
      <span className={cn("relative inline-flex rounded-full h-3 w-3", colorMap[status])} />
    </span>
  );
}

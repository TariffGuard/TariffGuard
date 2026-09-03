import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  asCard?: boolean;
}

export function GlassPanel({ children, className, asCard = false }: GlassPanelProps) {
  return (
    <div className={cn(
      asCard ? 'glass-card rounded-[var(--radius-md)]' : 'glass-panel rounded-[var(--radius-lg)]',
      className
    )}>
      {children}
    </div>
  );
}

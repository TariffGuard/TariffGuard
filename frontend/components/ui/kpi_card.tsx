import { GlassPanel } from './glass_panel';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  delta?: string;
  subtext?: string;
  accentColor?: string;
}

export function KPICard({ title, value, delta, subtext, accentColor = 'var(--color-primary)' }: KPICardProps) {
  return (
    <GlassPanel asCard className="p-6 relative overflow-hidden flex flex-col justify-between h-full">
      <div 
        className="absolute top-0 left-0 right-0 h-[3px]" 
        style={{ backgroundColor: accentColor }}
      />
      <div>
        <p className="text-[var(--color-text-secondary)] text-[11px] uppercase tracking-wider font-semibold mb-2">{title}</p>
        <div className="flex items-baseline gap-2 mt-3">
          <h3 className="text-3xl font-mono font-bold text-[var(--color-text-primary)]">{value}</h3>
          {delta && (
            <span className={cn(
              "text-xs font-mono font-medium",
              delta.startsWith('+') ? "text-[var(--color-success)]" : "text-[var(--color-warning)]"
            )}>
              {delta}
            </span>
          )}
        </div>
      </div>
      {subtext && <p className="text-xs font-medium text-[var(--color-text-muted)] mt-4">{subtext}</p>}
    </GlassPanel>
  );
}

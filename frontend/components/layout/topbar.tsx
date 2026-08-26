'use client';
import { usePathname } from 'next/navigation';
import { StatusDot } from '../ui/status_dot';
import { Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export function Topbar() {
  const pathname = usePathname();
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const getPageTitle = (path: string) => {
    if (path === '/') return 'Dashboard Overview';
    const segment = path.split('/')[1];
    if (!segment) return 'Dashboard';
    return segment.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <header className="h-[60px] glass-panel mt-4 mr-4 rounded-[var(--radius-lg)] flex items-center justify-between px-6 shrink-0 z-10">
      <div className="flex items-center">
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
          {getPageTitle(pathname)}
        </h2>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
          <Sun className="w-4 h-4 text-[var(--color-energy)]" />
          <span className="font-mono text-sm font-medium">24°C</span>
        </div>
        
        <div className="h-4 w-px bg-[rgba(255,255,255,0.6)]" />
        
        <span className="font-mono text-sm font-medium text-[var(--color-text-primary)]">
          {time || '...'}
        </span>

        <div className="h-4 w-px bg-[rgba(255,255,255,0.6)]" />

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">Faisalabad Plant</span>
          <StatusDot status="online" />
        </div>
      </div>
    </header>
  );
}

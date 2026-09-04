'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  CalendarClock, 
  Server, 
  Bell, 
  CalendarDays, 
  FileBarChart, 
  Settings, 
  Calculator, 
  Activity, 
  MessageCircle, 
  Package,
  LogOut
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { useAuth } from '@/context/auth_context';
import { useState, useEffect } from 'react';
import { fetchApi, tariffApi } from '@/lib/api';
import { TariffPeriod } from '@/types';
import { LucideIcon } from 'lucide-react';

const navItems: Array<{name: string, href: string, icon: LucideIcon, badge?: number}> = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Live Monitoring', href: '/dashboard/live_monitoring', icon: Activity },
  { name: 'Schedule Optimizer', href: '/dashboard/schedule_optimizer', icon: CalendarClock },
  { name: 'Production Orders', href: '/dashboard/production_orders', icon: Package },
  { name: 'Tariff Calendar', href: '/dashboard/tariff_calendar', icon: CalendarDays },
  { name: 'Alerts & Anomalies', href: '/dashboard/alerts', icon: Bell },
  { name: 'Reports', href: '/dashboard/reports', icon: FileBarChart },
  { name: 'Cost Analysis', href: '/dashboard/cost_analysis', icon: Calculator },
  { name: 'Machines', href: '/dashboard/machines', icon: Server },
  { name: 'AI Chat', href: '/dashboard/chat', icon: MessageCircle },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

function parseTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function getCurrentTariff(tariffs: TariffPeriod[]) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  for (const t of tariffs) {
    const start = parseTime(t.start_time);
    let end = parseTime(t.end_time);
    if (end <= start) end += 24 * 60;
    let test = currentMinutes;
    if (test < start) test += 24 * 60;
    if (test >= start && test < end) {
      return t;
    }
  }
  return null;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, user, logout } = useAuth();
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [currentTariff, setCurrentTariff] = useState<TariffPeriod | null>(null);

  useEffect(() => {
    fetchApi('/api/alerts/stats/1')
      .then(data => setUnresolvedCount(data.unresolved || 0))
      .catch(console.error);
  }, [pathname]);

  useEffect(() => {
    tariffApi.list()
      .then((tariffs) => {
        const active = getCurrentTariff(tariffs);
        setCurrentTariff(active);
      })
      .catch(console.error);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isPeak = currentTariff?.period_name.toLowerCase().includes('peak') && !currentTariff?.period_name.toLowerCase().includes('off');

  return (
    <aside className="w-[260px] glass-panel h-full flex flex-col m-4 rounded-[var(--radius-lg)] border-r border-[rgba(255,255,255,0.65)] shrink-0 overflow-hidden">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-[var(--color-primary)] flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[var(--color-primary)] flex items-center justify-center text-white text-lg">T</div>
          TariffGuard
        </h1>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium transition-colors",
                isActive 
                  ? "bg-[rgba(126,96,174,0.10)] text-[var(--color-primary)] border-l-3 border-[var(--color-primary)]" 
                  : "text-[var(--color-text-secondary)] hover:bg-[rgba(255,255,255,0.5)]"
              )}
              style={isActive ? { borderLeftWidth: '3px', borderLeftColor: 'var(--color-primary)' } : { borderLeftWidth: '3px', borderLeftColor: 'transparent' }}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("w-5 h-5", isActive ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)]")} />
                {item.name}
              </div>
              {item.name === 'Alerts & Anomalies' && unresolvedCount > 0 && (
                <Badge variant="error" className="px-1.5 py-0.5 text-[10px] min-w-[20px] justify-center">{unresolvedCount}</Badge>
              )}
              {item.name !== 'Alerts & Anomalies' && item.badge && (
                <Badge variant="error" className="px-1.5 py-0.5 text-[10px] min-w-[20px] justify-center">{item.badge}</Badge>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[rgba(255,255,255,0.4)]">
        <div className="bg-[var(--color-primary-light)] p-3 rounded-[var(--radius-md)] mb-4">
          <p className="text-[11px] uppercase tracking-wider text-[var(--color-primary)] font-semibold mb-1">Current Period</p>
          <div className="flex justify-between items-end">
            <p className="font-semibold text-sm text-[var(--color-text-primary)]">
              {currentTariff ? currentTariff.period_name : '—'}
            </p>
            <p className={cn("font-mono text-xs font-medium", isPeak ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]')}>
              {currentTariff ? `${currentTariff.rate_pkr_per_kwh} PKR/kWh` : 'No tariff'}
            </p>
          </div>
        </div>

        {/* User Info + Logout */}
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-medium text-sm">
            {role ? role.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{user?.username || 'Guest'}</p>
            <p className="text-xs text-[var(--color-text-muted)] truncate capitalize">{role || 'Guest'}</p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
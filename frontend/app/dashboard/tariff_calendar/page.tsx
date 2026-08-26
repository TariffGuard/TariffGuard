'use client';
import { GlassPanel } from '@/components/ui/glass_panel';
import { Button } from '@/components/ui/button';
import { Plus, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TariffCalendarPage() {
  const currentHour = new Date().getHours();
  
  return (
    <div className="p-6 text-[var(--color-text-primary)] max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">Tariff Calendar</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Peak and off-peak periods — configurable</p>
        </div>
      </div>

      {/* Section 1: Today's Tariff Schedule */}
      <GlassPanel className="p-6 rounded-[var(--radius-lg)]">
        <h3 className="font-semibold text-[var(--color-primary)] mb-6">Today's Tariff Schedule</h3>
        
        <div className="relative w-full h-16 rounded-md overflow-hidden flex border border-[rgba(255,255,255,0.6)] bg-[rgba(255,255,255,0.3)] shadow-inner">
          {/* 00:00 - 18:00 Off-Peak */}
          <div className="h-full relative flex items-center justify-center border-r border-white/50" style={{ flex: 18 }}>
            <span className="text-xs font-semibold text-[var(--color-success)] tracking-widest uppercase">Off-Peak</span>
          </div>
          
          {/* 18:00 - 22:00 Peak */}
          <div className="h-full relative flex items-center justify-center bg-[rgba(228,123,82,0.15)] border-r border-white/50" style={{ flex: 4 }}>
            <span className="text-xs font-bold text-[var(--color-warning)] tracking-widest uppercase">Peak</span>
          </div>
          
          {/* 22:00 - 24:00 Off-Peak */}
          <div className="h-full relative flex items-center justify-center" style={{ flex: 2 }}>
            <span className="text-xs font-semibold text-[var(--color-success)] tracking-widest uppercase">Off-Peak</span>
          </div>
          
          {/* Current Time Indicator */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-primary)] z-10" 
            style={{ left: `${(currentHour / 24) * 100}%` }}
          >
            <div className="absolute -top-6 -translate-x-1/2 bg-[var(--color-primary)] text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
              NOW
            </div>
          </div>
        </div>

        <div className="flex w-full mt-3 font-mono text-[11px]">
          <div className="text-[var(--color-success)] font-medium text-center" style={{ flex: 18 }}>
            Rs. 28.50 <span className="text-[var(--color-text-muted)] text-[9px] font-sans">/kWh (00:00 - 18:00)</span>
          </div>
          <div className="text-[var(--color-warning)] font-bold text-center" style={{ flex: 4 }}>
            Rs. 42.80 <span className="text-[var(--color-text-muted)] text-[9px] font-sans">/kWh (18:00 - 22:00)</span>
          </div>
          <div className="text-[var(--color-success)] font-medium text-center" style={{ flex: 2 }}>
            Rs. 28.50 <span className="text-[var(--color-text-muted)] text-[9px] font-sans">/kWh (22:00 - 24:00)</span>
          </div>
        </div>
      </GlassPanel>

      {/* Section 2: Weekly Overview */}
      <GlassPanel className="p-6 rounded-[var(--radius-lg)]">
        <h3 className="font-semibold text-[var(--color-primary)] mb-6">Weekly Overview</h3>
        
        <div className="grid grid-cols-7 gap-4 h-48">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
            const isToday = i === new Date().getDay() - 1 || (new Date().getDay() === 0 && i === 6);
            return (
              <div 
                key={day} 
                className={cn(
                  "flex flex-col items-center h-full p-2 rounded-[var(--radius-md)] transition-all",
                  isToday ? "border-2 border-[var(--color-primary-soft)] bg-[rgba(255,255,255,0.4)] shadow-sm" : "border border-transparent"
                )}
              >
                <div className="flex-1 w-full flex flex-col justify-end gap-1 mb-3 bg-[rgba(255,255,255,0.2)] rounded p-1">
                  {/* Visual bars representing peak/off-peak */}
                  <div className="w-full bg-[rgba(255,255,255,0.8)] rounded-sm" style={{ flex: 2 }}></div>
                  <div className="w-full bg-[rgba(228,123,82,0.3)] rounded-sm" style={{ flex: 4 }}></div>
                  <div className="w-full bg-[rgba(255,255,255,0.8)] rounded-sm" style={{ flex: 18 }}></div>
                </div>
                <div className="text-xs font-semibold text-[var(--color-text-primary)]">{day}</div>
                <div className="font-mono text-[10px] text-[var(--color-text-muted)]">Oct {14 + i}</div>
              </div>
            );
          })}
        </div>
      </GlassPanel>

      {/* Section 3: Tariff Configuration */}
      <GlassPanel className="p-6 rounded-[var(--radius-lg)]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-semibold text-[var(--color-primary)]">Tariff Configuration</h3>
          <Button variant="outline" className="border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] h-9 px-4">
            <Plus className="w-4 h-4 mr-2" />
            Add Period
          </Button>
        </div>
        
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[rgba(255,255,255,0.4)] mb-4">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-[rgba(255,255,255,0.4)]">
              <tr className="text-[var(--color-text-secondary)] border-b border-[rgba(255,255,255,0.4)]">
                <th className="font-medium p-3">Period Name</th>
                <th className="font-medium p-3 text-center">Start Time</th>
                <th className="font-medium p-3 text-center">End Time</th>
                <th className="font-medium p-3 text-right">Rate (Rs/kWh)</th>
                <th className="font-medium p-3 text-center">Active</th>
                <th className="font-medium p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Off-Peak', start: '00:00', end: '18:00', rate: '28.50', color: 'text-[var(--color-success)]' },
                { name: 'Peak', start: '18:00', end: '22:00', rate: '42.80', color: 'text-[var(--color-warning)]' },
                { name: 'Off-Peak', start: '22:00', end: '24:00', rate: '28.50', color: 'text-[var(--color-success)]' }
              ].map((row, i) => (
                <tr key={i} className="border-b border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.2)]">
                  <td className="p-3 font-medium text-[var(--color-text-primary)]">{row.name}</td>
                  <td className="p-3 text-center font-mono text-xs text-[var(--color-text-secondary)]">{row.start}</td>
                  <td className="p-3 text-center font-mono text-xs text-[var(--color-text-secondary)]">{row.end}</td>
                  <td className="p-3 text-right font-mono font-medium"><span className={row.color}>{row.rate}</span></td>
                  <td className="p-3 text-center">
                    <div className="inline-flex items-center justify-center w-5 h-5 rounded bg-[var(--color-success-soft)] text-[var(--color-success)]">✓</div>
                  </td>
                  <td className="p-3 text-right">
                    <button className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors p-1">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <p className="text-[11px] text-[var(--color-text-muted)]">
          Rates configurable. Source: NEPRA 2026 notification. Last verified: 14 Aug 2026
        </p>
      </GlassPanel>

    </div>
  );
}

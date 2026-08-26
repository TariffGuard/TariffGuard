'use client';
import { KPICard } from '@/components/ui/kpi_card';
import { GlassPanel } from '@/components/ui/glass_panel';
import { EnergyConsumptionChart } from '@/components/charts/energy_consumption_chart';
import { mockKPIs, mockEnergyData, mockAlerts } from '@/lib/mock_data';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info, Bell } from 'lucide-react';

export default function DashboardOverview() {
  return (
    <div className="space-y-6">
      {/* KPIs Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Daily Energy Cost" 
          value={`${(mockKPIs.daily_cost / 1000).toFixed(1)}k PKR`} 
          delta="+5.2%" 
          subtext="Compared to yesterday" 
          accentColor="var(--color-primary)"
        />
        <KPICard 
          title="Peak Demand" 
          value={`${mockKPIs.peak_demand_kw} kW`} 
          delta="-12kW" 
          subtext="Limit: 700 kW" 
          accentColor="var(--color-warning)"
        />
        <KPICard 
          title="Solar Utilization" 
          value={`${mockKPIs.solar_utilization}%`} 
          delta="+2.1%" 
          subtext="Of total generated capacity" 
          accentColor="var(--color-success)"
        />
        <KPICard 
          title="Orders on Time" 
          value={`${mockKPIs.orders_on_time}%`} 
          delta="-1.5%" 
          subtext="Schedule compliance rate" 
          accentColor="var(--color-energy)"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Area */}
        <div className="lg:col-span-2">
          <GlassPanel asCard className="p-6 h-full">
            <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2 uppercase tracking-wide">Energy Profile (Last 24h)</h3>
            <EnergyConsumptionChart data={mockEnergyData} />
          </GlassPanel>
        </div>

        {/* Alerts Panel */}
        <div className="lg:col-span-1">
          <GlassPanel asCard className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">Active Alerts</h3>
              <Badge variant="error">{mockAlerts.length} New</Badge>
            </div>
            
            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
              {mockAlerts.map(alert => (
                <div key={alert.id} className="p-4 rounded-[var(--radius-sm)] border border-[var(--color-neutral)] bg-[var(--color-background-soft)] flex gap-3">
                  <div className="shrink-0 mt-0.5">
                    {alert.type === 'critical' ? <AlertTriangle className="w-5 h-5 text-[#EF4444]" /> :
                     alert.type === 'warning' ? <AlertTriangle className="w-5 h-5 text-[var(--color-warning)]" /> :
                     <Info className="w-5 h-5 text-[var(--color-primary)]" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)] leading-tight mb-1">{alert.message}</p>
                    <p className="font-mono text-xs text-[var(--color-text-muted)]">{alert.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}

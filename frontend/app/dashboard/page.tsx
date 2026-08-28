'use client';

import { useEffect, useState } from 'react';
import { KPICard } from '@/components/ui/kpi_card';
import { GlassPanel } from '@/components/ui/glass_panel';
import { EnergyConsumptionChart } from '@/components/charts/energy_consumption_chart';
import { mockKPIs, mockEnergyData, mockAlerts } from '@/lib/mock_data';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info, Bell, Loader2 } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export default function DashboardOverview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const factoryId = 1; // Use demo factory ID
        
        const [summary, factoryData, alerts, meterReadings] = await Promise.all([
          fetchApi('/api/dashboard/summary').catch(e => {
            console.error('Failed to fetch summary:', e);
            return null;
          }),
          fetchApi(`/api/dashboard/factory/${factoryId}`).catch(e => {
            console.error('Failed to fetch factory:', e);
            return null;
          }),
          fetchApi(`/api/alerts/unresolved/${factoryId}`).catch(e => {
            console.error('Failed to fetch alerts:', e);
            return null;
          }),
          fetchApi(`/api/meter-readings/?factory_id=${factoryId}&limit=24`).catch(e => {
            console.error('Failed to fetch meter readings:', e);
            return null;
          })
        ]);

        let chartData = mockEnergyData;
        if (meterReadings && meterReadings.length > 0) {
          chartData = [...meterReadings].reverse().map((r: any) => ({
            time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            grid_kw: Math.round(r.kw || 0),
            solar_kw: Math.round(r.solar_kwh || 0)
          }));
        }

        setData({
          summary,
          factoryData,
          alerts: (alerts && alerts.length > 0) ? alerts : null,
          chartData
        });
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  // Derive KPIs with fallback
  const kpis = { ...mockKPIs };
  if (data?.factoryData) {
    const e = data.factoryData.energy;
    if (e.total_kwh) kpis.daily_cost = e.total_kwh * 35; // Rough estimate (35 PKR/kWh)
    if (e.peak_kw) kpis.peak_demand_kw = e.peak_kw;
    if (e.total_kwh && e.total_solar_kwh) {
      kpis.solar_utilization = Math.round((e.total_solar_kwh / (e.total_kwh + e.total_solar_kwh)) * 100) || 0;
    }
  }
  if (data?.summary) {
    const o = data.summary.order_status;
    const total = o.completed + o.running + o.pending;
    if (total > 0) {
      kpis.orders_on_time = Math.round((o.completed / total) * 100);
    }
  }

  // Map alerts
  const activeAlerts = data?.alerts ? data.alerts.map((a: any) => ({
    id: a.id,
    type: a.severity || 'info', // Map severity to type
    message: a.message,
    timestamp: a.created_at ? new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown'
  })) : mockAlerts;

  const energyChartData = data?.chartData || mockEnergyData;

  return (
    <div className="space-y-6">
      {/* KPIs Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Daily Energy Cost" 
          value={`${(kpis.daily_cost / 1000).toFixed(1)}k PKR`} 
          delta="+5.2%" 
          subtext="Compared to yesterday" 
          accentColor="var(--color-primary)"
        />
        <KPICard 
          title="Peak Demand" 
          value={`${kpis.peak_demand_kw} kW`} 
          delta="-12kW" 
          subtext={data?.factoryData ? `Limit: ${data.factoryData.factory.sanctioned_load_kw} kW` : "Limit: 700 kW"} 
          accentColor="var(--color-warning)"
        />
        <KPICard 
          title="Solar Utilization" 
          value={`${kpis.solar_utilization}%`} 
          delta="+2.1%" 
          subtext="Of total generated capacity" 
          accentColor="var(--color-success)"
        />
        <KPICard 
          title="Orders on Time" 
          value={`${kpis.orders_on_time}%`} 
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
            <EnergyConsumptionChart data={energyChartData} />
          </GlassPanel>
        </div>

        {/* Alerts Panel */}
        <div className="lg:col-span-1">
          <GlassPanel asCard className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">Active Alerts</h3>
              <Badge variant="error">{activeAlerts.length} New</Badge>
            </div>
            
            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
              {activeAlerts.map((alert: any) => (
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

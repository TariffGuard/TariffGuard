'use client';

import { useEffect, useState } from 'react';
import { KPICard } from '@/components/ui/kpi_card';
import { GlassPanel } from '@/components/ui/glass_panel';
import { EnergyConsumptionChart } from '@/components/charts/energy_consumption_chart';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info, Bell, Loader2, Sun, Cloud, CloudRain, CloudSun, Thermometer, Droplets } from 'lucide-react';
import { dashboardApi, forecastApi, alertApi, tariffApi, factoryApi } from '@/lib/api';
import { FactoryDashboard, DashboardSummary, Alert, LoadForecast, SolarForecast, WeatherForecast, WeatherDayForecast, TariffPeriod } from '@/types';

interface DashboardData {
  summary: DashboardSummary | null;
  factoryData: FactoryDashboard | null;
  alerts: Alert[];
  loadForecast: LoadForecast | null;
  solarForecast: SolarForecast | null;
  weatherForecast: WeatherForecast | null;
  tariffs: TariffPeriod[];
}

export default function DashboardOverview() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const factories = await factoryApi.list().catch(() => []);
        const factoryId = factories.length > 0 ? factories[0].id : 1;

        const today = new Date();
        today.setMinutes(0, 0, 0);
        today.setHours(today.getHours() + 1);
        const startIso = today.toISOString();
        const endIso = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();

        const [summary, factoryData, alerts, loadForecast, solarForecast, weatherForecast, tariffData] = await Promise.all([
          dashboardApi.summary().catch((e) => {
            console.error('Failed to fetch summary:', e);
            return null;
          }),
          dashboardApi.factory(factoryId).catch((e) => {
            console.error('Failed to fetch factory:', e);
            return null;
          }),
          alertApi.unresolved(factoryId).catch((e) => {
            console.error('Failed to fetch alerts:', e);
            return [];
          }),
          forecastApi.load(factoryId, 24, startIso).catch((e) => {
            console.error('Failed to fetch load forecast:', e);
            return null;
          }),
          forecastApi.solar(factoryId, startIso, endIso).catch((e) => {
            console.error('Failed to fetch solar forecast:', e);
            return null;
          }),
          forecastApi.weather(factoryId, 7).catch((e) => {
            console.error('Failed to fetch weather forecast:', e);
            return null;
          }),
          tariffApi.list().catch(() => []),
        ]);

        setData({
          summary,
          factoryData,
          alerts: alerts || [],
          loadForecast,
          solarForecast,
          weatherForecast,
          tariffs: tariffData || [],
        });
      } catch (err: any) {
        console.error('Failed to fetch dashboard data:', err);
        setError(err.message || 'Failed to load dashboard');
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

  // Derive KPIs from real data only
  const factory = data?.factoryData?.factory;
  const energy = data?.factoryData?.energy;
  const summary = data?.summary;

  const dailyCost = (() => {
    if (!energy?.total_kwh) return 0;
    const rates = data?.tariffs || [];
    if (rates.length === 0) return energy.total_kwh * 25;
    const avgRate = rates.reduce((s, t) => s + t.rate_pkr_per_kwh, 0) / rates.length;
    return energy.total_kwh * avgRate;
  })();
  const peakDemand = energy?.peak_kw || 0;
  const solarUtilization =
    energy?.total_kwh && energy.total_solar_kwh
      ? Math.round((energy.total_solar_kwh / (energy.total_kwh + energy.total_solar_kwh)) * 100) || 0
      : 0;

  let ordersOnTime = 0;
  if (summary) {
    const o = summary.order_status;
    const total = o.completed + o.running + o.pending;
    if (total > 0) {
      ordersOnTime = Math.round((o.completed / total) * 100);
    }
  }

  // Build chart data from real forecasts
  let chartData: { time: string; grid_kw: number; solar_kw: number }[] = [];
  if (data?.loadForecast?.hourly && data?.solarForecast?.hourly) {
    chartData = data.loadForecast.hourly.map((load) => {
      const solar = data.solarForecast!.hourly.find((s) => s.timestamp === load.timestamp);
      return {
        time: new Date(load.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        grid_kw: Math.round(Math.max(0, (load.predicted_kw || 0) - (solar?.solar_kw || 0))),
        solar_kw: Math.round(solar?.solar_kw || 0),
      };
    });
  }

  const activeAlerts = data?.alerts || [];
  const weather = data?.weatherForecast;
  const poorSolarDays = weather?.daily.filter(d => d.solar_quality === 'poor') || [];

  const weatherIcon = (condition: string) => {
    switch (condition) {
      case 'sunny': return <Sun className="w-6 h-6 text-yellow-400" />;
      case 'partly_cloudy': return <CloudSun className="w-6 h-6 text-amber-400" />;
      case 'cloudy': return <Cloud className="w-6 h-6 text-gray-400" />;
      case 'rainy': return <CloudRain className="w-6 h-6 text-blue-400" />;
      default: return <Sun className="w-6 h-6 text-yellow-400" />;
    }
  };

  const solarQualityColor = (q: string) => {
    if (q === 'good') return 'text-[var(--color-success)] bg-[var(--color-success-soft)]';
    if (q === 'moderate') return 'text-[var(--color-warning)] bg-[var(--color-warning-soft)]';
    return 'text-red-500 bg-red-50';
  };

  const dayName = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-[var(--radius-md)] text-sm">
          Error: {error}
        </div>
      )}

      {/* KPIs Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Daily Energy Cost"
          value={`${(dailyCost / 1000).toFixed(1)}k PKR`}
          subtext="Based on meter readings"
          accentColor="var(--color-primary)"
        />
        <KPICard
          title="Peak Demand"
          value={`${peakDemand} kW`}
          subtext={factory ? `Limit: ${factory.sanctioned_load_kw} kW` : 'Limit: —'}
          accentColor="var(--color-warning)"
        />
        <KPICard
          title="Solar Utilization"
          value={`${solarUtilization}%`}
          subtext="Of total generated capacity"
          accentColor="var(--color-success)"
        />
        <KPICard
          title="Orders on Time"
          value={`${ordersOnTime}%`}
          subtext="Completed vs total orders"
          accentColor="var(--color-energy)"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Area */}
        <div className="lg:col-span-2">
          <GlassPanel asCard className="p-6 h-full">
            <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2 uppercase tracking-wide">
              Forecasted Energy Profile (Next 24h)
            </h3>
            {chartData.length > 0 ? (
              <EnergyConsumptionChart data={chartData} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-[var(--color-text-muted)] text-sm">
                Forecast unavailable. Run seed.py and train_model.py.
              </div>
            )}
          </GlassPanel>
        </div>

        {/* Alerts Panel */}
        <div className="lg:col-span-1">
          <GlassPanel asCard className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
                Active Alerts
              </h3>
              <Badge variant="error">{activeAlerts.length} New</Badge>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
              {activeAlerts.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)] italic text-center py-8">
                  No active alerts. Generate alerts from the Alerts page.
                </p>
              ) : (
                activeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 rounded-[var(--radius-sm)] border border-[var(--color-neutral)] bg-[var(--color-background-soft)] flex gap-3"
                  >
                    <div className="shrink-0 mt-0.5">
                      {alert.severity === 'critical' ? (
                        <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
                      ) : alert.severity === 'warning' ? (
                        <AlertTriangle className="w-5 h-5 text-[var(--color-warning)]" />
                      ) : (
                        <Info className="w-5 h-5 text-[var(--color-primary)]" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)] leading-tight mb-1">
                        {alert.message}
                      </p>
                      <p className="font-mono text-xs text-[var(--color-text-muted)]">
                        {alert.created_at
                          ? new Date(alert.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Unknown'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassPanel>
        </div>
      </div>

      {/* Weather & Solar Outlook */}
      {weather && weather.daily.length > 0 && (
        <GlassPanel asCard className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">
              7-Day Weather & Solar Outlook
            </h3>
            <div className="text-xs text-[var(--color-text-muted)]">
              Solar capacity: {weather.solar_capacity_kw} kW
            </div>
          </div>

          {poorSolarDays.length > 0 && (
            <div className="mb-4 p-3 bg-[var(--color-warning-soft)] border border-[var(--color-warning)]/30 rounded-[var(--radius-sm)] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-[var(--color-warning)] mt-0.5 shrink-0" />
              <p className="text-xs text-[var(--color-text-secondary)]">
                <span className="font-semibold text-[var(--color-warning)]">Solar Advisory:</span>{' '}
                {poorSolarDays.length} day(s) with poor solar generation expected ({poorSolarDays.map(d => dayName(d.date)).join(', ')}). Consider shifting energy-intensive jobs to clearer days.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {weather.daily.map((day) => (
              <div
                key={day.date}
                className="p-3 rounded-[var(--radius-md)] bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.5)] flex flex-col items-center text-center gap-1.5"
              >
                <span className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{dayName(day.date)}</span>
                {weatherIcon(day.condition)}
                <div className="flex items-center gap-1 text-xs font-mono text-[var(--color-text-secondary)]">
                  <Thermometer className="w-3 h-3" />
                  {day.temp_high !== null ? `${Math.round(day.temp_high)}°` : '—'}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                  <Droplets className="w-3 h-3" />
                  {day.precipitation_mm > 0 ? `${day.precipitation_mm}mm` : 'Dry'}
                </div>
                <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${solarQualityColor(day.solar_quality)}`}>
                  {day.solar_quality}
                </div>
                <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                  {day.estimated_solar_kwh > 0 ? `${day.estimated_solar_kwh.toFixed(0)} kWh` : '—'}
                </span>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}
    </div>
  );
}

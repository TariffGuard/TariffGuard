'use client';
import { useEffect, useState } from 'react';
import { GlassPanel } from '@/components/ui/glass_panel';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Loader2, AlertTriangle } from 'lucide-react';
import { machineApi, meterApi, forecastApi, dashboardApi, tariffApi } from '@/lib/api';
import { Machine, MeterReading, LoadForecast, SolarForecast, DemandRiskForecast, FactoryDashboard, TariffPeriod } from '@/types';

interface LiveData {
  factoryData: FactoryDashboard | null;
  machines: Machine[];
  readings: MeterReading[];
  loadForecast: LoadForecast | null;
  solarForecast: SolarForecast | null;
  demandRisk: DemandRiskForecast | null;
  tariffs: TariffPeriod[];
}

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
    if (test >= start && test < end) return t;
  }
  return null;
}

export default function LiveMonitoringPage() {
  const [data, setData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const factoryId = 1;
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

        const [factoryData, machines, readings, loadForecast, solarForecast, demandRisk, tariffs] = await Promise.all([
          dashboardApi.factory(factoryId).catch(() => null),
          machineApi.list(factoryId).catch(() => []),
          meterApi.list(factoryId, startOfDay, tomorrow, 24).catch(() => []),
          forecastApi.load(factoryId, 24).catch(() => null),
          forecastApi.solar(factoryId, startOfDay, tomorrow).catch(() => null),
          forecastApi.demandRisk(factoryId, 24).catch(() => null),
          tariffApi.list().catch(() => []),
        ]);

        setData({
          factoryData,
          machines,
          readings,
          loadForecast,
          solarForecast,
          demandRisk,
          tariffs,
        });
      } catch (err: any) {
        console.error('Failed to load live monitoring:', err);
        setError(err.message || 'Failed to load live monitoring data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] flex-col gap-4 items-center justify-center text-[var(--color-text-secondary)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        <p>Loading live monitoring...</p>
      </div>
    );
  }

  const factory = data?.factoryData?.factory;
  const sanctionedLoad = factory?.sanctioned_load_kw || 250;

  // Latest actual reading
  const latestReading = data?.readings?.[data.readings.length - 1];
  const currentGridKw = latestReading ? Math.max(0, latestReading.kw - (latestReading.solar_kwh || 0)) : 0;
  const currentSolarKw = latestReading?.solar_kwh || 0;

  // Current tariff period from real backend tariffs
  const currentTariff = data?.tariffs?.length ? getCurrentTariff(data.tariffs) : null;
  const tariffLabel = currentTariff ? currentTariff.period_name : 'Unknown';
  const tariffRate = currentTariff ? currentTariff.rate_pkr_per_kwh : 0;
  const isPeak = currentTariff ? currentTariff.period_name.toLowerCase().includes('peak') && !currentTariff.period_name.toLowerCase().includes('off') : false;

  // Demand risk
  const overallRisk = data?.demandRisk;
  const riskLevel = overallRisk?.risk_level || 'Low';
  const riskColor =
    riskLevel === 'High' ? 'text-[var(--color-warning)]' : riskLevel === 'Medium' ? 'text-[var(--color-energy)]' : 'text-[var(--color-success)]';

  // Demand chart data: prefer actual readings, fallback to forecast
  const demandChartData =
    data?.readings && data.readings.length > 0
      ? data.readings.map((r) => ({
          time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actual: r.kw,
        }))
      : data?.loadForecast?.hourly.map((h) => ({
          time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actual: h.predicted_kw,
        })) || [];

  // Solar chart data: prefer forecast, fallback to readings
  const solarChartData =
    data?.solarForecast?.hourly.map((s, i) => {
      const reading = data.readings[i];
      return {
        time: new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actual: reading?.solar_kwh || 0,
        forecast: s.solar_kw,
      };
    }) ||
    data?.readings.map((r) => ({
      time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actual: r.solar_kwh,
      forecast: 0,
    })) ||
    [];

  const machineStatusList = data?.machines.map((m) => ({
    id: `M-${String(m.id).padStart(2, '0')}`,
    name: m.name,
    type: m.machine_type,
    status: m.status || 'Running',
    power: `${m.power_kw} kW`,
    since: m.available_from,
    next: m.available_to,
    shiftable: m.shiftable,
  })) || [];

  return (
    <div className="p-6 text-[var(--color-text-primary)] max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-primary)]">Live Monitoring</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Real-time factory energy status</p>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-[var(--radius-md)] text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Section 1: Current Status Bar */}
      <GlassPanel className="flex flex-col md:flex-row items-center divide-y md:divide-y-0 md:divide-x divide-[rgba(255,255,255,0.4)] rounded-[var(--radius-lg)] p-4">
        <div className="flex-1 w-full p-4 flex flex-col justify-center">
          <div className="text-sm text-[var(--color-text-secondary)] mb-1">Grid Draw</div>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-3xl font-bold">{Math.round(currentGridKw)} kW</span>
            <div className="flex items-center gap-1.5 text-[var(--color-success)] text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-current"></span>
              Live
            </div>
          </div>
        </div>
        <div className="flex-1 w-full p-4 flex flex-col justify-center">
          <div className="text-sm text-[var(--color-text-secondary)] mb-1">Solar Output</div>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-3xl font-bold">{Math.round(currentSolarKw)} kW</span>
            <div className="flex items-center gap-1.5 text-[var(--color-success)] text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-current"></span>
              Live
            </div>
          </div>
        </div>
        <div className="flex-1 w-full p-4 flex flex-col justify-center">
          <div className="text-sm text-[var(--color-text-secondary)] mb-1">Tariff</div>
          <div className="flex items-baseline gap-3">
            <span className={cn('text-2xl font-bold', isPeak ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]')}>
              {tariffLabel}
            </span>
            <div className="flex items-center gap-1.5 text-[var(--color-text-muted)] text-xs font-medium font-mono">
              <span className="w-2 h-2 rounded-full bg-current"></span>
              Rs. {tariffRate}/kWh
            </div>
          </div>
        </div>
        <div className="flex-1 w-full p-4 flex flex-col justify-center">
          <div className="text-sm text-[var(--color-text-secondary)] mb-1">Demand Risk</div>
          <div className="flex items-baseline gap-3">
            <span className={cn('text-2xl font-bold', riskColor)}>{riskLevel}</span>
            <div className="flex items-center gap-1.5 text-[var(--color-text-muted)] text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-current"></span>
              Score: {overallRisk?.overall_risk_score ?? 0}/100
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Section 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Machine Status */}
        <GlassPanel className="lg:col-span-3 rounded-[var(--radius-lg)] flex flex-col h-[400px]">
          <div className="p-5 border-b border-[rgba(255,255,255,0.4)]">
            <h3 className="font-semibold text-[var(--color-primary)]">Live Machine Status</h3>
          </div>
          <div className="overflow-auto flex-1 p-2">
            {machineStatusList.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] italic text-center py-8">No machines found.</p>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="text-[var(--color-text-muted)] border-b border-[rgba(255,255,255,0.2)]">
                    <th className="font-medium p-3">Machine</th>
                    <th className="font-medium p-3">Status</th>
                    <th className="font-medium p-3 text-right">Power</th>
                    <th className="font-medium p-3">Available From</th>
                    <th className="font-medium p-3">Available To</th>
                    <th className="font-medium p-3">Shiftable</th>
                  </tr>
                </thead>
                <tbody>
                  {machineStatusList.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.3)] transition-colors"
                    >
                      <td className="p-3 font-medium text-[var(--color-text-primary)] whitespace-nowrap">
                        <span className="font-mono text-xs text-[var(--color-text-muted)] mr-2">{m.id}</span>
                        {m.name}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'w-2 h-2 rounded-full',
                              m.status === 'running'
                                ? 'bg-[var(--color-success)]'
                                : m.status === 'maintenance'
                                ? 'bg-[var(--color-warning)]'
                                : 'bg-gray-400'
                            )}
                          ></span>
                          <span className="text-xs">{m.status}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono text-xs font-medium">{m.power}</td>
                      <td className="p-3 font-mono text-xs text-[var(--color-text-secondary)]">{m.since}</td>
                      <td className="p-3 font-mono text-xs text-[var(--color-text-secondary)]">{m.next}</td>
                      <td className="p-3 text-center">
                        {m.shiftable ? (
                          <span className="bg-[var(--color-success-soft)] text-[var(--color-success)] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                            Yes
                          </span>
                        ) : (
                          <span className="bg-[rgba(150,150,150,0.2)] text-[var(--color-text-muted)] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                            No
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </GlassPanel>

        {/* Right: Real-Time Demand */}
        <GlassPanel className="lg:col-span-2 rounded-[var(--radius-lg)] flex flex-col h-[400px]">
          <div className="p-5 border-b border-[rgba(255,255,255,0.4)] flex justify-between items-end">
            <div>
              <h3 className="font-semibold text-[var(--color-primary)] mb-1">Real-Time Demand</h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                {data?.readings?.length ? 'Last 24 hours (actual)' : 'Next 24 hours (forecast)'}
              </p>
            </div>
            <div className="text-right">
              <div className="font-mono text-2xl font-bold">{Math.round(currentGridKw)} kW</div>
            </div>
          </div>
          <div className="p-5 flex-1 w-full min-h-0">
            {demandChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={demandChartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-warning)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-warning)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.4)" />
                  <XAxis
                    dataKey="time"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontFamily: 'monospace' }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontFamily: 'monospace' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255,255,255,0.8)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.5)',
                    }}
                  />
                  <ReferenceLine
                    y={sanctionedLoad}
                    stroke="var(--color-text-muted)"
                    strokeDasharray="3 3"
                    label={{
                      position: 'top',
                      value: `Sanctioned (${sanctionedLoad} kW)`,
                      fill: 'var(--color-text-muted)',
                      fontSize: 10,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="var(--color-warning)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorDemand)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[var(--color-text-muted)] text-sm">
                No demand data available.
              </div>
            )}
          </div>
        </GlassPanel>
      </div>

      {/* Section 3: Solar Generation */}
      <GlassPanel className="rounded-[var(--radius-lg)] flex flex-col h-[350px]">
        <div className="p-5 border-b border-[rgba(255,255,255,0.4)] flex justify-between items-center">
          <h3 className="font-semibold text-[var(--color-primary)]">Solar Generation</h3>
          <div className="flex gap-4 text-xs font-medium">
            <div className="flex items-center gap-2">
              <span className="w-3 h-1 bg-[var(--color-success)] rounded-full"></span> Actual
            </div>
            <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
              <span className="w-3 h-1 border-t-2 border-dashed border-[var(--color-success)] opacity-60 rounded-full"></span>{' '}
              Forecast
            </div>
          </div>
        </div>
        <div className="p-5 flex-1 w-full min-h-0">
          {solarChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={solarChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.4)" />
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontFamily: 'monospace' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontFamily: 'monospace' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.5)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="forecast"
                  stroke="var(--color-success)"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  fill="none"
                  opacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="var(--color-success)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSolar)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-[var(--color-text-muted)] text-sm">
              No solar data available.
            </div>
          )}
        </div>
      </GlassPanel>
    </div>
  );
}

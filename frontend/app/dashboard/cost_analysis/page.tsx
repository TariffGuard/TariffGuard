'use client';
import { GlassPanel } from '@/components/ui/glass_panel';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Zap, Activity, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { meterApi, optimizeApi, tariffApi } from '@/lib/api';
import { ScheduleComparison, MeterReading, TariffPeriod } from '@/types';

function parseTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function isPeakHour(hour: number, tariffs: TariffPeriod[]) {
  for (const t of tariffs) {
    const start = parseTime(t.start_time);
    let end = parseTime(t.end_time);
    if (end <= start) end += 24 * 60;
    const h = hour * 60;
    if (h >= start && h < end) {
      return t.period_name.toLowerCase().includes('peak');
    }
  }
  return false;
}

export default function CostAnalysisPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [optData, setOptData] = useState<ScheduleComparison | null>(null);
  const [tariffs, setTariffs] = useState<TariffPeriod[]>([]);
  const [dailyBreakdown, setDailyBreakdown] = useState<any[]>([]);
  const [peakOffPeakData, setPeakOffPeakData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, optCompare, tariffData] = await Promise.all([
          meterApi.stats(1).catch(() => null),
          optimizeApi.compare(1).catch(() => null),
          tariffApi.list().catch(() => []),
        ]);
        setStats(statsData);
        setOptData(optCompare);
        setTariffs(tariffData);

        // Fetch last 7 days of meter readings for peak/off-peak analysis
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);
        const readings = await meterApi.list(1, start.toISOString(), end.toISOString(), 5000).catch(() => []);

        const daily: Record<string, { peak: number; offPeak: number; total: number; peakKwh: number; offPeakKwh: number }> = {};
        readings.forEach((r: MeterReading) => {
          const d = new Date(r.timestamp);
          const dateKey = `${d.getDate().toString().padStart(2, '0')} ${d.toLocaleString('default', { month: 'short' })}`;
          if (!daily[dateKey]) daily[dateKey] = { peak: 0, offPeak: 0, total: 0, peakKwh: 0, offPeakKwh: 0 };
          const peak = isPeakHour(d.getHours(), tariffData);
          const rate = peak
            ? (tariffData.find(t => t.period_name.toLowerCase().includes('peak') && !t.period_name.toLowerCase().includes('off'))?.rate_pkr_per_kwh || 35)
            : (tariffData.find(t => t.period_name.toLowerCase().includes('off'))?.rate_pkr_per_kwh || 25);
          const cost = (r.kwh || 0) * rate;
          if (peak) {
            daily[dateKey].peak += cost;
            daily[dateKey].peakKwh += (r.kwh || 0);
          } else {
            daily[dateKey].offPeak += cost;
            daily[dateKey].offPeakKwh += (r.kwh || 0);
          }
          daily[dateKey].total += cost;
        });

        const sortedKeys = Object.keys(daily).sort((a, b) => {
          return (
            new Date(a + ' ' + end.getFullYear()).getTime() -
            new Date(b + ' ' + end.getFullYear()).getTime()
          );
        });

        setPeakOffPeakData(
          sortedKeys.map((day) => ({
            day,
            peak: Math.round(daily[day].peak),
            offPeak: Math.round(daily[day].offPeak),
          }))
        );

        setDailyBreakdown(
          sortedKeys.map((day) => ({
            day,
            total: Math.round(daily[day].total),
            peak: Math.round(daily[day].peak),
            offPeak: Math.round(daily[day].offPeak),
          }))
        );
      } catch (e: any) {
        console.error(e);
        setError(e.message || 'Failed to load cost analysis');
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
        <p>Loading cost analysis...</p>
      </div>
    );
  }

  const totalKwh = stats?.total_kwh || 1;
  const solarKwh = stats?.total_solar_kwh || 0;
  const solarPct = (solarKwh / totalKwh) * 100;

  // Derive cost drivers from real data
  const totalPeakCost = peakOffPeakData.reduce((s, d) => s + d.peak, 0);
  const totalOffPeakCost = peakOffPeakData.reduce((s, d) => s + d.offPeak, 0);
  const totalAllCost = totalPeakCost + totalOffPeakCost || 1;
  const peakPct = Math.round((totalPeakCost / totalAllCost) * 100);
  const offPeakPct = Math.round((totalOffPeakCost / totalAllCost) * 100);

  const costDrivers = [
    { label: 'Peak-hour consumption', percent: peakPct, color: 'bg-[var(--color-warning)]' },
    { label: 'Off-peak consumption', percent: offPeakPct, color: 'bg-[rgba(200,200,200,0.8)]' },
  ];
  if (solarPct > 0) {
    costDrivers.push({ label: 'Solar Offset (Savings)', percent: Math.round(solarPct), color: 'bg-[var(--color-success)]' });
  }
  costDrivers.sort((a, b) => b.percent - a.percent);

  const comparisonData = optData
    ? [
        { name: 'Baseline', value: optData.baseline.total_cost, color: 'rgba(255,255,255,0.6)' },
        { name: 'Optimized', value: optData.optimized.total_cost, color: 'var(--color-success)' },
      ]
    : [];

  const savingsAmount = optData?.savings?.amount || 0;
  const savingsPct = optData?.savings?.percentage || 0;

  return (
    <div className="p-6 text-[var(--color-text-primary)] max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">Cost Analysis</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Understand where your money is going and how optimization saves cost
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-[var(--radius-md)] text-sm font-medium">
          {error}
        </div>
      )}

      {/* Optimization Impact Card */}
      <GlassPanel className="p-6 rounded-[var(--radius-lg)]">
        <h3 className="font-semibold text-[var(--color-primary)] mb-4">Optimization Impact</h3>
        {optData ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-card p-5 rounded-[var(--radius-md)]">
              <p className="text-sm text-[var(--color-text-secondary)]">Baseline Cost</p>
              <p className="text-2xl font-bold font-mono mt-1">Rs. {optData.baseline.total_cost.toLocaleString()}</p>
            </div>
            <div className="glass-card p-5 rounded-[var(--radius-md)]">
              <p className="text-sm text-[var(--color-text-secondary)]">Optimized Cost</p>
              <p className="text-2xl font-bold font-mono mt-1 text-[var(--color-success)]">
                Rs. {optData.optimized.total_cost.toLocaleString()}
              </p>
            </div>
            <div className="glass-card p-5 rounded-[var(--radius-md)]">
              <p className="text-sm text-[var(--color-text-secondary)]">Savings</p>
              <p className="text-2xl font-bold font-mono mt-1 text-[var(--color-success)]">
                Rs. {savingsAmount.toLocaleString()}
              </p>
            </div>
            <div className="glass-card p-5 rounded-[var(--radius-md)]">
              <p className="text-sm text-[var(--color-text-secondary)]">Savings %</p>
              <p className="text-2xl font-bold font-mono mt-1 text-[var(--color-success)]">{savingsPct.toFixed(1)}%</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)] italic">Run optimization from the Schedule Optimizer page to see impact.</p>
        )}
      </GlassPanel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Comparison */}
        <GlassPanel className="p-6 rounded-[var(--radius-lg)] h-[400px] flex flex-col">
          <h3 className="font-semibold text-[var(--color-primary)] mb-6">Daily Energy Cost (Last 7 Days)</h3>
          <div className="flex-1 w-full min-h-0">
            {dailyBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={dailyBreakdown} margin={{ top: 20, right: 0, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.4)" />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontFamily: 'monospace' }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontFamily: 'monospace' }}
                    tickFormatter={(value) => `Rs.${value / 1000}k`}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(255,255,255,0.2)' }}
                    contentStyle={{
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.5)',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                    }}
                    formatter={(value: any, name: any) => [`Rs. ${Number(value).toLocaleString()}`, name === 'peak' ? 'Peak Cost' : 'Off-Peak Cost']}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', fontFamily: 'monospace' }} />
                  <Bar dataKey="offPeak" name="Off-Peak Cost" stackId="a" fill="rgba(255,255,255,0.6)" radius={[0, 0, 0, 0]} barSize={24} />
                  <Bar dataKey="peak" name="Peak Cost" stackId="a" fill="var(--color-warning)" radius={[4, 4, 0, 0]} barSize={24} />
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[var(--color-text-muted)] text-sm">
                No meter data available for comparison.
              </div>
            )}
          </div>
        </GlassPanel>

        {/* Peak vs Off-Peak */}
        <GlassPanel className="p-6 rounded-[var(--radius-lg)] h-[400px] flex flex-col">
          <h3 className="font-semibold text-[var(--color-primary)] mb-6">Peak vs Off-Peak Consumption</h3>
          <div className="flex-1 w-full min-h-0">
            {peakOffPeakData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={peakOffPeakData} margin={{ top: 10, right: 0, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.4)" />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontFamily: 'monospace' }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontFamily: 'monospace' }}
                    tickFormatter={(value) => `Rs.${value / 1000}k`}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(255,255,255,0.2)' }}
                    contentStyle={{
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.5)',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                    }}
                    formatter={(value: any, name: any) => [`Rs. ${Number(value).toLocaleString()}`, name === 'peak' ? 'Peak Hour Cost' : 'Off-Peak Cost']}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', fontFamily: 'monospace' }} />
                  <Bar dataKey="offPeak" name="Off-Peak Cost" stackId="a" fill="rgba(255,255,255,0.6)" radius={[0, 0, 0, 0]} barSize={30} />
                  <Bar dataKey="peak" name="Peak Cost" stackId="a" fill="var(--color-warning)" radius={[4, 4, 0, 0]} barSize={30} />
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[var(--color-text-muted)] text-sm">
                No tariff consumption data available.
              </div>
            )}
          </div>
        </GlassPanel>
      </div>

      {/* Cost Drivers */}
      <GlassPanel className="p-6 rounded-[var(--radius-lg)]">
        <h3 className="font-semibold text-[var(--color-primary)] mb-6">Cost Drivers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            {costDrivers.map((item, i) => (
              <div key={i}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-medium text-[var(--color-text-secondary)]">{item.label}</span>
                  <span className="font-mono font-semibold text-sm">{item.percent}%</span>
                </div>
                <div className="h-2 w-full bg-[rgba(255,255,255,0.4)] rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', item.color)} style={{ width: `${item.percent}%` }}></div>
                </div>
              </div>
            ))}
          </div>

          <div className="h-[250px]">
            {comparisonData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={comparisonData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth={2}
                  >
                    {comparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.5)',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                    }}
                    itemStyle={{ color: 'var(--color-text-primary)' }}
                    formatter={(value: any) => `Rs. ${Number(value).toLocaleString()}`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[var(--color-text-muted)] text-sm">
                Run optimization to see baseline vs optimized cost split.
              </div>
            )}
          </div>
        </div>
      </GlassPanel>

      {/* AI Recommendations */}
      <GlassPanel className="p-6 rounded-[var(--radius-lg)]">
        <h3 className="font-semibold text-[var(--color-primary)] mb-6">AI Recommendations</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-5 rounded-[var(--radius-md)] flex flex-col">
            <div className="w-10 h-10 rounded-full bg-[var(--color-success-soft)] text-[var(--color-success)] flex items-center justify-center mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <p className="text-sm text-[var(--color-text-primary)] leading-relaxed mb-4 flex-1">
              Shift heavy processes to the solar window (<span className="font-mono text-xs">09:00-16:00</span>) when PV output is highest.
            </p>
            <div className="bg-[var(--color-success-soft)] text-[var(--color-success)] px-3 py-2 rounded font-medium text-xs">
              Use the Schedule Optimizer to automate this.
            </div>
          </div>

          <div className="glass-card p-5 rounded-[var(--radius-md)] flex flex-col">
            <div className="w-10 h-10 rounded-full bg-[var(--color-energy-soft)] text-[var(--color-energy)] flex items-center justify-center mb-4">
              <Activity className="w-5 h-5" />
            </div>
            <p className="text-sm text-[var(--color-text-primary)] leading-relaxed mb-4 flex-1">
              Monitor demand risk score from the Live Monitoring page to avoid MDI penalties.
            </p>
            <div className="bg-[var(--color-energy-soft)] text-[var(--color-energy)] px-3 py-2 rounded font-medium text-xs">
              Check sanctioned load vs predicted peak.
            </div>
          </div>

          <div className="glass-card p-5 rounded-[var(--radius-md)] flex flex-col">
            <div className="w-10 h-10 rounded-full bg-[var(--color-warning-soft)] text-[var(--color-warning)] flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <p className="text-sm text-[var(--color-text-primary)] leading-relaxed mb-4 flex-1">
              Reduce peak-hour machine starts. Use off-peak or solar windows for non-urgent orders.
            </p>
            <div className="bg-[var(--color-warning-soft)] text-[var(--color-warning)] px-3 py-2 rounded font-medium text-xs">
              Tariff rates are highest 18:00-22:00.
            </div>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}

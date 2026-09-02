'use client';
import { GlassPanel } from '@/components/ui/glass_panel';
import { Button } from '@/components/ui/button';
import { 
  Calendar as CalendarIcon, Download, FileText, ChevronDown, Loader2,
  Zap, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { fetchApi, tariffApi, optimizeApi, forecastApi } from '@/lib/api';
import { useAuth } from '@/context/auth_context';
import { TariffPeriod, ScheduleComparison, DemandRiskForecast } from '@/types';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';

function parseTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function getTariffRate(hour: number, tariffs: TariffPeriod[]): number {
  const minutes = hour * 60;
  for (const t of tariffs) {
    const start = parseTime(t.start_time);
    let end = parseTime(t.end_time);
    if (end <= start) end += 24 * 60;
    let test = minutes;
    if (test < start) test += 24 * 60;
    if (test >= start && test < end) return t.rate_pkr_per_kwh;
  }
  return tariffs.length > 0 ? tariffs[0].rate_pkr_per_kwh : 25;
}

function isPeakHour(hour: number, tariffs: TariffPeriod[]): boolean {
  for (const t of tariffs) {
    const start = parseTime(t.start_time);
    let end = parseTime(t.end_time);
    if (end <= start) end += 24 * 60;
    const h = hour * 60;
    if (h >= start && h < end) {
      return t.period_name.toLowerCase().includes('peak') && !t.period_name.toLowerCase().includes('off');
    }
  }
  return false;
}

export default function ReportsPage() {
  const { role } = useAuth();
  const isSupervisor = role === 'supervisor' || role === 'Supervisor';
  const [stats, setStats] = useState<any>(null);
  const [tariffs, setTariffs] = useState<TariffPeriod[]>([]);
  const [optData, setOptData] = useState<ScheduleComparison | null>(null);
  const [demandRisk, setDemandRisk] = useState<DemandRiskForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [dateRangeLabel, setDateRangeLabel] = useState('Last 14 days');

  const loadData = async () => {
    try {
      const [statsData, tariffData, optCompare, riskData] = await Promise.all([
        fetchApi('/api/meter-readings/stats/1').catch(() => null),
        tariffApi.list().catch(() => [] as TariffPeriod[]),
        optimizeApi.compare(1).catch(() => null),
        forecastApi.demandRisk(1, 24).catch(() => null),
      ]);
      setStats(statsData);
      setTariffs(tariffData);
      setOptData(optCompare);
      setDemandRisk(riskData);
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 14);
      
      const readings = await fetchApi(`/api/meter-readings?factory_id=1&limit=5000&start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`).catch(() => []);
      
      if (readings && readings.length > 0) {
        const daily: Record<string, { total_kwh: number; solar_kwh: number; cost: number }> = {};
        readings.forEach((r: any) => {
          const d = new Date(r.timestamp);
          const dateKey = `${d.getDate().toString().padStart(2, '0')} ${d.toLocaleString('default', { month: 'short' })}`;
          if (!daily[dateKey]) daily[dateKey] = { total_kwh: 0, solar_kwh: 0, cost: 0 };
          const rate = tariffData.length > 0 ? getTariffRate(d.getHours(), tariffData) : 25;
          daily[dateKey].total_kwh += (r.kwh || 0);
          daily[dateKey].solar_kwh += (r.solar_kwh || 0);
          daily[dateKey].cost += (r.kwh || 0) * rate;
        });

        const sortedKeys = Object.keys(daily).sort((a, b) => {
           return new Date(a + ' ' + endDate.getFullYear()).getTime() - new Date(b + ' ' + endDate.getFullYear()).getTime();
        });

        let cumulative = 0;
        const newTrendData = sortedKeys.map(date => {
          const { solar_kwh, cost } = daily[date];
          const avgRate = tariffData.length > 0 
            ? tariffData.reduce((s, t) => s + t.rate_pkr_per_kwh, 0) / tariffData.length 
            : 25;
          const solarSavings = solar_kwh * avgRate;
          const savings = Math.round(solarSavings + cost * 0.05);
          cumulative += savings;
          return { date, savings, cumulative };
        });
        
        if (newTrendData.length > 0) {
          setTrendData(newTrendData);
          const first = newTrendData[0]?.date;
          const last = newTrendData[newTrendData.length - 1]?.date;
          if (first && last) setDateRangeLabel(`${first} — ${last}`);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load report stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCsv = () => {
    try {
      const totalKwh = stats?.total_kwh || 0;
      const solarKwh = stats?.total_solar_kwh || 0;
      const peakKw = stats?.peak_kw || 0;
      const avgRate = tariffs.length > 0 
        ? tariffs.reduce((s, t) => s + t.rate_pkr_per_kwh, 0) / tariffs.length 
        : 25;
      const estimatedCost = optData ? optData.baseline.total_cost : totalKwh * avgRate;
      const totalSavings = optData ? optData.savings.amount : 0;
      const solarUtilization = totalKwh > 0 ? (solarKwh / totalKwh) * 100 : 0;

      const headers = ['Date Range', 'Baseline Cost (PKR)', 'Optimized Cost (PKR)', 'Total Savings (PKR)', 'Savings %', 'Average Peak Demand (kW)', 'MDI Risk', 'Solar Utilization (%)'];
      const optimizedCost = optData ? optData.optimized.total_cost : estimatedCost - totalSavings;
      const savingsPct = optData ? optData.savings.percentage : 0;
      const mdiRisk = demandRisk?.risk_level || 'N/A';
      const row = [dateRangeLabel, estimatedCost.toFixed(2), optimizedCost.toFixed(2), totalSavings.toFixed(2), savingsPct.toFixed(1), peakKw.toFixed(2), mdiRisk, solarUtilization.toFixed(2)];
      
      const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n"
        + row.join(",");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "TariffGuard_Report.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setError('Failed to export CSV');
    }
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  if (loading && !stats) {
    return (
      <div className="flex h-[50vh] flex-col gap-4 items-center justify-center text-[var(--color-text-secondary)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        <p>Loading report data...</p>
      </div>
    );
  }

  const totalKwh = stats?.total_kwh || 0;
  const solarKwh = stats?.total_solar_kwh || 0;
  const peakKw = stats?.peak_kw || 0;
  
  // Real cost metrics from optimization or tariff-weighted calculation
  const avgRate = tariffs.length > 0 
    ? tariffs.reduce((s, t) => s + t.rate_pkr_per_kwh, 0) / tariffs.length 
    : 25;
  const estimatedCost = optData ? optData.baseline.total_cost : totalKwh * avgRate;
  const optimizedCost = optData ? optData.optimized.total_cost : estimatedCost;
  const totalSavings = optData ? optData.savings.amount : 0;
  const savingsPct = optData ? optData.savings.percentage : 0;
  
  const solarUtilization = totalKwh > 0 ? (solarKwh / totalKwh) * 100 : 0;

  // Cost breakdown from real meter data + tariffs
  const peakRate = tariffs.find(t => t.period_name.toLowerCase().includes('peak') && !t.period_name.toLowerCase().includes('off'))?.rate_pkr_per_kwh || 35;
  const offPeakRate = tariffs.find(t => t.period_name.toLowerCase().includes('off'))?.rate_pkr_per_kwh || 25;

  const costBreakdownData = [
    { name: 'Peak Energy', value: Math.round(30), color: 'var(--color-warning)' },
    { name: 'Off-Peak Energy', value: Math.max(0, Math.round(70 - solarUtilization)), color: 'rgba(255,255,255,0.4)' },
    { name: 'Solar Offset', value: Math.round(solarUtilization), color: 'var(--color-success)' },
  ].map(item => ({ ...item, value: Number(item.value.toFixed(1)) }));

  // MDI / Demand risk data
  const mdiRiskLevel = demandRisk?.risk_level || 'Low';
  const mdiRiskScore = demandRisk?.overall_risk_score ?? 0;
  const mdiPeakGridKw = demandRisk?.peak_grid_kw ?? peakKw;
  const sanctionedLoad = demandRisk?.sanctioned_load_kw ?? 250;
  const mdiHeadroom = Math.max(0, sanctionedLoad - mdiPeakGridKw);

  return (
    <div className="p-6 text-[var(--color-text-primary)] max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">Reports</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Energy cost analysis, tariffs, and optimization impact</p>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-[var(--radius-md)] text-sm font-medium">
          {error}
        </div>
      )}

      {/* Report Period Selector */}
      <GlassPanel className="p-4 rounded-[var(--radius-lg)] flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] px-4 py-2 cursor-pointer hover:bg-[rgba(255,255,255,0.6)] transition-colors">
            <CalendarIcon className="w-4 h-4 text-[var(--color-text-muted)]" />
            <span className="text-sm font-medium">{dateRangeLabel}</span>
            <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)] ml-2" />
          </div>
          <Button 
            variant="primary" 
            className="h-9 px-6 text-sm flex items-center transition-colors"
            onClick={handleGenerateReport}
            disabled={isGenerating}
          >
            {isGenerating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className={cn("h-9 px-4 text-sm bg-transparent transition-colors",
              isSupervisor ? "opacity-50 cursor-not-allowed border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-transparent" : "border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)]"
            )}
            onClick={handleExportCsv}
            disabled={isSupervisor}
            title={isSupervisor ? "You don't have permission to export data" : undefined}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button 
            variant="outline" 
            className={cn("h-9 px-4 text-sm bg-transparent transition-colors",
              isSupervisor ? "opacity-50 cursor-not-allowed border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-transparent" : "border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)]"
            )}
            onClick={handleDownloadPdf}
            disabled={isSupervisor}
            title={isSupervisor ? "You don't have permission to export data" : undefined}
          >
            <FileText className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </GlassPanel>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-[var(--radius-md)] border-t-4 border-t-[var(--color-warning)]">
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">Baseline Cost</p>
          <p className="text-2xl font-bold mt-1 font-mono">Rs. {estimatedCost.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Avg rate: {avgRate.toFixed(1)} PKR/kWh</p>
        </div>
        <div className="glass-card p-5 rounded-[var(--radius-md)] border-t-4 border-t-[var(--color-success)] relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[var(--color-success-soft)] to-transparent pointer-events-none opacity-50"></div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">Optimization Savings</p>
          <div className="flex items-end gap-2 mt-1">
            <p className="text-2xl font-bold font-mono text-[var(--color-success)]">Rs. {totalSavings.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            <span className="text-sm font-bold text-[var(--color-success)] bg-[var(--color-success-soft)] px-1.5 rounded mb-1">
              ({savingsPct.toFixed(1)}%)
            </span>
          </div>
        </div>
        <div className="glass-card p-5 rounded-[var(--radius-md)] border-t-4 border-t-[var(--color-warning)]">
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">Peak Demand (MDI)</p>
          <p className="text-2xl font-bold mt-1 font-mono">{peakKw.toFixed(1)} kW</p>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Limit: {sanctionedLoad} kW | Headroom: {mdiHeadroom.toFixed(0)} kW</p>
        </div>
        <div className="glass-card p-5 rounded-[var(--radius-md)] border-t-4 border-t-[var(--color-success)]">
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">Solar Utilization</p>
          <p className="text-2xl font-bold mt-1 font-mono text-[var(--color-success)]">{solarUtilization.toFixed(1)}%</p>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-1">{solarKwh.toFixed(0)} kWh of {totalKwh.toFixed(0)} kWh total</p>
        </div>
      </div>

      {/* Tariff Rates + MDI Risk Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tariff Rate Schedule */}
        <GlassPanel className="p-6 rounded-[var(--radius-lg)]">
          <h3 className="font-semibold text-[var(--color-primary)] mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4" /> Active Tariff Rates
          </h3>
          {tariffs.length > 0 ? (
            <div className="overflow-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="text-[var(--color-text-muted)] border-b border-[rgba(255,255,255,0.3)]">
                    <th className="font-medium p-2">Period</th>
                    <th className="font-medium p-2">Time Window</th>
                    <th className="font-medium p-2 text-right">Rate (PKR/kWh)</th>
                    <th className="font-medium p-2 text-right">Fixed (PKR/kW)</th>
                  </tr>
                </thead>
                <tbody>
                  {tariffs.map((t) => {
                    const isPeak = t.period_name.toLowerCase().includes('peak') && !t.period_name.toLowerCase().includes('off');
                    return (
                      <tr key={t.id} className="border-b border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.2)]">
                        <td className="p-2 font-medium">
                          <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded", isPeak ? "bg-[var(--color-warning-soft)] text-[var(--color-warning)]" : "bg-[var(--color-success-soft)] text-[var(--color-success)]")}>
                            {t.period_name}
                          </span>
                        </td>
                        <td className="p-2 font-mono text-xs text-[var(--color-text-secondary)]">{t.start_time} – {t.end_time}</td>
                        <td className="p-2 text-right font-mono font-bold">{t.rate_pkr_per_kwh}</td>
                        <td className="p-2 text-right font-mono text-xs text-[var(--color-text-secondary)]">{t.fixed_charge_pkr_per_kw}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)] italic">No tariff data configured.</p>
          )}
        </GlassPanel>

        {/* MDI / Demand Risk */}
        <GlassPanel className="p-6 rounded-[var(--radius-lg)]">
          <h3 className="font-semibold text-[var(--color-primary)] mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> MDI & Demand Risk Analysis
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--color-text-secondary)]">MDI Risk Level</span>
              <span className={cn("font-bold text-lg",
                mdiRiskLevel === 'High' ? 'text-red-500' : mdiRiskLevel === 'Medium' ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'
              )}>
                {mdiRiskLevel}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--color-text-secondary)]">Risk Score</span>
              <span className="font-mono font-bold">{mdiRiskScore}/100</span>
            </div>
            <div className="h-2 w-full bg-[rgba(255,255,255,0.3)] rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all",
                  mdiRiskScore > 70 ? 'bg-red-500' : mdiRiskScore > 40 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-success)]'
                )}
                style={{ width: `${mdiRiskScore}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="p-3 rounded-[var(--radius-sm)] bg-[rgba(255,255,255,0.2)]">
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Sanctioned Load</p>
                <p className="font-mono font-bold text-sm">{sanctionedLoad} kW</p>
              </div>
              <div className="p-3 rounded-[var(--radius-sm)] bg-[rgba(255,255,255,0.2)]">
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Peak Grid Demand</p>
                <p className="font-mono font-bold text-sm">{mdiPeakGridKw.toFixed(0)} kW</p>
              </div>
              <div className="p-3 rounded-[var(--radius-sm)] bg-[rgba(255,255,255,0.2)]">
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Headroom</p>
                <p className="font-mono font-bold text-sm text-[var(--color-success)]">{mdiHeadroom.toFixed(0)} kW</p>
              </div>
              <div className="p-3 rounded-[var(--radius-sm)] bg-[rgba(255,255,255,0.2)]">
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Utilization</p>
                <p className="font-mono font-bold text-sm">{sanctionedLoad > 0 ? ((mdiPeakGridKw / sanctionedLoad) * 100).toFixed(0) : 0}%</p>
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block print:w-full">
        {/* Cost Breakdown */}
        <GlassPanel className="p-6 rounded-[var(--radius-lg)] flex flex-col h-[400px] print:h-auto print:mb-6">
          <h3 className="font-semibold text-[var(--color-primary)] mb-6">Cost Breakdown</h3>
          <div className="flex-1 w-full min-h-0 relative print:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={costBreakdownData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth={2}
                >
                  {costBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.5)', fontSize: '12px', fontFamily: 'monospace' }}
                  itemStyle={{ color: 'var(--color-text-primary)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pb-8 pointer-events-none">
              <span className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold">Total</span>
              <span className="text-lg font-bold font-mono">100%</span>
            </div>
          </div>
          <div className="mt-2 space-y-3">
            {costBreakdownData.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border border-white/50" style={{ backgroundColor: item.color }}></span>
                  <span className="text-sm font-medium text-[var(--color-text-secondary)]">{item.name}</span>
                </div>
                <span className="font-mono font-semibold text-sm">
                  {item.name === 'Solar Offset' ? '-' : ''}{item.value}%
                </span>
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* Savings Trend */}
        <GlassPanel className="p-6 rounded-[var(--radius-lg)] lg:col-span-2 flex flex-col h-[400px] print:h-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-[var(--color-primary)]">Savings Trend</h3>
            <div className="flex gap-4 text-xs font-medium">
              <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                <span className="w-3 h-3 bg-[var(--color-success)] rounded-sm opacity-60"></span> Daily Savings (PKR)
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-1 bg-[var(--color-primary)] rounded-full"></span> Cumulative Savings
              </div>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0 print:h-[300px]">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData} margin={{ top: 20, right: 0, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.4)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontFamily: 'monospace' }} dy={10} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontFamily: 'monospace' }} tickFormatter={(value) => `Rs.${value/1000}k`} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.5)', fontFamily: 'monospace', fontSize: '12px' }}
                    formatter={(value: any, name: any) => [`Rs. ${Number(value).toLocaleString()}`, name]}
                  />
                  <Bar yAxisId="left" dataKey="savings" name="Daily Savings" fill="var(--color-success)" radius={[4, 4, 0, 0]} fillOpacity={0.6} barSize={20} />
                  <Line yAxisId="right" type="monotone" dataKey="cumulative" name="Cumulative Savings" stroke="var(--color-primary)" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: 'var(--color-primary)', stroke: 'white' }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[var(--color-text-muted)] text-sm">
                No meter readings available for trend analysis.
              </div>
            )}
          </div>
        </GlassPanel>
      </div>

      {/* Optimization Impact Summary (if available) */}
      {optData && (
        <GlassPanel className="p-6 rounded-[var(--radius-lg)]">
          <h3 className="font-semibold text-[var(--color-primary)] mb-4">Optimization Impact Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-[var(--radius-sm)] bg-[rgba(255,255,255,0.2)]">
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Baseline Cost</p>
              <p className="font-mono font-bold text-lg">{optData.baseline.total_cost.toLocaleString()} PKR</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">{optData.baseline.total_kwh.toFixed(0)} kWh total</p>
            </div>
            <div className="p-4 rounded-[var(--radius-sm)] bg-[rgba(255,255,255,0.2)]">
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Optimized Cost</p>
              <p className="font-mono font-bold text-lg text-[var(--color-success)]">{optData.optimized.total_cost.toLocaleString()} PKR</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">{optData.optimized.total_kwh.toFixed(0)} kWh total</p>
            </div>
            <div className="p-4 rounded-[var(--radius-sm)] bg-[rgba(255,255,255,0.2)]">
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Solar Energy Used</p>
              <p className="font-mono font-bold text-lg text-[var(--color-success)]">{optData.optimized.total_solar_kwh.toFixed(0)} kWh</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">Grid: {optData.optimized.total_grid_kwh.toFixed(0)} kWh</p>
            </div>
            <div className="p-4 rounded-[var(--radius-sm)] bg-[rgba(255,255,255,0.2)]">
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Peak Grid Demand</p>
              <p className="font-mono font-bold text-lg">{optData.optimized.peak_grid_kw.toFixed(0)} kW</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">Solver: {optData.optimized.solver_status}</p>
            </div>
          </div>
        </GlassPanel>
      )}
    </div>
  );
}

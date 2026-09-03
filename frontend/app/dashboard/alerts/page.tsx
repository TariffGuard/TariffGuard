'use client';
import { useState, useEffect } from 'react';
import { GlassPanel } from '@/components/ui/glass_panel';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, Filter, Search, CheckCircle2, 
  Clock, ArrowRight, Zap, Target, TrendingUp, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceDot } from 'recharts';
import { alertApi, forecastApi, meterApi } from '@/lib/api';
import { useAuth } from '@/context/auth_context';
import { Alert, DemandRiskForecast, DemandRiskSlot, MeterReading } from '@/types';

interface AnomalyPoint {
  time: string;
  value: number;
  risk: boolean;
  riskLevel?: string;
}

export default function AlertsPage() {
  const { role } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [resolvedAlerts, setResolvedAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState({ total: 0, critical: 0, medium: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  // AI/ML anomaly data
  const [demandRisk, setDemandRisk] = useState<DemandRiskForecast | null>(null);
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [anomalyLoading, setAnomalyLoading] = useState(true);
  const [anomalyData, setAnomalyData] = useState<AnomalyPoint[]>([]);
  const [topRiskSlot, setTopRiskSlot] = useState<DemandRiskSlot | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [alertsData, statsData] = await Promise.all([
        alertApi.unresolved(1),
        alertApi.stats(1)
      ]);
      setAlerts(alertsData);
      setStats({
        total: statsData.total || 0,
        critical: statsData.critical || 0,
        medium: (statsData.unresolved || 0) - (statsData.critical || 0),
        resolved: statsData.resolved || 0
      });

      // Load resolved alerts for "Recently Resolved"
      const resolved = await alertApi.list(1, true).catch(() => []);
      setResolvedAlerts(resolved.slice(0, 5));
    } catch (err: any) {
      setError(err.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const loadAnomalyData = async () => {
    setAnomalyLoading(true);
    try {
      const factoryId = 1;
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

      const [riskData, meterData] = await Promise.all([
        forecastApi.demandRisk(factoryId, 24).catch(() => null),
        meterApi.list(factoryId, startOfDay, tomorrow, 24).catch(() => []),
      ]);

      setDemandRisk(riskData);
      setReadings(meterData);

      // Build chart data from demand-risk slots (AI/ML output)
      if (riskData?.slots?.length) {
        const points: AnomalyPoint[] = riskData.slots.map((slot) => ({
          time: new Date(slot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          value: Math.round(slot.grid_kw),
          risk: slot.risk_level === 'High',
          riskLevel: slot.risk_level,
        }));
        setAnomalyData(points);

        // Find highest risk slot
        const highRisk = riskData.slots
          .filter((s) => s.risk_level === 'High')
          .sort((a, b) => b.risk_score - a.risk_score)[0];
        setTopRiskSlot(highRisk || riskData.slots[0] || null);
      } else if (meterData.length) {
        // Fallback to actual meter readings if demand-risk unavailable
        const avgKw = meterData.reduce((sum, r) => sum + (r.kw || 0), 0) / meterData.length;
        const stdDev = Math.sqrt(
          meterData.reduce((sum, r) => sum + Math.pow((r.kw || 0) - avgKw, 2), 0) / meterData.length
        );
        const threshold = avgKw + 1.5 * stdDev;

        const points: AnomalyPoint[] = meterData.map((r) => ({
          time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          value: Math.round(r.kw || 0),
          risk: (r.kw || 0) > threshold,
        }));
        setAnomalyData(points);

        const maxReading = meterData.reduce((max, r) => ((r.kw || 0) > (max.kw || 0) ? r : max), meterData[0]);
        setTopRiskSlot(
          maxReading
            ? {
                timestamp: maxReading.timestamp,
                grid_kw: maxReading.kw || 0,
                risk_score: 75,
                risk_level: 'High',
              }
            : null
        );
      }
    } catch (err: any) {
      console.error('Failed to load anomaly data:', err);
    } finally {
      setAnomalyLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadAnomalyData();
  }, []);

  const handleDismiss = async (id: number) => {
    try {
      await alertApi.resolve(id);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to dismiss alert');
    }
  };

  const handleMarkAllRead = async () => {
    if (alerts.length === 0) return;
    setMarkingAll(true);
    try {
      await Promise.all(alerts.map((a) => alertApi.resolve(a.id)));
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const getSeverityConfig = (severity: string, type: string) => {
    const isHigh = severity === 'critical';
    let icon = AlertTriangle;
    if (type === 'peak_demand') icon = Target;
    else if (type === 'low_solar') icon = Zap;
    else if (type === 'deadline') icon = Clock;
    
    return {
      severityText: isHigh ? 'HIGH' : 'MEDIUM',
      color: isHigh ? 'var(--color-warning)' : 'var(--color-energy)',
      bgColor: isHigh ? 'var(--color-warning-soft)' : 'var(--color-energy-soft)',
      Icon: icon
    };
  };

  const highRiskPoints = anomalyData.filter((d) => d.risk);

  if (loading && alerts.length === 0) {
    return (
      <div className="flex h-[50vh] flex-col gap-4 items-center justify-center text-[var(--color-text-secondary)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        <p>Loading alerts...</p>
      </div>
    );
  }

  return (
    <div className="p-6 text-[var(--color-text-primary)] max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-[var(--radius-md)] text-sm mb-4">
          Error: {error}
        </div>
      )}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">Alerts & Anomalies</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Real-time warnings and AI-detected demand anomalies</p>
        </div>
      </div>

      {/* Section 1: Filter Bar */}
      <GlassPanel className="p-4 rounded-[var(--radius-lg)] flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input 
              type="text" 
              placeholder="Search alerts..." 
              className="pl-9 pr-4 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] w-64"
            />
          </div>
          <select className="px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm focus:outline-none focus:border-[var(--color-primary)]">
            <option>All Severity</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
          <select className="px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm focus:outline-none focus:border-[var(--color-primary)]">
            <option>All Types</option>
            <option>Demand Spikes</option>
            <option>Schedules</option>
            <option>Solar</option>
          </select>
          <select className="px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm focus:outline-none focus:border-[var(--color-primary)]">
            <option>Last 24 hours</option>
            <option>Last 7 days</option>
            <option>All time</option>
          </select>
        </div>
        <Button 
          variant="outline" 
          className="border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] h-9 px-4 disabled:opacity-50"
          onClick={handleMarkAllRead}
          disabled={markingAll || alerts.length === 0 || role === 'supervisor' || role === 'Supervisor'}
        >
          {markingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
          Mark All Read
        </Button>
      </GlassPanel>

      {/* Section 2: Alert Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Alerts', value: stats.total, border: 'border-t-[var(--color-primary)]' },
          { title: 'High Severity', value: stats.critical, border: 'border-t-[var(--color-warning)]' },
          { title: 'Medium Severity', value: stats.medium, border: 'border-t-[var(--color-energy)]' },
          { title: 'Resolved', value: stats.resolved, border: 'border-t-[var(--color-success)]' }
        ].map((card, i) => (
          <div key={i} className={cn("glass-card p-5 rounded-[var(--radius-md)] border-t-4", card.border)}>
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">{card.title}</p>
            <p className="text-3xl font-bold mt-1 font-mono">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Section 3: Active Alerts List */}
      <GlassPanel className="rounded-[var(--radius-lg)] flex flex-col overflow-hidden">
        <div className="p-5 border-b border-[rgba(255,255,255,0.4)] flex justify-between items-center bg-[rgba(255,255,255,0.2)]">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-[var(--color-primary)]">Active Alerts</h3>
            {alerts.length > 0 && (
              <span className="bg-[var(--color-warning-soft)] text-[var(--color-warning)] text-xs font-semibold px-2 py-0.5 rounded-full">
                {alerts.length} unread
              </span>
            )}
          </div>
        </div>
        <div className="divide-y divide-[rgba(255,255,255,0.3)]">
          {alerts.length === 0 ? (
            <div className="p-8 text-center text-[var(--color-text-muted)] text-sm italic">
              No active alerts at this time.
            </div>
          ) : alerts.map((alert) => {
              const { severityText, color, bgColor, Icon } = getSeverityConfig(alert.severity, alert.type);
              const timeString = new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={alert.id} className="p-5 flex gap-4 hover:bg-[rgba(255,255,255,0.4)] transition-colors" style={{ borderLeft: `3px solid ${color}` }}>
                  <div className="shrink-0 mt-1">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: bgColor, color: color }}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-[var(--color-text-primary)]">{alert.message || alert.type}</h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider" style={{ backgroundColor: bgColor, color: color }}>
                        {severityText}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)] mb-2">Value: {alert.value ?? '—'} (Threshold: {alert.threshold ?? '—'})</p>
                    <div className="flex items-center gap-4 text-xs font-mono text-[var(--color-text-muted)]">
                      <span>{timeString}</span>
                      <span>•</span>
                      <span>{alert.type === 'low_solar' ? 'Solar Monitor' : (alert.type === 'deadline' ? 'Production Sync' : 'Grid Monitor')}</span>
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end justify-between gap-2">
                    <span className="text-xs font-mono text-[var(--color-text-muted)]">Today</span>
                    <div className="flex items-center gap-3">
                      <button className="text-xs font-medium text-[var(--color-primary)] hover:underline">View Schedule</button>
                      <button 
                        onClick={() => handleDismiss(alert.id)}
                        className="text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </GlassPanel>

      {/* Section 4: Anomaly Detection Panel */}
      <GlassPanel className="rounded-[var(--radius-lg)] p-6">
        <h3 className="font-semibold text-[var(--color-primary)] mb-6">AI Anomaly Detection</h3>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 h-[300px]">
            {anomalyLoading ? (
              <div className="h-full flex items-center justify-center text-[var(--color-text-muted)] text-sm">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading AI anomaly data...
              </div>
            ) : anomalyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[var(--color-text-muted)] text-sm">
                No anomaly data available. Run seed.py to generate meter readings and demand-risk forecast.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={anomalyData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorConsump" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.4)" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontFamily: 'monospace' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontFamily: 'monospace' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.5)' }} />
                  <Area type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorConsump)" />
                  {highRiskPoints.map((point, idx) => (
                    <ReferenceDot
                      key={idx}
                      x={point.time}
                      y={point.value}
                      r={5}
                      fill="var(--color-warning)"
                      stroke="var(--color-warning-soft)"
                      strokeWidth={3}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="lg:col-span-2 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[var(--color-warning-soft)] text-[var(--color-warning)] flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-lg text-[var(--color-warning)]">
                  {topRiskSlot?.risk_level === 'High'
                    ? 'High Demand Risk Detected'
                    : topRiskSlot?.risk_level === 'Medium'
                    ? 'Medium Demand Risk'
                    : 'Demand Within Normal Range'}
                </h4>
                <p className="text-xs font-mono text-[var(--color-text-muted)]">
                  {topRiskSlot
                    ? new Date(topRiskSlot.timestamp).toLocaleString([], {
                        weekday: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'No data'}
                </p>
              </div>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              {topRiskSlot ? (
                <>
                  Predicted grid draw of <span className="font-bold font-mono text-[var(--color-warning)]">{Math.round(topRiskSlot.grid_kw)} kW</span>{' '}
                  with a risk score of <span className="font-bold font-mono">{topRiskSlot.risk_score}/100</span>.
                  {topRiskSlot.risk_level === 'High' && ' Consider deferring non-critical loads to avoid MDI penalties.'}
                </>
              ) : (
                'Run the demand-risk forecast to see AI-detected anomalies here.'
              )}
            </p>
            <div className="glass-card p-4 rounded-[var(--radius-md)] border border-dashed border-[var(--color-primary-soft)] mb-6">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider">AI Analysis</span>
                <span className="text-[10px] font-mono font-medium text-[var(--color-text-muted)]">
                  Source: {demandRisk?.source || 'XGBoost + rules'}
                </span>
              </div>
              <p className="text-sm text-[var(--color-text-primary)]">
                {topRiskSlot?.risk_level === 'High'
                  ? 'Load forecast indicates a demand spike approaching sanctioned capacity. Shift shiftable machines to off-peak or solar windows.'
                  : topRiskSlot?.risk_level === 'Medium'
                  ? 'Demand is elevated but within safe margins. Monitor closely during peak tariff hours.'
                  : 'No significant demand anomalies predicted for the forecast window.'}
              </p>
            </div>
            <Button variant="outline" className="w-full text-sm" onClick={loadAnomalyData} disabled={anomalyLoading}>
              {anomalyLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Refresh Anomaly Data
            </Button>
          </div>
        </div>
      </GlassPanel>

      {/* Section 5: Recently Resolved */}
      <div>
        <h3 className="font-medium text-sm text-[var(--color-text-secondary)] mb-3 pl-2">Recently Resolved</h3>
        <div className="space-y-2 opacity-60">
          {resolvedAlerts.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] italic pl-2">No recently resolved alerts.</p>
          ) : (
            resolvedAlerts.map((item) => {
              const resolvedTime = item.resolved_at
                ? new Date(item.resolved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const isToday = item.resolved_at
                ? new Date(item.resolved_at).toDateString() === new Date().toDateString()
                : new Date(item.created_at).toDateString() === new Date().toDateString();
              return (
                <div key={item.id} className="flex items-center justify-between p-3 glass-panel rounded-[var(--radius-sm)]">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[var(--color-text-muted)]" />
                    <span className="text-sm text-[var(--color-text-secondary)] line-through decoration-[var(--color-text-muted)]">{item.message || item.type}</span>
                  </div>
                  <span className="text-xs font-mono text-[var(--color-text-muted)]">{resolvedTime} • {isToday ? 'Today' : 'Earlier'}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}

'use client';
import { GlassPanel } from '@/components/ui/glass_panel';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, Filter, Search, CheckCircle2, 
  Clock, ArrowRight, Zap, Target, TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceDot } from 'recharts';

const energyData = [
  { day: 'Wed 07', value: 140 },
  { day: 'Thu 08', value: 145 },
  { day: 'Fri 09', value: 135 },
  { day: 'Sat 10', value: 90 },
  { day: 'Sun 11', value: 85 },
  { day: 'Mon 12', value: 142 },
  { day: 'Tue 13', value: 185, anomaly: true },
  { day: 'Wed 14', value: 140 },
];

export default function AlertsPage() {
  return (
    <div className="p-6 text-[var(--color-text-primary)] max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">Alerts & Anomalies</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Real-time warnings and system notifications</p>
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
        <Button variant="outline" className="border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] h-9 px-4">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Mark All Read
        </Button>
      </GlassPanel>

      {/* Section 2: Alert Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Alerts', value: '12', border: 'border-t-[var(--color-primary)]' },
          { title: 'High Severity', value: '3', border: 'border-t-[var(--color-warning)]' },
          { title: 'Medium Severity', value: '5', border: 'border-t-[var(--color-energy)]' },
          { title: 'Resolved Today', value: '7', border: 'border-t-[var(--color-success)]' }
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
            <span className="bg-[var(--color-warning-soft)] text-[var(--color-warning)] text-xs font-semibold px-2 py-0.5 rounded-full">3 unread</span>
          </div>
        </div>
        <div className="divide-y divide-[rgba(255,255,255,0.3)]">
          {[
            { 
              severity: 'HIGH', 
              color: 'var(--color-warning)', 
              bgColor: 'var(--color-warning-soft)', 
              icon: AlertTriangle,
              title: 'Demand spike predicted at 18:30',
              desc: 'Predicted grid demand will reach 196 kW, approaching the 200 kW threshold.',
              time: '18:15',
              source: 'AI Optimizer'
            },
            { 
              severity: 'HIGH', 
              color: 'var(--color-warning)', 
              bgColor: 'var(--color-warning-soft)', 
              icon: Target,
              title: 'Peak demand threshold exceeded',
              desc: 'Actual grid draw reached 212 kW at 18:42 during peak tariff period.',
              time: '18:42',
              source: 'Grid Monitor'
            },
            { 
              severity: 'MEDIUM', 
              color: 'var(--color-energy)', 
              bgColor: 'var(--color-energy-soft)', 
              icon: Clock,
              title: 'Dyeing Batch 03 delayed',
              desc: 'Running 25 minutes behind schedule. May overflow into peak tariff period.',
              time: '16:20',
              source: 'Production Sync'
            },
            { 
              severity: 'MEDIUM', 
              color: 'var(--color-energy)', 
              bgColor: 'var(--color-energy-soft)', 
              icon: Zap,
              title: 'Solar output lower than forecast',
              desc: 'Actual output 18% below forecast. Grid draw increased to compensate.',
              time: '14:00',
              source: 'Solar Monitor'
            }
          ].map((alert, i) => (
            <div key={i} className="p-5 flex gap-4 hover:bg-[rgba(255,255,255,0.4)] transition-colors" style={{ borderLeft: `3px solid ${alert.color}` }}>
              <div className="shrink-0 mt-1">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: alert.bgColor, color: alert.color }}>
                  <alert.icon className="w-4 h-4" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-[var(--color-text-primary)]">{alert.title}</h4>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider" style={{ backgroundColor: alert.bgColor, color: alert.color }}>
                    {alert.severity}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] mb-2">{alert.desc}</p>
                <div className="flex items-center gap-4 text-xs font-mono text-[var(--color-text-muted)]">
                  <span>{alert.time}</span>
                  <span>•</span>
                  <span>{alert.source}</span>
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-end justify-between gap-2">
                <span className="text-xs font-mono text-[var(--color-text-muted)]">Today</span>
                <div className="flex items-center gap-3">
                  <button className="text-xs font-medium text-[var(--color-primary)] hover:underline">View Schedule</button>
                  <button className="text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">Dismiss</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* Section 4: Anomaly Detection Panel */}
      <GlassPanel className="rounded-[var(--radius-lg)] p-6">
        <h3 className="font-semibold text-[var(--color-primary)] mb-6">Anomaly Detection</h3>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={energyData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorConsump" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.4)" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontFamily: 'monospace' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontFamily: 'monospace' }} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.5)' }} />
                <Area type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorConsump)" />
                <ReferenceDot x="Tue 13" y={185} r={6} fill="var(--color-warning)" stroke="var(--color-warning-soft)" strokeWidth={4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="lg:col-span-2 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[var(--color-warning-soft)] text-[var(--color-warning)] flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-lg text-[var(--color-warning)]">Unusual Consumption Detected</h4>
                <p className="text-xs font-mono text-[var(--color-text-muted)]">Tuesday, 12 Aug (18:00 - 22:00)</p>
              </div>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              Consumption was <span className="font-bold font-mono text-[var(--color-warning)]">+23%</span> above expected baseline for this production volume.
            </p>
            <div className="glass-card p-4 rounded-[var(--radius-md)] border border-dashed border-[var(--color-primary-soft)] mb-6">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider">AI Analysis</span>
                <span className="text-[10px] font-mono font-medium text-[var(--color-text-muted)]">Confidence: 89%</span>
              </div>
              <p className="text-sm text-[var(--color-text-primary)]">
                Dyeing machines were run simultaneously with air compressors during peak tariff without scheduling overlap check.
              </p>
            </div>
            <Button variant="outline" className="w-full text-sm">View Root Cause Details</Button>
          </div>
        </div>
      </GlassPanel>

      {/* Section 5: Recently Resolved */}
      <div>
        <h3 className="font-medium text-sm text-[var(--color-text-secondary)] mb-3 pl-2">Recently Resolved</h3>
        <div className="space-y-2 opacity-60">
          {[
            { title: 'Minor voltage fluctuation on Line A', time: '10:15', day: 'Today' },
            { title: 'Spinning Machine 2 offline', time: '14:30', day: 'Yesterday' }
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 glass-panel rounded-[var(--radius-sm)]">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-[var(--color-text-muted)]" />
                <span className="text-sm text-[var(--color-text-secondary)] line-through decoration-[var(--color-text-muted)]">{item.title}</span>
              </div>
              <span className="text-xs font-mono text-[var(--color-text-muted)]">{item.time} • {item.day}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

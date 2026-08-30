'use client';
import { GlassPanel } from '@/components/ui/glass_panel';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import { cn } from '@/lib/utils';

const demandData = [
  { time: '10:00', actual: 120 },
  { time: '11:00', actual: 135 },
  { time: '12:00', actual: 125 },
  { time: '13:00', actual: 140 },
  { time: '14:00', actual: 155 },
  { time: '15:00', actual: 142 },
];

const solarData = [
  { time: '06:00', actual: 0, forecast: 0 },
  { time: '08:00', actual: 15, forecast: 20 },
  { time: '10:00', actual: 45, forecast: 50 },
  { time: '12:00', actual: 75, forecast: 80 },
  { time: '14:00', actual: 71, forecast: 75 },
  { time: '16:00', actual: 30, forecast: 40 },
  { time: '18:00', actual: 0, forecast: 0 },
];

const machineStatus = [
  { id: 'M-01', name: 'Dyeing', status: 'Running', color: 'bg-[var(--color-success)]', power: '45 kW', since: '08:00', next: '14:30' },
  { id: 'M-02', name: 'Weaving', status: 'Running', color: 'bg-[var(--color-success)]', power: '32 kW', since: '09:00', next: '15:00' },
  { id: 'M-03', name: 'Finishing', status: 'Idle', color: 'bg-gray-400', power: '0 kW', since: '—', next: '16:00' },
  { id: 'M-04', name: 'Spinning', status: 'Running', color: 'bg-[var(--color-success)]', power: '28 kW', since: '10:00', next: '13:30' },
  { id: 'M-05', name: 'Packaging', status: 'Maintenance', color: 'bg-[var(--color-warning)]', power: '0 kW', since: '—', next: '—' },
  { id: 'M-06', name: 'Cutting', status: 'Running', color: 'bg-[var(--color-success)]', power: '18 kW', since: '11:00', next: '17:00' },
];

export default function LiveMonitoringPage() {
  return (
    <div className="p-6 text-[var(--color-text-primary)] max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-primary)]">Live Monitoring</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Real-time factory energy status</p>
      </div>

      {/* Section 1: Current Status Bar */}
      <GlassPanel className="flex flex-col md:flex-row items-center divide-y md:divide-y-0 md:divide-x divide-[rgba(255,255,255,0.4)] rounded-[var(--radius-lg)] p-4">
        <div className="flex-1 w-full p-4 flex flex-col justify-center">
          <div className="text-sm text-[var(--color-text-secondary)] mb-1">Grid Draw</div>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-3xl font-bold">142 kW</span>
            <div className="flex items-center gap-1.5 text-[var(--color-success)] text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-current"></span>
              Stable
            </div>
          </div>
        </div>
        <div className="flex-1 w-full p-4 flex flex-col justify-center">
          <div className="text-sm text-[var(--color-text-secondary)] mb-1">Solar Output</div>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-3xl font-bold">71 kW</span>
            <div className="flex items-center gap-1.5 text-[var(--color-success)] text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-current"></span>
              Optimal
            </div>
          </div>
        </div>
        <div className="flex-1 w-full p-4 flex flex-col justify-center">
          <div className="text-sm text-[var(--color-text-secondary)] mb-1">Tariff</div>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-[var(--color-success)]">Off-Peak</span>
            <div className="flex items-center gap-1.5 text-[var(--color-success)] text-xs font-medium font-mono">
              <span className="w-2 h-2 rounded-full bg-current"></span>
              Rs. 28.50/kWh
            </div>
          </div>
        </div>
        <div className="flex-1 w-full p-4 flex flex-col justify-center">
          <div className="text-sm text-[var(--color-text-secondary)] mb-1">Demand Risk</div>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-[var(--color-success)]">Low</span>
            <div className="flex items-center gap-1.5 text-[var(--color-text-muted)] text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-current"></span>
              Next peak: 18:00
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
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="text-[var(--color-text-muted)] border-b border-[rgba(255,255,255,0.2)]">
                  <th className="font-medium p-3">Machine</th>
                  <th className="font-medium p-3">Status</th>
                  <th className="font-medium p-3 text-right">Power</th>
                  <th className="font-medium p-3">Since</th>
                  <th className="font-medium p-3">Next Job</th>
                </tr>
              </thead>
              <tbody>
                {machineStatus.map((m, i) => (
                  <tr key={i} className="border-b border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.3)] transition-colors">
                    <td className="p-3 font-medium text-[var(--color-text-primary)] whitespace-nowrap">
                      <span className="font-mono text-xs text-[var(--color-text-muted)] mr-2">{m.id}</span>
                      {m.name}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", m.color)}></span>
                        <span className="text-xs">{m.status}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono text-xs font-medium">{m.power}</td>
                    <td className="p-3 font-mono text-xs text-[var(--color-text-secondary)]">{m.since}</td>
                    <td className="p-3 font-mono text-xs text-[var(--color-text-secondary)]">{m.next}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassPanel>

        {/* Right: Real-Time Demand */}
        <GlassPanel className="lg:col-span-2 rounded-[var(--radius-lg)] flex flex-col h-[400px]">
          <div className="p-5 border-b border-[rgba(255,255,255,0.4)] flex justify-between items-end">
            <div>
              <h3 className="font-semibold text-[var(--color-primary)] mb-1">Real-Time Demand</h3>
              <p className="text-xs text-[var(--color-text-muted)]">Last 6 hours</p>
            </div>
            <div className="text-right">
              <div className="font-mono text-2xl font-bold">142 kW</div>
            </div>
          </div>
          <div className="p-5 flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={demandData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-warning)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-warning)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.4)" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontFamily: 'monospace' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontFamily: 'monospace' }} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.5)' }} />
                <ReferenceLine y={200} stroke="var(--color-text-muted)" strokeDasharray="3 3" label={{ position: 'top', value: 'Threshold (200 kW)', fill: 'var(--color-text-muted)', fontSize: 10 }} />
                <Area type="monotone" dataKey="actual" stroke="var(--color-warning)" strokeWidth={2} fillOpacity={1} fill="url(#colorDemand)" />
              </AreaChart>
            </ResponsiveContainer>
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
              <span className="w-3 h-1 border-t-2 border-dashed border-[var(--color-success)] opacity-60 rounded-full"></span> Forecast
            </div>
          </div>
        </div>
        <div className="p-5 flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={solarData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.4)" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontFamily: 'monospace' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontFamily: 'monospace' }} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.5)' }} />
              <Area type="monotone" dataKey="forecast" stroke="var(--color-success)" strokeDasharray="4 4" strokeWidth={2} fill="none" opacity={0.6} />
              <Area type="monotone" dataKey="actual" stroke="var(--color-success)" strokeWidth={2} fillOpacity={1} fill="url(#colorSolar)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassPanel>

    </div>
  );
}

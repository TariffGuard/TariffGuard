'use client';
import { useState } from 'react';
import { GlassPanel } from '@/components/ui/glass_panel';
import { Button } from '@/components/ui/button';
import { 
  Plus, Edit2, Settings, Server, CheckCircle2, 
  Clock, AlertTriangle, Calendar as CalendarIcon, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts';

const machineData = [
  { id: 'M-01', name: 'Dyeing Machine', type: 'Dyeing', power: '45 kW', status: 'Running', shiftable: true, avail: '08:00—22:00' },
  { id: 'M-02', name: 'Weaving Machine', type: 'Weaving', power: '32 kW', status: 'Running', shiftable: true, avail: '08:00—22:00' },
  { id: 'M-03', name: 'Finishing Machine', type: 'Finishing', power: '28 kW', status: 'Idle', shiftable: true, avail: '08:00—22:00' },
  { id: 'M-04', name: 'Spinning Machine', type: 'Spinning', power: '28 kW', status: 'Running', shiftable: false, avail: '08:00—20:00' },
  { id: 'M-05', name: 'Packaging Machine', type: 'Packaging', power: '12 kW', status: 'Maintenance', shiftable: true, avail: '08:00—22:00' },
  { id: 'M-06', name: 'Cutting Machine', type: 'Cutting', power: '18 kW', status: 'Running', shiftable: true, avail: '08:00—22:00' },
  { id: 'M-07', name: 'Boiler', type: 'Heating', power: '55 kW', status: 'Running', shiftable: false, avail: '06:00—22:00' },
  { id: 'M-08', name: 'Compressor', type: 'Air', power: '22 kW', status: 'Idle', shiftable: true, avail: '08:00—20:00' },
];

const energyData = [
  { id: 'M-01', value: 850 },
  { id: 'M-02', value: 620 },
  { id: 'M-03', value: 410 },
  { id: 'M-04', value: 780 },
  { id: 'M-05', value: 150 },
  { id: 'M-06', value: 320 },
  { id: 'M-07', value: 1550 },
  { id: 'M-08', value: 480 },
];

export default function MachinesPage() {
  const [selectedMachine, setSelectedMachine] = useState(machineData[0]);

  return (
    <div className="p-6 text-[var(--color-text-primary)] max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">Machines</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Manage your factory equipment and power profiles</p>
        </div>
      </div>

      {/* Section 1: Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-[var(--radius-md)] border-t-4 border-t-[var(--color-success)]">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">Running Machines</p>
          </div>
          <p className="text-3xl font-bold font-mono">5</p>
        </div>
        <div className="glass-card p-5 rounded-[var(--radius-md)] border-t-4 border-t-gray-400">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">Idle Machines</p>
          </div>
          <p className="text-3xl font-bold font-mono">2</p>
        </div>
        <div className="glass-card p-5 rounded-[var(--radius-md)] border-t-4 border-t-[var(--color-warning)]">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">Maintenance</p>
          </div>
          <p className="text-3xl font-bold font-mono">1</p>
        </div>
      </div>

      {/* Section 2: Machine Detail Panel */}
      <GlassPanel className="p-6 rounded-[var(--radius-lg)] border-l-4 border-l-[var(--color-primary)]">
        <div className="flex items-center gap-2 mb-6">
          <Server className="w-5 h-5 text-[var(--color-primary)]" />
          <h3 className="font-semibold text-lg text-[var(--color-primary)]">Selected: {selectedMachine.id} ({selectedMachine.name})</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Column 1: Info */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-4 flex items-center gap-2 uppercase tracking-wider">
              <Info className="w-4 h-4" /> Machine Info
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.2)] pb-2">
                <span className="text-sm text-[var(--color-text-secondary)]">Type</span>
                <span className="text-sm font-medium">{selectedMachine.type}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.2)] pb-2">
                <span className="text-sm text-[var(--color-text-secondary)]">Power Rating</span>
                <span className="text-sm font-bold font-mono">{selectedMachine.power}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.2)] pb-2">
                <span className="text-sm text-[var(--color-text-secondary)]">Min Run Time</span>
                <span className="text-sm font-mono text-[var(--color-text-muted)]">2 hrs</span>
              </div>
              <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.2)] pb-2">
                <span className="text-sm text-[var(--color-text-secondary)]">Setup Time</span>
                <span className="text-sm font-mono text-[var(--color-text-muted)]">30 mins</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-sm text-[var(--color-text-secondary)]">Shiftable</span>
                {selectedMachine.shiftable ? (
                  <span className="bg-[var(--color-success-soft)] text-[var(--color-success)] text-xs font-semibold px-2 py-0.5 rounded-full">Yes</span>
                ) : (
                  <span className="bg-[rgba(150,150,150,0.2)] text-[var(--color-text-muted)] text-xs font-semibold px-2 py-0.5 rounded-full">No</span>
                )}
              </div>
            </div>
          </div>

          {/* Column 2: Availability */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-4 flex items-center gap-2 uppercase tracking-wider">
              <Clock className="w-4 h-4" /> Availability Window
            </h4>
            <p className="text-sm font-mono font-medium mb-4">{selectedMachine.avail}</p>
            
            <div className="h-6 w-full flex bg-[rgba(255,255,255,0.4)] rounded overflow-hidden">
              <div className="h-full bg-[rgba(150,150,150,0.2)]" style={{ flex: 8 }}></div>
              <div className="h-full bg-[var(--color-primary-soft)]" style={{ flex: 14 }}></div>
              <div className="h-full bg-[rgba(150,150,150,0.2)]" style={{ flex: 2 }}></div>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-[var(--color-text-muted)] mt-1">
              <span>00:00</span>
              <span>08:00</span>
              <span>22:00</span>
              <span>24:00</span>
            </div>
          </div>

          {/* Column 3: Maintenance */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-4 flex items-center gap-2 uppercase tracking-wider">
              <Settings className="w-4 h-4" /> Maintenance
            </h4>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-[var(--color-text-muted)] mb-1">Last Maintenance</p>
                <p className="text-sm font-mono">05 Aug 2026</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)] mb-1">Next Scheduled</p>
                <p className="text-sm font-mono text-[var(--color-text-primary)]">20 Aug 2026</p>
                <span className="inline-block mt-1 bg-[var(--color-success-soft)] text-[var(--color-success)] text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">On Schedule</span>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)] mb-1">Total Running Hours</p>
                <p className="text-sm font-mono font-bold">12,450</p>
              </div>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Section 3: Overview Table */}
      <GlassPanel className="rounded-[var(--radius-lg)] overflow-hidden">
        <div className="p-5 border-b border-[rgba(255,255,255,0.4)] flex justify-between items-center bg-[rgba(255,255,255,0.2)]">
          <h3 className="font-semibold text-[var(--color-primary)]">All Machines</h3>
          <Button className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] h-9 px-4 text-sm rounded-[var(--radius-sm)] border-none">
            <Plus className="w-4 h-4 mr-2" /> Add Machine
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-[rgba(255,255,255,0.3)]">
              <tr className="text-[var(--color-text-secondary)] border-b border-[rgba(255,255,255,0.4)]">
                <th className="font-medium p-3">Machine ID</th>
                <th className="font-medium p-3">Type</th>
                <th className="font-medium p-3 text-right">Power Rating</th>
                <th className="font-medium p-3">Status</th>
                <th className="font-medium p-3 text-center">Shiftable</th>
                <th className="font-medium p-3 text-center">Availability</th>
                <th className="font-medium p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {machineData.map((m, i) => (
                <tr 
                  key={m.id} 
                  className={cn(
                    "border-b border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.4)] cursor-pointer transition-colors",
                    selectedMachine.id === m.id && "bg-[rgba(255,255,255,0.6)]"
                  )}
                  onClick={() => setSelectedMachine(m)}
                >
                  <td className="p-3 font-mono font-bold text-[var(--color-primary)]">{m.id}</td>
                  <td className="p-3 font-medium text-[var(--color-text-primary)]">{m.name}</td>
                  <td className="p-3 text-right font-mono font-semibold">{m.power}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        m.status === 'Running' ? 'bg-[var(--color-success)]' : m.status === 'Maintenance' ? 'bg-[var(--color-warning)]' : 'bg-gray-400'
                      )}></span>
                      <span className="text-xs font-medium">{m.status}</span>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    {m.shiftable ? (
                      <span className="bg-[var(--color-success-soft)] text-[var(--color-success)] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Yes</span>
                    ) : (
                      <span className="bg-[rgba(150,150,150,0.2)] text-[var(--color-text-muted)] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">No</span>
                    )}
                  </td>
                  <td className="p-3 text-center font-mono text-xs text-[var(--color-text-secondary)]">{m.avail}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2 text-[var(--color-text-muted)]">
                      <button className="hover:text-[var(--color-primary)] p-1 transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button className="hover:text-[var(--color-primary)] p-1 transition-colors"><Settings className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      {/* Section 4: Energy Consumption Chart */}
      <GlassPanel className="p-6 rounded-[var(--radius-lg)] flex flex-col h-[400px]">
        <h3 className="font-semibold text-[var(--color-primary)] mb-6">Energy Consumption by Machine (Last 7 Days)</h3>
        <div className="flex-1 w-full min-h-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={energyData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.4)" />
              <XAxis dataKey="id" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontFamily: 'monospace', fontWeight: 'bold' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontFamily: 'monospace' }} />
              <RechartsTooltip 
                cursor={{ fill: 'rgba(255,255,255,0.2)' }}
                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.5)', fontFamily: 'monospace', fontSize: '12px' }}
                formatter={(value: any) => [`${value} kWh`, 'Consumption']}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                {energyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.id === 'M-07' ? 'var(--color-warning)' : 'var(--color-primary-soft)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 p-4 bg-[rgba(255,255,255,0.4)] rounded border border-[rgba(255,255,255,0.6)] flex gap-3">
          <AlertTriangle className="w-5 h-5 text-[var(--color-warning)] shrink-0" />
          <p className="text-sm text-[var(--color-text-primary)]">
            <span className="font-mono font-bold">M-07 Boiler</span> consumes the most energy (<span className="font-mono">1,550 kWh/week</span>). 
            Consider checking for heat loss or upgrading insulation. Potential savings: <span className="font-mono text-[var(--color-success)] font-bold">Rs. 12,000/month</span>.
          </p>
        </div>
      </GlassPanel>

    </div>
  );
}

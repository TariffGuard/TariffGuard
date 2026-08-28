'use client';
import { useState, useEffect } from 'react';
import { GlassPanel } from '@/components/ui/glass_panel';
import { Button } from '@/components/ui/button';
import { 
  Plus, Edit2, Settings, Server, CheckCircle2, 
  Clock, AlertTriangle, Calendar as CalendarIcon, Info, Loader2, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/context/auth_context';

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
  const { role } = useAuth();
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    machine_type: 'Dyeing',
    power_kw: 100,
    status: 'Running',
    priority: 2,
    shiftable: true,
    available_from: '08:00',
    available_to: '22:00'
  });

  const loadMachines = async () => {
    try {
      const data = await fetchApi('/api/machines/?factory_id=1');
      const mappedData = data.map((m: any) => ({
        id: `M-${String(m.id).padStart(2, '0')}`,
        dbId: m.id,
        name: m.name,
        type: m.machine_type,
        power: `${m.power_kw} kW`,
        status: m.status || 'Running',
        shiftable: m.shiftable,
        avail: `${m.available_from}—${m.available_to}`,
        minRunTime: `${m.min_run_minutes / 60} hrs`,
        setupTime: `${m.setup_minutes} mins`,
      }));
      setMachines(mappedData);
      if (mappedData.length > 0) {
        // preserve selection if possible
        setSelectedMachine((prev: any) => prev ? (mappedData.find((m: any) => m.dbId === prev.dbId) || mappedData[0]) : mappedData[0]);
      }
    } catch (error) {
      console.error('Failed to fetch machines:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMachines();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      await fetchApi('/api/machines/', {
        method: 'POST',
        body: JSON.stringify({
          factory_id: 1,
          name: formData.name,
          machine_type: formData.machine_type,
          power_kw: Number(formData.power_kw),
          priority: Number(formData.priority),
          shiftable: formData.shiftable,
          available_from: formData.available_from,
          available_to: formData.available_to,
        })
      });
      setMessage({ type: 'success', text: 'Machine added successfully.' });
      setIsAddModalOpen(false);
      setFormData({
        name: '', machine_type: 'Dyeing', power_kw: 100, status: 'Running', priority: 2, shiftable: true, available_from: '08:00', available_to: '22:00'
      });
      await loadMachines();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to add machine.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] flex-col gap-4 items-center justify-center text-[var(--color-text-secondary)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        <p>Loading machines...</p>
      </div>
    );
  }

  if (!machines.length || !selectedMachine) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-[var(--color-text-secondary)]">
        <p>No machines found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 text-[var(--color-text-primary)] max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">Machines</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Manage your factory equipment and power profiles</p>
        </div>
      </div>

      {message && (
        <div className={cn("p-3 rounded text-sm font-medium", message.type === 'success' ? "bg-[var(--color-success-soft)] text-[var(--color-success)]" : "bg-red-500/20 text-red-500")}>
          {message.text}
        </div>
      )}

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
                <span className="text-sm font-mono text-[var(--color-text-muted)]">{selectedMachine.minRunTime}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.2)] pb-2">
                <span className="text-sm text-[var(--color-text-secondary)]">Setup Time</span>
                <span className="text-sm font-mono text-[var(--color-text-muted)]">{selectedMachine.setupTime}</span>
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
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              disabled={role === 'supervisor' || role === 'Supervisor'}
              className={cn("bg-[var(--color-primary)] text-white h-9 px-4 text-sm rounded-[var(--radius-sm)] border-none transition-colors", 
                (role === 'supervisor' || role === 'Supervisor') ? "opacity-50 cursor-not-allowed hover:bg-[var(--color-primary)]" : "hover:bg-[var(--color-primary-hover)]"
              )}
              title={(role === 'supervisor' || role === 'Supervisor') ? "You don't have permission to add machines" : undefined}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Machine
            </Button>
          </div>
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
              {machines.map((m: any, i: number) => (
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

      {/* Add Machine Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <GlassPanel className="w-full max-w-xl p-6 rounded-[var(--radius-lg)] shadow-2xl border border-[rgba(255,255,255,0.5)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[var(--color-primary)] flex items-center gap-2">
                <Server className="w-5 h-5" /> Add New Machine
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-sm font-medium text-[var(--color-text-secondary)]">Machine Name</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm focus:outline-none focus:border-[var(--color-primary)]" 
                    required 
                    placeholder="e.g. Dyeing Unit 04"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--color-text-secondary)]">Machine Type</label>
                  <select 
                    value={formData.machine_type} 
                    onChange={e => setFormData({...formData, machine_type: e.target.value})}
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="Dyeing">Dyeing</option>
                    <option value="Weaving">Weaving</option>
                    <option value="Finishing">Finishing</option>
                    <option value="Spinning">Spinning</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Cutting">Cutting</option>
                    <option value="Boiler">Boiler</option>
                    <option value="Compressor">Compressor</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--color-text-secondary)]">Power Rating (kW)</label>
                  <input 
                    type="number" 
                    value={formData.power_kw} 
                    onChange={e => setFormData({...formData, power_kw: Number(e.target.value)})} 
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm font-mono focus:outline-none focus:border-[var(--color-primary)]" 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--color-text-secondary)]">Status</label>
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="Running">Running</option>
                    <option value="Idle">Idle</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--color-text-secondary)]">Priority</label>
                  <select 
                    value={formData.priority} 
                    onChange={e => setFormData({...formData, priority: Number(e.target.value)})}
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value={1}>High (1)</option>
                    <option value={2}>Medium (2)</option>
                    <option value={3}>Low (3)</option>
                  </select>
                </div>

                <div className="space-y-1.5 flex flex-col justify-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.shiftable} 
                      onChange={e => setFormData({...formData, shiftable: e.target.checked})} 
                      className="w-4 h-4 rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] accent-[var(--color-primary)]" 
                    />
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">Shiftable Load</span>
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--color-text-secondary)]">Available From</label>
                  <input 
                    type="time" 
                    value={formData.available_from} 
                    onChange={e => setFormData({...formData, available_from: e.target.value})} 
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm font-mono focus:outline-none focus:border-[var(--color-primary)]" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--color-text-secondary)]">Available To</label>
                  <input 
                    type="time" 
                    value={formData.available_to} 
                    onChange={e => setFormData({...formData, available_to: e.target.value})} 
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm font-mono focus:outline-none focus:border-[var(--color-primary)]" 
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-[rgba(255,255,255,0.2)]">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="bg-transparent border-[rgba(255,255,255,0.6)] text-[var(--color-text-primary)] hover:bg-[rgba(255,255,255,0.2)] px-6"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] px-6 rounded-[var(--radius-sm)] border-none"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {isSubmitting ? 'Saving...' : 'Add Machine'}
                </Button>
              </div>
            </form>
          </GlassPanel>
        </div>
      )}

    </div>
  );
}

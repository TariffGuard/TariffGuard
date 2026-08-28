'use client';
import { GlassPanel } from '@/components/ui/glass_panel';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Loader2, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/context/auth_context';

export default function TariffCalendarPage() {
  const { role } = useAuth();
  const currentHour = new Date().getHours() + new Date().getMinutes() / 60;
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    category: "Industrial TOU — A-1",
    period_name: "Peak",
    start_time: "18:00",
    end_time: "22:00",
    rate_pkr_per_kwh: 0,
    effective_from: "2026-08-01"
  });

  useEffect(() => {
    const loadTariffs = async () => {
      try {
        const data = await fetchApi('/api/tariffs');
        data.sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
        setTariffs(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load tariffs');
      } finally {
        setLoading(false);
      }
    };
    loadTariffs();
  }, []);

  const handleAdd = () => {
    setFormData({
      category: "Industrial TOU — A-1",
      period_name: "Peak",
      start_time: "18:00",
      end_time: "22:00",
      rate_pkr_per_kwh: 0,
      effective_from: "2026-08-01"
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleEdit = (t: any) => {
    setFormData({
      category: t.category,
      period_name: t.period_name,
      start_time: t.start_time,
      end_time: t.end_time,
      rate_pkr_per_kwh: t.rate_pkr_per_kwh,
      effective_from: t.effective_from || "2026-08-01"
    });
    setEditingId(t.id);
    setIsModalOpen(true);
  };

  const handleTariffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      const payload = {
        category: formData.category,
        period_name: formData.period_name,
        start_time: formData.start_time,
        end_time: formData.end_time,
        rate_pkr_per_kwh: Number(formData.rate_pkr_per_kwh),
        effective_from: formData.effective_from
      };

      if (editingId) {
        await fetchApi(`/api/tariffs/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setMessage({ type: 'success', text: 'Tariff updated successfully.' });
      } else {
        await fetchApi('/api/tariffs/', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setMessage({ type: 'success', text: 'Tariff added successfully.' });
      }
      setIsModalOpen(false);
      
      // Reload tariffs
      const data = await fetchApi('/api/tariffs');
      data.sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
      setTariffs(data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save tariff.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this tariff?')) return;
    try {
      await fetchApi(`/api/tariffs/${id}`, { method: 'DELETE' });
      setMessage({ type: 'success', text: 'Tariff deleted successfully.' });
      const data = await fetchApi('/api/tariffs');
      data.sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
      setTariffs(data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete tariff.' });
    }
  };

  const getHours = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h + m / 60;
  };
  const getDuration = (start: string, end: string) => {
    let hStart = getHours(start);
    let hEnd = getHours(end);
    if (hEnd === 0) hEnd = 24;
    return hEnd - hStart;
  };

  if (loading && tariffs.length === 0) {
    return (
      <div className="flex h-[50vh] flex-col gap-4 items-center justify-center text-[var(--color-text-secondary)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        <p>Loading tariff configuration...</p>
      </div>
    );
  }
  
  return (
    <div className="p-6 text-[var(--color-text-primary)] max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">Tariff Calendar</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Peak and off-peak periods — configurable</p>
        </div>
      </div>
      
      {message && (
        <div className={cn("p-3 rounded text-sm font-medium", message.type === 'success' ? "bg-[var(--color-success-soft)] text-[var(--color-success)]" : "bg-red-500/20 text-red-500")}>
          {message.text}
        </div>
      )}

      {/* Section 1: Today's Tariff Schedule */}
      <GlassPanel className="p-6 rounded-[var(--radius-lg)]">
        <h3 className="font-semibold text-[var(--color-primary)] mb-6">Today's Tariff Schedule</h3>
        
        <div className="relative w-full h-16 rounded-md overflow-hidden flex border border-[rgba(255,255,255,0.6)] bg-[rgba(255,255,255,0.3)] shadow-inner">
          {tariffs.map((t, idx) => {
            const isPeak = t.period_name.toLowerCase().includes('peak') && !t.period_name.toLowerCase().includes('off');
            return (
              <div 
                key={t.id || idx} 
                className={cn("h-full relative flex items-center justify-center border-r border-white/50", isPeak ? "bg-[rgba(228,123,82,0.15)]" : "")} 
                style={{ flex: getDuration(t.start_time, t.end_time) }}
              >
                <span className={cn("text-xs tracking-widest uppercase", isPeak ? "font-bold text-[var(--color-warning)]" : "font-semibold text-[var(--color-success)]")}>
                  {t.period_name}
                </span>
              </div>
            );
          })}
          
          {/* Current Time Indicator */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-primary)] z-10" 
            style={{ left: `${(currentHour / 24) * 100}%` }}
          >
            <div className="absolute -top-6 -translate-x-1/2 bg-[var(--color-primary)] text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow-sm">
              NOW
            </div>
          </div>
        </div>
        
        {/* Time Markers */}
        <div className="relative w-full mt-2 mb-6 h-4 text-[10px] font-mono text-[var(--color-text-muted)]">
          <span className="absolute left-0">00:00</span>
          <span className="absolute left-1/4 -translate-x-1/2">06:00</span>
          <span className="absolute left-1/2 -translate-x-1/2">12:00</span>
          <span className="absolute left-3/4 -translate-x-1/2">18:00</span>
          <span className="absolute right-0">24:00</span>
        </div>

        <div className="flex w-full mt-3 font-mono text-[11px]">
          {tariffs.map((t, idx) => {
             const isPeak = t.period_name.toLowerCase().includes('peak') && !t.period_name.toLowerCase().includes('off');
             return (
              <div key={t.id || idx} className={cn("text-center", isPeak ? "text-[var(--color-warning)] font-bold" : "text-[var(--color-success)] font-medium")} style={{ flex: getDuration(t.start_time, t.end_time) }}>
                Rs. {t.rate_pkr_per_kwh.toFixed(2)} <span className="text-[var(--color-text-muted)] text-[9px] font-sans">/kWh ({t.start_time} - {t.end_time === '00:00' ? '24:00' : t.end_time})</span>
              </div>
             );
          })}
        </div>
      </GlassPanel>

      {/* Section 2: Weekly Overview */}
      <GlassPanel className="p-6 rounded-[var(--radius-lg)]">
        <h3 className="font-semibold text-[var(--color-primary)] mb-6">Weekly Overview</h3>
        
        <div className="grid grid-cols-7 gap-4 h-48">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
            const isToday = i === new Date().getDay() - 1 || (new Date().getDay() === 0 && i === 6);
            return (
              <div 
                key={day} 
                onClick={() => alert(`Detailed view for ${day} coming soon.`)}
                className={cn(
                  "flex flex-col items-center h-full p-2 rounded-[var(--radius-md)] transition-all cursor-pointer group",
                  isToday ? "border-2 border-[var(--color-primary-soft)] bg-[rgba(255,255,255,0.4)] shadow-sm" : "border border-transparent hover:bg-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)]"
                )}
              >
                <div className="flex-1 w-full flex flex-col justify-end gap-1 mb-3 bg-[rgba(255,255,255,0.2)] rounded p-1">
                  {tariffs.map((t, idx) => {
                    const isPeak = t.period_name.toLowerCase().includes('peak') && !t.period_name.toLowerCase().includes('off');
                    return (
                      <div 
                        key={t.id || idx} 
                        className={cn("w-full rounded-sm", isPeak ? "bg-[rgba(228,123,82,0.3)]" : "bg-[rgba(255,255,255,0.8)]")} 
                        style={{ flex: getDuration(t.start_time, t.end_time) }}
                      ></div>
                    );
                  })}
                </div>
                <div className="text-xs font-semibold text-[var(--color-text-primary)]">{day}</div>
                <div className="font-mono text-[10px] text-[var(--color-text-muted)]">Oct {14 + i}</div>
              </div>
            );
          })}
        </div>
      </GlassPanel>

      {/* Section 3: Tariff Configuration */}
      <GlassPanel className="p-6 rounded-[var(--radius-lg)]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-semibold text-[var(--color-primary)]">Tariff Configuration</h3>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              disabled={role === 'supervisor' || role === 'Supervisor'}
              className={cn("border-[var(--color-primary)] text-[var(--color-primary)] h-9 px-4 transition-colors", 
                (role === 'supervisor' || role === 'Supervisor') ? "opacity-50 cursor-not-allowed hover:bg-transparent" : "hover:bg-[var(--color-primary-light)]"
              )}
              title={(role === 'supervisor' || role === 'Supervisor') ? "You don't have permission to add periods" : undefined}
              onClick={handleAdd}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Period
            </Button>
          </div>
        </div>
        
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[rgba(255,255,255,0.4)] mb-4">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-[rgba(255,255,255,0.4)]">
              <tr className="text-[var(--color-text-secondary)] border-b border-[rgba(255,255,255,0.4)]">
                <th className="font-medium p-3">Period Name</th>
                <th className="font-medium p-3 text-center">Start Time</th>
                <th className="font-medium p-3 text-center">End Time</th>
                <th className="font-medium p-3 text-right">Rate (Rs/kWh)</th>
                <th className="font-medium p-3 text-center">Active</th>
                <th className="font-medium p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tariffs.map((row, i) => {
                const isPeak = row.period_name.toLowerCase().includes('peak') && !row.period_name.toLowerCase().includes('off');
                const color = isPeak ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]';
                return (
                  <tr key={row.id || i} className="border-b border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.2)]">
                    <td className="p-3 font-medium text-[var(--color-text-primary)]">{row.period_name}</td>
                    <td className="p-3 text-center font-mono text-xs text-[var(--color-text-secondary)]">{row.start_time}</td>
                    <td className="p-3 text-center font-mono text-xs text-[var(--color-text-secondary)]">{row.end_time === '00:00' ? '24:00' : row.end_time}</td>
                    <td className="p-3 text-right font-mono font-medium"><span className={color}>{row.rate_pkr_per_kwh.toFixed(2)}</span></td>
                    <td className="p-3 text-center">
                      <div className="inline-flex items-center justify-center w-5 h-5 rounded bg-[var(--color-success-soft)] text-[var(--color-success)]">✓</div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          className={cn("transition-colors p-1", (role === 'supervisor' || role === 'Supervisor') ? "opacity-50 cursor-not-allowed text-[var(--color-text-muted)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-primary)]")}
                          disabled={role === 'supervisor' || role === 'Supervisor'}
                          title={(role === 'supervisor' || role === 'Supervisor') ? "You don't have permission to edit" : undefined}
                          onClick={() => handleEdit(row)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          className={cn("transition-colors p-1", (role === 'supervisor' || role === 'Supervisor') ? "opacity-50 cursor-not-allowed text-[var(--color-text-muted)]" : "text-[var(--color-text-muted)] hover:text-red-500")}
                          disabled={role === 'supervisor' || role === 'Supervisor'}
                          title={(role === 'supervisor' || role === 'Supervisor') ? "You don't have permission to delete" : undefined}
                          onClick={() => handleDelete(row.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <p className="text-[11px] text-[var(--color-text-muted)]">
          Rates configurable. Source: NEPRA 2026 notification. Last verified: 14 Aug 2026
        </p>
      </GlassPanel>
      
      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <GlassPanel className="w-full max-w-lg p-6 rounded-[var(--radius-lg)] shadow-2xl border border-[rgba(255,255,255,0.5)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[var(--color-primary)]">
                {editingId ? 'Edit Tariff Period' : 'Add Tariff Period'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleTariffSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-sm font-medium text-[var(--color-text-secondary)]">Category</label>
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="Industrial TOU — A-1">Industrial TOU — A-1</option>
                    <option value="Industrial TOU — A-2">Industrial TOU — A-2</option>
                    <option value="Commercial">Commercial</option>
                  </select>
                </div>
                
                <div className="space-y-1.5 col-span-2">
                  <label className="text-sm font-medium text-[var(--color-text-secondary)]">Period Name</label>
                  <input 
                    type="text" 
                    value={formData.period_name} 
                    onChange={e => setFormData({...formData, period_name: e.target.value})} 
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm focus:outline-none focus:border-[var(--color-primary)]" 
                    required 
                    placeholder="e.g. Peak, Off-Peak"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--color-text-secondary)]">Start Time</label>
                  <input 
                    type="time" 
                    value={formData.start_time} 
                    onChange={e => setFormData({...formData, start_time: e.target.value})} 
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm font-mono focus:outline-none focus:border-[var(--color-primary)]" 
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--color-text-secondary)]">End Time</label>
                  <input 
                    type="time" 
                    value={formData.end_time} 
                    onChange={e => setFormData({...formData, end_time: e.target.value})} 
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm font-mono focus:outline-none focus:border-[var(--color-primary)]" 
                    required 
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--color-text-secondary)]">Rate (Rs/kWh)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={formData.rate_pkr_per_kwh} 
                    onChange={e => setFormData({...formData, rate_pkr_per_kwh: Number(e.target.value)})} 
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm font-mono focus:outline-none focus:border-[var(--color-primary)]" 
                    required 
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--color-text-secondary)]">Effective From</label>
                  <input 
                    type="date" 
                    value={formData.effective_from} 
                    onChange={e => setFormData({...formData, effective_from: e.target.value})} 
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm focus:outline-none focus:border-[var(--color-primary)]" 
                    required 
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-[rgba(255,255,255,0.2)]">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
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
                  {isSubmitting ? 'Saving...' : 'Save Tariff'}
                </Button>
              </div>
            </form>
          </GlassPanel>
        </div>
      )}

    </div>
  );
}

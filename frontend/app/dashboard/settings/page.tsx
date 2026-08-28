'use client';
import { GlassPanel } from '@/components/ui/glass_panel';
import { Button } from '@/components/ui/button';
import { 
  Building2, Zap, Users, Settings as SettingsIcon, 
  Plus, Edit2, Trash2, Mail, ChevronDown, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    tariff_category: 'Industrial TOU — A-1',
    sanctioned_load_kw: 0,
    solar_capacity_kw: 0,
    operating_hours_start: '08:00',
    operating_hours_end: '22:00',
    working_days: [] as string[]
  });

  useEffect(() => {
    const loadFactory = async () => {
      try {
        const data = await fetchApi('/api/factories/1');
        const [start, end] = (data.operating_hours || '08:00-22:00').split('-');
        
        let wDays: string[] = [];
        if (data.working_days === 'Mon-Sat') wDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        else if (data.working_days) wDays = data.working_days.split(',');

        setFormData({
          name: data.name || '',
          location: data.location || '',
          tariff_category: data.tariff_category || 'Industrial TOU — A-1',
          sanctioned_load_kw: data.sanctioned_load_kw || 0,
          solar_capacity_kw: data.solar_capacity_kw || 0,
          operating_hours_start: start || '08:00',
          operating_hours_end: end || '22:00',
          working_days: wDays
        });
      } catch (err) {
        console.error(err);
        setMessage({ type: 'error', text: 'Failed to load factory details.' });
      } finally {
        setLoading(false);
      }
    };
    loadFactory();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        name: formData.name,
        location: formData.location,
        tariff_category: formData.tariff_category,
        sanctioned_load_kw: Number(formData.sanctioned_load_kw),
        solar_capacity_kw: Number(formData.solar_capacity_kw),
        operating_hours: `${formData.operating_hours_start}-${formData.operating_hours_end}`,
        working_days: formData.working_days.join(',')
      };
      await fetchApi('/api/factories/1', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      setMessage({ type: 'success', text: 'Factory settings saved successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] flex-col gap-4 items-center justify-center text-[var(--color-text-secondary)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="p-6 text-[var(--color-text-primary)] max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">Settings</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Manage factory profile, tariffs, team, and preferences</p>
        </div>
      </div>

      {/* Section 1: Factory Profile */}
      <GlassPanel className="p-6 rounded-[var(--radius-lg)] border-l-4 border-l-[var(--color-primary)]">
        <div className="flex items-center gap-2 mb-6">
          <Building2 className="w-5 h-5 text-[var(--color-primary)]" />
          <h3 className="font-semibold text-lg text-[var(--color-primary)]">Factory Profile</h3>
        </div>
        
        {message && (
          <div className={cn("mb-6 p-3 rounded text-sm font-medium", message.type === 'success' ? "bg-[var(--color-success-soft)] text-[var(--color-success)]" : "bg-red-500/20 text-red-500")}>
            {message.text}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">Factory Name</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">Location</label>
            <input 
              type="text" 
              value={formData.location}
              onChange={e => setFormData({...formData, location: e.target.value})}
              className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">Tariff Category</label>
            <div className="relative">
              <select 
                value={formData.tariff_category}
                onChange={e => setFormData({...formData, tariff_category: e.target.value})}
                className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm focus:outline-none focus:border-[var(--color-primary)] appearance-none pr-8">
                <option value="Industrial TOU — A-1">Industrial TOU — A-1</option>
                <option value="Industrial TOU — A-2">Industrial TOU — A-2</option>
                <option value="Commercial">Commercial</option>
                <option value="Industrial">Industrial</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">Sanctioned Load (kW)</label>
            <input 
              type="number" 
              value={formData.sanctioned_load_kw}
              onChange={e => setFormData({...formData, sanctioned_load_kw: Number(e.target.value)})}
              className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm font-mono focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">Solar Capacity (kW)</label>
            <input 
              type="number" 
              value={formData.solar_capacity_kw}
              onChange={e => setFormData({...formData, solar_capacity_kw: Number(e.target.value)})}
              className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm font-mono focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">Operating Hours</label>
            <div className="flex items-center gap-2">
              <input type="time" value={formData.operating_hours_start} onChange={e => setFormData({...formData, operating_hours_start: e.target.value})} className="flex-1 px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm font-mono focus:outline-none focus:border-[var(--color-primary)]" />
              <span className="text-[var(--color-text-muted)] text-sm">to</span>
              <input type="time" value={formData.operating_hours_end} onChange={e => setFormData({...formData, operating_hours_end: e.target.value})} className="flex-1 px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm font-mono focus:outline-none focus:border-[var(--color-primary)]" />
            </div>
          </div>
          <div className="md:col-span-2 space-y-2 mt-2">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">Working Days</label>
            <div className="flex flex-wrap gap-3">
              {DAYS.map((day) => (
                <label key={day} className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.working_days.includes(day)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({...formData, working_days: [...formData.working_days, day]});
                      } else {
                        setFormData({...formData, working_days: formData.working_days.filter(d => d !== day)});
                      }
                    }}
                    className="w-4 h-4 rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] accent-[var(--color-primary)]" 
                  />
                  <span className="text-sm">{day}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] px-6 rounded-[var(--radius-sm)] border-none"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </GlassPanel>

      {/* Section 2: Tariff Configuration */}
      <GlassPanel className="p-6 rounded-[var(--radius-lg)] border-l-4 border-l-[var(--color-success)]">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[var(--color-success)]" />
            <h3 className="font-semibold text-lg text-[var(--color-primary)]">Tariff Configuration</h3>
          </div>
          <Button 
            variant="outline" 
            onClick={() => alert('Add Period coming soon (Demo only - use Tariff Calendar page)')}
            title="Coming soon"
            className="border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] h-9 px-4 text-sm bg-transparent"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Period
          </Button>
        </div>
        
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[rgba(255,255,255,0.4)]">
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
              {[
                { name: 'Off-Peak', start: '00:00', end: '18:00', rate: '28.50', color: 'text-[var(--color-success)]' },
                { name: 'Peak', start: '18:00', end: '22:00', rate: '42.80', color: 'text-[var(--color-warning)]' },
                { name: 'Off-Peak', start: '22:00', end: '24:00', rate: '28.50', color: 'text-[var(--color-success)]' }
              ].map((row, i) => (
                <tr key={i} className="border-b border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.2)]">
                  <td className="p-3 font-medium text-[var(--color-text-primary)]">{row.name}</td>
                  <td className="p-3 text-center font-mono text-xs text-[var(--color-text-secondary)]">{row.start}</td>
                  <td className="p-3 text-center font-mono text-xs text-[var(--color-text-secondary)]">{row.end}</td>
                  <td className="p-3 text-right font-mono font-medium"><span className={row.color}>{row.rate}</span></td>
                  <td className="p-3 text-center">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] accent-[var(--color-primary)]" />
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2 text-[var(--color-text-muted)]">
                      <button className="hover:text-[var(--color-primary)] p-1 transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button className="hover:text-red-500 p-1 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      {/* Section 3: Team Members */}
      <GlassPanel className="p-6 rounded-[var(--radius-lg)] border-l-4 border-l-[var(--color-energy)]">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--color-energy)]" />
            <h3 className="font-semibold text-lg text-[var(--color-primary)]">Team Members</h3>
            <span className="bg-[var(--color-energy-soft)] text-[var(--color-energy)] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ml-2">Demo Only</span>
          </div>
          <Button 
            variant="outline" 
            onClick={() => alert('Invite Member coming soon (Demo only)')}
            title="Coming soon"
            className="border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] h-9 px-4 text-sm bg-transparent"
          >
            <Mail className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        </div>

        <div className="space-y-3">
          {[
            { name: 'Ahmed Malik', role: 'Production Manager', perm: 'Admin', init: 'AM', bg: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]' },
            { name: 'Sara Khan', role: 'Floor Supervisor', perm: 'Viewer', init: 'SK', bg: 'bg-[var(--color-success-soft)] text-[var(--color-success)]' },
            { name: 'Usman Ali', role: 'Energy Auditor', perm: 'Editor', init: 'UA', bg: 'bg-[var(--color-energy-soft)] text-[var(--color-energy)]' }
          ].map((user, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.4)] rounded-[var(--radius-md)]">
              <div className="flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm", user.bg)}>
                  {user.init}
                </div>
                <div>
                  <h4 className="font-semibold text-[var(--color-text-primary)]">{user.name}</h4>
                  <p className="text-xs text-[var(--color-text-secondary)]">{user.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <select defaultValue={user.perm} className="pl-3 pr-8 py-1.5 bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.6)] rounded text-xs font-medium focus:outline-none focus:border-[var(--color-primary)] appearance-none">
                    <option value="Admin">Admin</option>
                    <option value="Editor">Editor</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--color-text-muted)] pointer-events-none" />
                </div>
                <button className="text-[var(--color-text-muted)] hover:text-red-500 p-1 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* Section 4: Preferences */}
      <GlassPanel className="p-6 rounded-[var(--radius-lg)] border-l-4 border-l-gray-400">
        <div className="flex items-center gap-2 mb-6">
          <SettingsIcon className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-lg text-[var(--color-primary)]">Preferences</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-10">
          <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.2)] pb-4">
            <div>
              <p className="font-medium text-sm text-[var(--color-text-primary)]">Default View</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Page to load after login</p>
            </div>
            <select className="px-3 py-1.5 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded text-sm focus:outline-none focus:border-[var(--color-primary)]">
              <option>Schedule Optimizer</option>
              <option>Overview</option>
              <option>Live Monitoring</option>
            </select>
          </div>
          
          <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.2)] pb-4">
            <div>
              <p className="font-medium text-sm text-[var(--color-text-primary)]">Currency</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Used in all financial reports</p>
            </div>
            <select className="px-3 py-1.5 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded text-sm font-mono focus:outline-none focus:border-[var(--color-primary)]">
              <option>PKR</option>
              <option>USD</option>
            </select>
          </div>

          <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.2)] pb-4">
            <div>
              <p className="font-medium text-sm text-[var(--color-text-primary)]">Time Format</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">24-hour vs 12-hour AM/PM</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--color-primary-soft)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
              <span className="ml-3 text-sm font-medium text-[var(--color-text-primary)]">24-hour</span>
            </label>
          </div>

          <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.2)] pb-4">
            <div>
              <p className="font-medium text-sm text-[var(--color-text-primary)]">Language</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Dashboard interface language</p>
            </div>
            <select className="px-3 py-1.5 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded text-sm focus:outline-none focus:border-[var(--color-primary)]">
              <option>English</option>
              <option>Urdu</option>
            </select>
          </div>

          <div className="md:col-span-2 flex justify-between items-center">
            <div>
              <p className="font-medium text-sm text-[var(--color-text-primary)]">Notifications</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Receive high-severity alerts</p>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] accent-[var(--color-primary)]" />
                <span className="text-sm">Email</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] accent-[var(--color-primary)]" />
                <span className="text-sm">WhatsApp</span>
              </label>
            </div>
          </div>
        </div>
      </GlassPanel>

    </div>
  );
}

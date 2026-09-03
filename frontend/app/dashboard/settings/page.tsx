'use client';
import { GlassPanel } from '@/components/ui/glass_panel';
import { Button } from '@/components/ui/button';
import { 
  Building2, Zap, Users, Settings as SettingsIcon, 
  Plus, Edit2, Trash2, Mail, ChevronDown, Loader2, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { fetchApi, tariffApi } from '@/lib/api';
import { useAuth } from '@/context/auth_context';
import { TariffPeriod } from '@/types';
import Link from 'next/link';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function SettingsPage() {
  const { role, user } = useAuth();
  const isSupervisor = role === 'supervisor' || role === 'Supervisor';
  const isManager = role === 'manager' || role === 'Manager';
  const isOwner = role === 'owner' || role === 'Owner';

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

  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [tariffs, setTariffs] = useState<TariffPeriod[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteData, setInviteData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'viewer'
  });

  const loadData = async () => {
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

      if (!isSupervisor) {
        await loadUsers();
      }
      await loadTariffs();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to load factory details.' });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const usersData = await fetchApi('/api/users?factory_id=1');
      setTeamMembers(usersData);
    } catch (err) {
      console.error('Failed to load users', err);
    }
  };

  const loadTariffs = async () => {
    try {
      const data = await tariffApi.list();
      data.sort((a, b) => a.start_time.localeCompare(b.start_time));
      setTariffs(data);
    } catch (err) {
      console.error('Failed to load tariffs', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [role]);

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

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      await fetchApi('/api/users/invite', {
        method: 'POST',
        body: JSON.stringify({ ...inviteData, factory_id: 1 })
      });
      setIsInviteModalOpen(false);
      setInviteData({ username: '', email: '', password: '', role: 'viewer' });
      setMessage({ type: 'success', text: 'User invited successfully.' });
      loadUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to invite user.' });
    } finally {
      setInviting(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await fetchApi(`/api/users/${userId}`, { method: 'DELETE' });
      setMessage({ type: 'success', text: 'User deleted.' });
      loadUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete user.' });
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await fetchApi(`/api/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole })
      });
      setMessage({ type: 'success', text: 'User role updated.' });
      loadUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to change role.' });
      loadUsers(); // Reset UI
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
              disabled={isSupervisor}
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">Location</label>
            <input 
              type="text" 
              disabled={isSupervisor}
              value={formData.location}
              onChange={e => setFormData({...formData, location: e.target.value})}
              className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">Tariff Category</label>
            <div className="relative">
              <select 
                disabled={isSupervisor}
                value={formData.tariff_category}
                onChange={e => setFormData({...formData, tariff_category: e.target.value})}
                className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm focus:outline-none focus:border-[var(--color-primary)] appearance-none pr-8 disabled:opacity-50">
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
              disabled={isSupervisor}
              value={formData.sanctioned_load_kw}
              onChange={e => setFormData({...formData, sanctioned_load_kw: Number(e.target.value)})}
              className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm font-mono focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">Solar Capacity (kW)</label>
            <input 
              type="number" 
              disabled={isSupervisor}
              value={formData.solar_capacity_kw}
              onChange={e => setFormData({...formData, solar_capacity_kw: Number(e.target.value)})}
              className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm font-mono focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">Operating Hours</label>
            <div className="flex items-center gap-2">
              <input type="time" disabled={isSupervisor} value={formData.operating_hours_start} onChange={e => setFormData({...formData, operating_hours_start: e.target.value})} className="flex-1 px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm font-mono focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-50" />
              <span className="text-[var(--color-text-muted)] text-sm">to</span>
              <input type="time" disabled={isSupervisor} value={formData.operating_hours_end} onChange={e => setFormData({...formData, operating_hours_end: e.target.value})} className="flex-1 px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm font-mono focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-50" />
            </div>
          </div>
          <div className="md:col-span-2 space-y-2 mt-2">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">Working Days</label>
            <div className="flex flex-wrap gap-3">
              {DAYS.map((day) => (
                <label key={day} className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    disabled={isSupervisor}
                    checked={formData.working_days.includes(day)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({...formData, working_days: [...formData.working_days, day]});
                      } else {
                        setFormData({...formData, working_days: formData.working_days.filter(d => d !== day)});
                      }
                    }}
                    className="w-4 h-4 rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] accent-[var(--color-primary)] disabled:opacity-50" 
                  />
                  <span className={cn("text-sm", isSupervisor && "opacity-50")}>{day}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saving || isSupervisor}
            className={cn("text-white px-6 rounded-[var(--radius-sm)] border-none transition-colors",
              isSupervisor ? "bg-[var(--color-primary)] opacity-50 cursor-not-allowed hover:bg-[var(--color-primary)]" : "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]"
            )}
            title={isSupervisor ? "You don't have permission to save factory settings" : undefined}
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
          <Link href="/dashboard/tariff_calendar">
            <Button 
              variant="outline" 
              disabled={isSupervisor}
              className={cn("h-9 px-4 text-sm transition-colors",
                isSupervisor ? "opacity-50 cursor-not-allowed border-[var(--color-primary)] text-[var(--color-primary)] bg-transparent hover:bg-transparent" : "border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] bg-transparent"
              )}
              title={isSupervisor ? "You don't have permission to add periods" : "Manage tariffs in Tariff Calendar"}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Period
            </Button>
          </Link>
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
              {tariffs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-[var(--color-text-muted)] text-sm italic">
                    No tariff periods configured. Add one from the Tariff Calendar page.
                  </td>
                </tr>
              ) : tariffs.map((row) => {
                const isPeak = row.period_name.toLowerCase().includes('peak') && !row.period_name.toLowerCase().includes('off');
                const color = isPeak ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]';
                return (
                  <tr key={row.id} className="border-b border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.2)]">
                    <td className="p-3 font-medium text-[var(--color-text-primary)]">{row.period_name}</td>
                    <td className="p-3 text-center font-mono text-xs text-[var(--color-text-secondary)]">{row.start_time}</td>
                    <td className="p-3 text-center font-mono text-xs text-[var(--color-text-secondary)]">{row.end_time === '00:00' ? '24:00' : row.end_time}</td>
                    <td className="p-3 text-right font-mono font-medium"><span className={color}>{row.rate_pkr_per_kwh.toFixed(2)}</span></td>
                    <td className="p-3 text-center">
                      <input type="checkbox" disabled={isSupervisor} defaultChecked className="w-4 h-4 rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] accent-[var(--color-primary)] disabled:opacity-50" />
                    </td>
                    <td className="p-3 text-right">
                      {!isSupervisor && (
                        <div className="flex items-center justify-end gap-2 text-[var(--color-text-muted)]">
                          <Link href="/dashboard/tariff_calendar" className="hover:text-[var(--color-primary)] p-1 transition-colors"><Edit2 className="w-4 h-4" /></Link>
                          <Link href="/dashboard/tariff_calendar" className="hover:text-red-500 p-1 transition-colors"><Trash2 className="w-4 h-4" /></Link>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      {/* Section 3: Team Members */}
      {!isSupervisor && (
        <GlassPanel className="p-6 rounded-[var(--radius-lg)] border-l-4 border-l-[var(--color-energy)]">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[var(--color-energy)]" />
              <h3 className="font-semibold text-lg text-[var(--color-primary)]">Team Members</h3>
            </div>
            {isOwner && (
              <Button 
                variant="outline" 
                onClick={() => setIsInviteModalOpen(true)}
                className="border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] h-9 px-4 text-sm bg-transparent"
              >
                <Plus className="w-4 h-4 mr-2" />
                Invite Member
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {teamMembers.map((member, i) => {
              const bg = member.role.toLowerCase() === 'owner' ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]' : 
                         member.role.toLowerCase() === 'manager' ? 'bg-[var(--color-energy-soft)] text-[var(--color-energy)]' : 
                         'bg-[var(--color-success-soft)] text-[var(--color-success)]';
              const init = member.username.substring(0, 2).toUpperCase();
              
              return (
                <div key={member.id || i} className="flex items-center justify-between p-4 bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.4)] rounded-[var(--radius-md)]">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm", bg)}>
                      {init}
                    </div>
                    <div>
                      <h4 className="font-semibold text-[var(--color-text-primary)]">{member.username}</h4>
                      <p className="text-xs text-[var(--color-text-secondary)] capitalize">{member.role}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <select 
                        disabled={!isOwner}
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        className="pl-3 pr-8 py-1.5 bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.6)] rounded text-xs font-medium focus:outline-none focus:border-[var(--color-primary)] appearance-none disabled:opacity-50"
                      >
                        <option value="owner">Owner</option>
                        <option value="manager">Manager</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--color-text-muted)] pointer-events-none" />
                    </div>
                    {isOwner && (
                      <button 
                        onClick={() => handleDeleteUser(member.id)}
                        className="text-[var(--color-text-muted)] hover:text-red-500 p-1 transition-colors disabled:opacity-50"
                        disabled={member.id === user?.id}
                        title={member.id === user?.id ? "Cannot delete yourself" : "Delete User"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassPanel>
      )}

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

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <GlassPanel className="w-full max-w-md p-6 rounded-[var(--radius-lg)] shadow-2xl border border-[rgba(255,255,255,0.5)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[var(--color-primary)] flex items-center gap-2">
                <Mail className="w-5 h-5" /> Invite Member
              </h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--color-text-secondary)]">Username</label>
                <input 
                  type="text" 
                  value={inviteData.username} 
                  onChange={e => setInviteData({...inviteData, username: e.target.value})} 
                  className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm focus:outline-none focus:border-[var(--color-primary)]" 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--color-text-secondary)]">Email</label>
                <input 
                  type="email" 
                  value={inviteData.email} 
                  onChange={e => setInviteData({...inviteData, email: e.target.value})} 
                  className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm focus:outline-none focus:border-[var(--color-primary)]" 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--color-text-secondary)]">Password</label>
                <input 
                  type="password" 
                  value={inviteData.password} 
                  onChange={e => setInviteData({...inviteData, password: e.target.value})} 
                  className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm focus:outline-none focus:border-[var(--color-primary)]" 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--color-text-secondary)]">Role</label>
                <select 
                  value={inviteData.role} 
                  onChange={e => setInviteData({...inviteData, role: e.target.value})}
                  className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="owner">Owner</option>
                  <option value="manager">Manager</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-[rgba(255,255,255,0.2)]">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsInviteModalOpen(false)}
                  className="bg-transparent border-[rgba(255,255,255,0.6)] text-[var(--color-text-primary)] hover:bg-[rgba(255,255,255,0.2)] px-6"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={inviting}
                  className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] px-6 rounded-[var(--radius-sm)] border-none"
                >
                  {inviting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {inviting ? 'Sending...' : 'Send Invite'}
                </Button>
              </div>
            </form>
          </GlassPanel>
        </div>
      )}

    </div>
  );
}

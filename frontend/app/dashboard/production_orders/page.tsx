'use client';
import { useState, useEffect } from 'react';
import { GlassPanel } from '@/components/ui/glass_panel';
import { Button } from '@/components/ui/button';
import { 
  Plus, Loader2, X, Package, Calendar, Clock, AlertTriangle, 
  CheckCircle2, PlayCircle, PauseCircle, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { orderApi } from '@/lib/api';
import { useAuth } from '@/context/auth_context';
import { ProductionOrder } from '@/types';

const PROCESS_OPTIONS = ['Spinning', 'Weaving', 'Dyeing', 'Finishing', 'Packaging', 'Cutting'];

export default function ProductionOrdersPage() {
  const { role } = useAuth();
  const isSupervisor = role === 'supervisor' || role === 'Supervisor';
  
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    order_no: '',
    process: 'Spinning',
    quantity: 1000,
    duration_minutes: 240,
    earliest_start: '',
    deadline: '',
    priority: 2,
    machine_options: '' as string,
    locked: false,
  });

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await orderApi.list(1);
      // Sort by deadline ascending
      data.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
      setOrders(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load production orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      const machineOptions = formData.machine_options
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n) && n > 0);

      await orderApi.create({
        factory_id: 1,
        order_no: formData.order_no,
        process: formData.process,
        quantity: Number(formData.quantity),
        duration_minutes: Number(formData.duration_minutes),
        earliest_start: formData.earliest_start ? new Date(formData.earliest_start).toISOString() : null,
        deadline: new Date(formData.deadline).toISOString(),
        priority: Number(formData.priority),
        machine_options: machineOptions.length > 0 ? machineOptions : null,
        locked: formData.locked,
      });
      
      setMessage({ type: 'success', text: 'Production order created successfully.' });
      setIsModalOpen(false);
      setFormData({
        order_no: '',
        process: 'Spinning',
        quantity: 1000,
        duration_minutes: 240,
        earliest_start: '',
        deadline: '',
        priority: 2,
        machine_options: '',
        locked: false,
      });
      await loadOrders();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create order.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this order?')) return;
    try {
      await orderApi.delete(id);
      setMessage({ type: 'success', text: 'Order deleted.' });
      await loadOrders();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete order.' });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
      case 'in_progress':
        return <PlayCircle className="w-4 h-4 text-[var(--color-success)]" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />;
      case 'pending':
        return <PauseCircle className="w-4 h-4 text-[var(--color-energy)]" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
      case 'in_progress':
        return 'bg-[var(--color-success-soft)] text-[var(--color-success)]';
      case 'completed':
        return 'bg-[rgba(150,150,150,0.2)] text-[var(--color-text-muted)]';
      case 'pending':
        return 'bg-[var(--color-energy-soft)] text-[var(--color-energy)]';
      default:
        return 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]';
    }
  };

  const isOverdue = (deadline: string) => new Date(deadline) < new Date() && new Date(deadline).toDateString() !== new Date().toDateString();

  if (loading) {
    return (
      <div className="flex h-[50vh] flex-col gap-4 items-center justify-center text-[var(--color-text-secondary)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        <p>Loading production orders...</p>
      </div>
    );
  }

  return (
    <div className="p-6 text-[var(--color-text-primary)] max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">Production Orders</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Manage orders that feed into the AI schedule optimizer</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          disabled={isSupervisor}
          className={cn("bg-[var(--color-primary)] text-white h-9 px-4 text-sm rounded-[var(--radius-sm)] border-none transition-colors", 
            isSupervisor ? "opacity-50 cursor-not-allowed hover:bg-[var(--color-primary)]" : "hover:bg-[var(--color-primary-hover)]"
          )}
          title={isSupervisor ? "You don't have permission to add orders" : undefined}
        >
          <Plus className="w-4 h-4 mr-2" /> New Order
        </Button>
      </div>

      {message && (
        <div className={cn("p-3 rounded text-sm font-medium", message.type === 'success' ? "bg-[var(--color-success-soft)] text-[var(--color-success)]" : "bg-red-500/20 text-red-500")}>
          {message.text}
        </div>
      )}

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-[var(--radius-md)] text-sm">
          Error: {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Orders', value: orders.length, border: 'border-t-[var(--color-primary)]' },
          { title: 'Pending', value: orders.filter((o) => o.status.toLowerCase() === 'pending').length, border: 'border-t-[var(--color-energy)]' },
          { title: 'Running', value: orders.filter((o) => ['running', 'in_progress'].includes(o.status.toLowerCase())).length, border: 'border-t-[var(--color-success)]' },
          { title: 'Completed', value: orders.filter((o) => o.status.toLowerCase() === 'completed').length, border: 'border-t-gray-400' }
        ].map((card, i) => (
          <div key={i} className={cn("glass-card p-5 rounded-[var(--radius-md)] border-t-4", card.border)}>
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">{card.title}</p>
            <p className="text-3xl font-bold mt-1 font-mono">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Orders Table */}
      <GlassPanel className="rounded-[var(--radius-lg)] overflow-hidden">
        <div className="p-5 border-b border-[rgba(255,255,255,0.4)] bg-[rgba(255,255,255,0.2)]">
          <h3 className="font-semibold text-[var(--color-primary)]">All Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-[rgba(255,255,255,0.3)]">
              <tr className="text-[var(--color-text-secondary)] border-b border-[rgba(255,255,255,0.4)]">
                <th className="font-medium p-3">Order No</th>
                <th className="font-medium p-3">Process</th>
                <th className="font-medium p-3 text-right">Quantity</th>
                <th className="font-medium p-3 text-right">Duration</th>
                <th className="font-medium p-3">Deadline</th>
                <th className="font-medium p-3 text-center">Priority</th>
                <th className="font-medium p-3 text-center">Status</th>
                <th className="font-medium p-3 text-center">Locked</th>
                <th className="font-medium p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-[var(--color-text-muted)] text-sm italic">
                    No production orders found. Add an order to start optimizing.
                  </td>
                </tr>
              ) : orders.map((order) => (
                <tr key={order.id} className="border-b border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.4)] transition-colors">
                  <td className="p-3 font-mono font-bold text-[var(--color-primary)]">{order.order_no}</td>
                  <td className="p-3 font-medium text-[var(--color-text-primary)]">{order.process}</td>
                  <td className="p-3 text-right font-mono">{order.quantity.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono">{Math.round(order.duration_minutes / 60 * 10) / 10}h</td>
                  <td className={cn("p-3 font-mono text-xs", isOverdue(order.deadline) ? 'text-[var(--color-warning)] font-bold' : 'text-[var(--color-text-secondary)]')}>
                    {new Date(order.deadline).toLocaleDateString()}
                    {isOverdue(order.deadline) && ' (Overdue)'}
                  </td>
                  <td className="p-3 text-center">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                      order.priority === 1 ? "bg-[var(--color-warning-soft)] text-[var(--color-warning)]" :
                      order.priority === 2 ? "bg-[var(--color-energy-soft)] text-[var(--color-energy)]" :
                      "bg-[var(--color-success-soft)] text-[var(--color-success)]"
                    )}>
                      P{order.priority}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {getStatusIcon(order.status)}
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase", getStatusClass(order.status))}>
                        {order.status}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    {order.locked ? (
                      <span className="text-[10px] font-bold text-[var(--color-warning)] uppercase">Yes</span>
                    ) : (
                      <span className="text-[10px] text-[var(--color-text-muted)] uppercase">No</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button 
                      onClick={() => handleDelete(order.id)}
                      disabled={isSupervisor}
                      className={cn("p-1 transition-colors", isSupervisor ? "opacity-50 cursor-not-allowed text-[var(--color-text-muted)]" : "text-[var(--color-text-muted)] hover:text-red-500")}
                      title={isSupervisor ? "You don't have permission to delete orders" : "Delete order"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      {/* AI/ML Input Reference */}
      <GlassPanel className="p-6 rounded-[var(--radius-lg)] border-l-4 border-l-[var(--color-primary)]">
        <h3 className="font-semibold text-[var(--color-primary)] mb-4 flex items-center gap-2">
          <Package className="w-5 h-5" /> What the Optimizer Uses
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-[var(--color-text-secondary)]">
          <div>
            <p className="font-medium text-[var(--color-text-primary)] mb-2">Required Inputs</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Order number & process</li>
              <li>Quantity & duration</li>
              <li>Deadline</li>
              <li>Priority (1–3)</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-[var(--color-text-primary)] mb-2">Optional Constraints</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Earliest start time</li>
              <li>Allowed machine IDs</li>
              <li>Locked schedule flag</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-[var(--color-text-primary)] mb-2">Optimizer Output</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Assigned machine & start time</li>
              <li>Estimated cost & kWh</li>
              <li>Grid vs solar split</li>
              <li>Peak demand impact</li>
            </ul>
          </div>
        </div>
      </GlassPanel>

      {/* Create Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <GlassPanel className="w-full max-w-xl p-6 rounded-[var(--radius-lg)] shadow-2xl border border-[rgba(255,255,255,0.5)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[var(--color-primary)] flex items-center gap-2">
                <Package className="w-5 h-5" /> New Production Order
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--color-text-secondary)]">Order No</label>
                  <input 
                    type="text" 
                    value={formData.order_no} 
                    onChange={e => setFormData({...formData, order_no: e.target.value})} 
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm focus:outline-none focus:border-[var(--color-primary)]" 
                    required 
                    placeholder="e.g. ORD-1001"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--color-text-secondary)]">Process</label>
                  <select 
                    value={formData.process} 
                    onChange={e => setFormData({...formData, process: e.target.value})}
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    {PROCESS_OPTIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--color-text-secondary)]">Quantity</label>
                  <input 
                    type="number" 
                    value={formData.quantity} 
                    onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} 
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm font-mono focus:outline-none focus:border-[var(--color-primary)]" 
                    required 
                    min={1}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--color-text-secondary)]">Duration (minutes)</label>
                  <input 
                    type="number" 
                    value={formData.duration_minutes} 
                    onChange={e => setFormData({...formData, duration_minutes: Number(e.target.value)})} 
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm font-mono focus:outline-none focus:border-[var(--color-primary)]" 
                    required 
                    min={1}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--color-text-secondary)]">Earliest Start</label>
                  <input 
                    type="datetime-local" 
                    value={formData.earliest_start} 
                    onChange={e => setFormData({...formData, earliest_start: e.target.value})} 
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm font-mono focus:outline-none focus:border-[var(--color-primary)]" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--color-text-secondary)]">Deadline <span className="text-red-400">*</span></label>
                  <input 
                    type="datetime-local" 
                    value={formData.deadline} 
                    onChange={e => setFormData({...formData, deadline: e.target.value})} 
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm font-mono focus:outline-none focus:border-[var(--color-primary)]" 
                    required 
                  />
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

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--color-text-secondary)]">Allowed Machine IDs</label>
                  <input 
                    type="text" 
                    value={formData.machine_options} 
                    onChange={e => setFormData({...formData, machine_options: e.target.value})} 
                    className="w-full px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm font-mono focus:outline-none focus:border-[var(--color-primary)]" 
                    placeholder="e.g. 1, 3"
                  />
                </div>

                <div className="space-y-1.5 flex flex-col justify-end pb-2 col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.locked} 
                      onChange={e => setFormData({...formData, locked: e.target.checked})} 
                      className="w-4 h-4 rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] accent-[var(--color-primary)]" 
                    />
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">Lock this order in schedule</span>
                  </label>
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
                  {isSubmitting ? 'Saving...' : 'Create Order'}
                </Button>
              </div>
            </form>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}

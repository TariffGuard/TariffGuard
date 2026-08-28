'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth_context';
import { GlassPanel } from '@/components/ui/glass_panel';
import { Button } from '@/components/ui/button';
import { Zap, Building, ClipboardList, Gauge, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type Role = 'Owner' | 'Manager' | 'Supervisor';

export default function SignupPage() {
  const [selectedRole, setSelectedRole] = useState<Role>('Manager');
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { register } = useAuth();
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    setIsLoading(true);
    setError('');
    try {
      await register(username, email, password, selectedRole.toLowerCase());
      router.push(`/login?username=${encodeURIComponent(username)}`);
    } catch (err: any) {
      if (err.message?.includes('400') || err.message?.toLowerCase().includes('exists')) {
        setError("Username or email already exists");
      } else {
        setError(err.message || 'Failed to register');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-[var(--color-text-primary)]">
      
      {/* Header Branding */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--color-primary)] flex items-center justify-center text-white">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <span className="font-bold text-2xl text-[var(--color-primary)] tracking-tight">TariffGuard</span>
        </div>
        <p className="text-sm font-medium text-[var(--color-text-muted)]">AI-Powered Energy & Production Optimization</p>
        <p className="text-xs text-[var(--color-text-muted)]">For Pakistani Textile Factories</p>
      </div>

      {/* Main Glass Card */}
      <GlassPanel className="w-full p-8 rounded-[var(--radius-lg)] shadow-glass transition-all duration-300 max-w-[540px]">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-xl font-semibold mb-1">Create Account</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">Choose your role to get started</p>
            
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { id: 'Owner', icon: Building, title: 'Factory Owner', desc: 'View KPIs, savings & performance' },
                { id: 'Manager', icon: ClipboardList, title: 'Production Manager', desc: 'Run optimization & schedules' },
                { id: 'Supervisor', icon: Gauge, title: 'Floor Supervisor', desc: 'Update real-time job status' }
              ].map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id as Role)}
                  className={cn(
                    "flex flex-col p-3 rounded-[var(--radius-md)] text-left transition-all border text-sm",
                    selectedRole === role.id 
                      ? "bg-[var(--color-primary-light)] border-[var(--color-primary)] shadow-sm" 
                      : "bg-[rgba(255,255,255,0.4)] border-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.6)]"
                  )}
                >
                  <role.icon className={cn("w-5 h-5 mb-2", selectedRole === role.id ? "text-[var(--color-primary)]" : "text-[var(--color-text-secondary)]")} />
                  <span className={cn("font-semibold mb-1 leading-tight", selectedRole === role.id ? "text-[var(--color-primary)]" : "text-[var(--color-text-primary)]")}>{role.title}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)] leading-tight">{role.desc}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-100/50 border border-red-500/50 text-red-700 text-sm rounded-[var(--radius-sm)]">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-text-secondary)] mb-1.5">Username</label>
                  <input 
                    required 
                    type="text" 
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]" 
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-text-secondary)] mb-1.5">Factory Name</label>
                  <input type="text" className="w-full bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-text-secondary)] mb-1.5">Email</label>
                <input 
                  required 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]" 
                />
              </div>

              <div>
                <label className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-[var(--color-text-secondary)]">Phone Number <span className="text-normal normal-case font-medium text-[var(--color-text-muted)]">(optional)</span></span>
                  <span className="text-[10px] text-[var(--color-success)] font-medium">Used for WhatsApp Alerts</span>
                </label>
                <input type="tel" className="w-full font-mono bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-text-secondary)] mb-1.5">Password</label>
                  <input 
                    required 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="w-full font-mono bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]" 
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-text-secondary)] mb-1.5">Confirm</label>
                  <input 
                    required 
                    type="password" 
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="w-full font-mono bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]" 
                  />
                </div>
              </div>

              <Button type="submit" variant="primary" className="w-full h-11 text-sm mt-4 shadow-soft" disabled={isLoading}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <p className="text-center text-sm text-[var(--color-text-secondary)] mt-6">
              Already have an account? <Link href="/login" className="font-semibold text-[var(--color-primary)] hover:underline ml-1">Login</Link>
            </p>
          </div>
      </GlassPanel>
    </div>
  );
}

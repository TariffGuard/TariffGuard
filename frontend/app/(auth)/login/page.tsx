'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth_context';
import { GlassPanel } from '@/components/ui/glass_panel';
import { Button } from '@/components/ui/button';
import { Zap, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type Role = 'Owner' | 'Manager' | 'Supervisor';

function LoginContent() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, demoLogin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const usernameParam = searchParams.get('username');
    if (usernameParam) {
      setUsername(usernameParam);
      setSuccessMsg('Account created successfully. Please login.');
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await login(username, password);
      router.push('/dashboard');
    } catch (err: any) {
      if (err.message?.toLowerCase().includes('401') || err.message?.toLowerCase().includes('invalid')) {
        setError('Invalid username or password');
      } else {
        setError(err.message || 'Failed to login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemo = (roleOverride: Role) => {
    demoLogin(roleOverride);
    router.push('/dashboard');
  };

  return (
    <>
      <GlassPanel className="w-full p-8 rounded-[var(--radius-lg)] shadow-glass transition-all duration-300 max-w-[440px]">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-xl font-semibold mb-1">Welcome Back</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-8">Login to your workspace</p>
          
          <form onSubmit={handleLogin} className="space-y-5">
            {successMsg && (
              <div className="p-3 bg-green-100/50 border border-green-500/50 text-green-700 text-sm rounded-[var(--radius-sm)] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {successMsg}
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-100/50 border border-red-500/50 text-red-700 text-sm rounded-[var(--radius-sm)]">
                {error}
              </div>
            )}
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-text-secondary)] mb-2">Username</label>
              <input 
                type="text" 
                placeholder="Enter your username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] px-3 py-3 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
                required
              />
            </div>
            
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-text-secondary)] mb-2">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] px-3 py-3 text-sm font-mono focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-[rgba(255,255,255,0.6)] bg-[rgba(255,255,255,0.4)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer" />
                <span className="text-sm text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">Remember me</span>
              </label>
              <a href="#" className="text-sm font-medium text-[var(--color-primary)] hover:underline">Forgot password?</a>
            </div>

            <Button type="submit" variant="primary" className="w-full h-12 text-base mt-2 shadow-soft" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[rgba(255,255,255,0.5)]"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#f0edf4] px-2 text-[var(--color-text-muted)] font-medium tracking-wider">Or</span>
            </div>
          </div>

          <Button variant="outline" className="w-full h-11 bg-[rgba(255,255,255,0.4)] border-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.6)] shadow-sm">
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>

          <p className="text-center text-sm text-[var(--color-text-secondary)] mt-8">
            New to TariffGuard? <Link href="/signup" className="font-semibold text-[var(--color-primary)] hover:underline ml-1">Create an account</Link>
          </p>
        </div>
      </GlassPanel>

      {/* Demo Mode Card */}
      <GlassPanel className="w-full max-w-[440px] mt-6 p-5 rounded-[var(--radius-md)] border-[var(--color-primary-light)] text-center">
        <h4 className="text-sm font-semibold text-[var(--color-primary)] mb-1">Quick Access</h4>
        <p className="text-xs text-[var(--color-text-secondary)] mb-4">Explore TariffGuard with pre-loaded factory data.</p>
        <Button variant="outline" className="w-full h-11 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)]" onClick={() => handleDemo('Manager')}>
          Enter Demo Mode
        </Button>
      </GlassPanel>
    </>
  );
}

export default function LoginPage() {
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
      
      <Suspense fallback={<div className="text-sm text-[var(--color-text-secondary)]">Loading...</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { GlassPanel } from '@/components/ui/glass_panel';
import { ScheduleGantt, Job } from '@/components/charts/schedule_gantt';
import { mockMachines } from '@/lib/mock_data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchApi } from '@/lib/api';
import { ChevronDown, ArrowRight, Lock, Play, RotateCcw, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth_context';




export default function ScheduleOptimizerPage() {
  const { role } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [initialFetchedJobs, setInitialFetchedJobs] = useState<Job[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [isOptimized, setIsOptimized] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showBaseline, setShowBaseline] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterMachineId, setFilterMachineId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7days');

  useEffect(() => {
    const initData = async () => {
      try {
        const [machinesData, ordersData] = await Promise.all([
          fetchApi('/api/machines/?factory_id=1'),
          fetchApi('/api/orders/?factory_id=1')
        ]);
        
        const mappedMachines = machinesData.map((m: any) => ({
          id: Number(m.id),
          name: m.name,
          type: m.machine_type || m.type,
          power_kw: m.power_kw,
          status: m.status || 'running'
        }));
        setMachines(mappedMachines);

        setJobs([]);
        setInitialFetchedJobs([]);
      } catch (err) {
        console.error('Failed to init optimizer data:', err);
      }
    };
    initData();
  }, []);
  
  const [metrics, setMetrics] = useState({
    baselineCost: 15200,
    optimizedCost: 12450,
    savingsAmt: 2750,
    savingsPct: 18
  });

  const handleOptimize = async () => {
    setIsOptimizing(true);
    setError(null);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let startDate = new Date(today);
      let endDate = new Date(today);

      if (dateRange === 'today') {
        endDate.setDate(today.getDate() + 1);
      } else if (dateRange === '7days') {
        endDate.setDate(today.getDate() + 7);
      } else if (dateRange === '14days') {
        endDate.setDate(today.getDate() + 14);
      } else if (dateRange === 'month') {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      }
      
      const startIso = startDate.toISOString();
      const endIso = endDate.toISOString();
      
      const data = await fetchApi(`/api/optimize/compare/1?start_time=${encodeURIComponent(startIso)}&end_time=${encodeURIComponent(endIso)}`, { method: 'POST' });
      
      if (!data.schedule || data.schedule.length === 0) {
        setJobs([]);
        setMetrics({
          baselineCost: 0,
          optimizedCost: 0,
          savingsAmt: 0,
          savingsPct: 0
        });
        setIsOptimized(true);
        return;
      }

      const getEpochMins = (isoString: string) => {
        return new Date(isoString).getTime() / 60000;
      };

      const mappedJobs: Job[] = data.schedule.map((optJob: any) => {
        const baseJob = data.baseline.schedule.find((b: any) => b.order_id === optJob.order_id);
        
        const optimizedStartStr = optJob.start_time;
        const optimizedEndStr = optJob.end_time;
        const baselineStartStr = baseJob ? baseJob.start_time : optJob.start_time;
        const baselineEndStr = baseJob ? baseJob.end_time : optJob.end_time;

        const optStartMins = getEpochMins(optimizedStartStr);
        const optEndMins = getEpochMins(optimizedEndStr);
        const baseStartMins = getEpochMins(baselineStartStr);
        const baseEndMins = getEpochMins(baselineEndStr);

        const startHour = new Date(optimizedStartStr).getHours();
        let energyType: 'solar' | 'peak' | 'offpeak' | 'locked' = 'offpeak';
        if (optJob.locked) {
          energyType = 'locked';
        } else if (startHour >= 9 && startHour < 16) {
          energyType = 'solar';
        } else if (startHour >= 18 && startHour < 22) {
          energyType = 'peak';
        }

        return {
          id: optJob.order_no,
          machineId: Number(optJob.machine_id),
          name: optJob.order_no,
          baseline_start: baseStartMins,
          baseline_end: baseEndMins,
          optimized_start: optStartMins,
          optimized_end: optEndMins,
          locked: optJob.locked || false,
          energy_type: energyType as any
        };
      });

      setJobs(mappedJobs);
      setInitialFetchedJobs(mappedJobs);
      
      setMetrics({
        baselineCost: data.baseline.total_cost || 0,
        optimizedCost: data.optimized.total_cost || 0,
        savingsAmt: data.savings.amount || 0,
        savingsPct: data.savings.percentage || 0
      });
      setIsOptimized(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to optimize schedule');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleReset = () => {
    setIsOptimized(false);
    setShowBaseline(false);
    setJobs(initialFetchedJobs);
    setError(null);
  };

  const handleLockSelected = () => {
    if (!selectedJobId) return;
    setJobs(prev => prev.map(job => 
      job.id === selectedJobId 
        ? { ...job, locked: true, energy_type: 'locked' } 
        : job
    ));
  };

  const formatTime = (mins: number) => {
    const d = new Date(mins * 60000);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const h = d.getHours();
    const min = d.getMinutes();
    return `${m}/${day} ${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
  };

  const changedJobs = jobs.filter(j => j.baseline_start !== j.optimized_start);
  const displayJobs = changedJobs.length > 0 ? changedJobs : jobs;

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-500">
      {/* Header and Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            Schedule Optimizer
          </h2>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">AI-driven production schedule minimizing energy costs.</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <select 
            className="px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)] font-medium"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="7days">Next 7 days</option>
            <option value="14days">Next 14 days</option>
            <option value="month">This Month</option>
          </select>

          <select 
            className="px-3 py-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] text-sm focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-text-primary)] font-medium"
            value={filterMachineId}
            onChange={(e) => setFilterMachineId(e.target.value)}
          >
            <option value="all">All Machines</option>
            {machines.map(m => (
              <option key={m.id} value={m.id.toString()}>{m.name}</option>
            ))}
          </select>
          
          <div 
            className="flex items-center gap-2 px-3 py-2 border border-[rgba(255,255,255,0.6)] bg-[rgba(255,255,255,0.4)] rounded-[var(--radius-sm)] cursor-pointer"
            onClick={() => isOptimized && setShowBaseline(!showBaseline)}
            style={{ opacity: isOptimized ? 1 : 0.5 }}
          >
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">Show Baseline</span>
            <div className={cn("w-8 h-4 rounded-full relative transition-colors", showBaseline ? "bg-[var(--color-primary)]" : "bg-gray-300")}>
              <div className={cn("w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform", showBaseline ? "left-[18px]" : "left-0.5")} />
            </div>
          </div>

            <>
              <Button 
                variant="outline" 
                disabled={!selectedJobId || role === 'supervisor' || role === 'Supervisor'} 
                className={cn("gap-2 transition-colors", 
                  (!selectedJobId) ? "opacity-50 border-gray-300 text-gray-400" : 
                  (role === 'supervisor' || role === 'Supervisor') ? "opacity-50 cursor-not-allowed border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-transparent" : "border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)]"
                )}
                title={(role === 'supervisor' || role === 'Supervisor') ? "You don't have permission to lock jobs" : undefined}
                onClick={handleLockSelected}
              >
                <Lock className="w-4 h-4" /> Lock Selected
              </Button>
              
              <Button 
                variant="outline" 
                className={cn("gap-2 text-[var(--color-text-primary)] border-[var(--color-text-primary)] transition-colors",
                  (role === 'supervisor' || role === 'Supervisor') ? "opacity-50 cursor-not-allowed hover:bg-transparent" : "hover:bg-[rgba(255,255,255,0.1)]"
                )} 
                onClick={handleReset} 
                disabled={!isOptimized || role === 'supervisor' || role === 'Supervisor'}
                title={(role === 'supervisor' || role === 'Supervisor') ? "You don't have permission to reset" : undefined}
              >
                <RotateCcw className="w-4 h-4" /> Reset
              </Button>
              
              <Button 
                variant="primary" 
                className={cn("gap-2 shadow-md w-[170px] transition-colors",
                  (role === 'supervisor' || role === 'Supervisor') ? "opacity-50 cursor-not-allowed hover:bg-[var(--color-primary)]" : "hover:bg-[var(--color-primary-hover)]"
                )} 
                onClick={handleOptimize} 
                disabled={isOptimized || isOptimizing || role === 'supervisor' || role === 'Supervisor'}
                title={(role === 'supervisor' || role === 'Supervisor') ? "You don't have permission to optimize" : undefined}
              >
                {isOptimizing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Optimizing...</>
                ) : (
                  <><Play className="w-4 h-4 fill-current" /> Run Optimization</>
                )}
              </Button>
            </>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-[var(--radius-md)] text-sm">
          Error: {error}
        </div>
      )}

      {/* Main 70/30 Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Left Side: Gantt Chart */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <GlassPanel className="p-6 flex-1 overflow-auto rounded-[var(--radius-lg)]">
            {isOptimized && jobs.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-[var(--color-text-muted)] italic">No schedule data available. Please seed data or add orders.</p>
              </div>
            ) : (
              <ScheduleGantt 
                machines={filterMachineId === 'all' ? machines : machines.filter(m => m.id.toString() === filterMachineId)} 
                jobs={jobs} 
                isOptimized={isOptimized}
                showBaseline={showBaseline}
                selectedJobId={selectedJobId}
                onJobClick={setSelectedJobId}
              />
            )}
          </GlassPanel>
        </div>

        {/* Right Side: Stacked Cards */}
        <div className="lg:col-span-1 space-y-6 overflow-y-auto pr-2">
          
          {/* Optimization Summary */}
          <GlassPanel className="p-6 relative overflow-hidden rounded-[var(--radius-lg)]">
            <div className={cn("absolute top-0 left-0 right-0 h-1 transition-colors duration-500", isOptimized ? "bg-[var(--color-success)]" : "bg-gray-300")} />
            <h3 className="font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
              <CalculatorIcon /> Cost Impact
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--color-text-secondary)]">Baseline Cost</span>
                <span className={cn("font-mono text-sm", isOptimized ? "line-through text-[var(--color-text-muted)]" : "font-bold text-lg text-[var(--color-text-primary)]")}>
                  {metrics.baselineCost.toLocaleString()} PKR
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[var(--color-text-primary)]">Optimized Cost</span>
                <span className={cn("font-mono font-bold text-lg transition-colors duration-500", isOptimized ? "text-[var(--color-success)]" : "text-[var(--color-text-muted)]")}>
                  {isOptimized ? `${metrics.optimizedCost.toLocaleString()} PKR` : '—'}
                </span>
              </div>
              <div className="pt-3 border-t border-[rgba(255,255,255,0.4)] flex justify-between items-center">
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">Estimated Savings</span>
                <Badge variant={isOptimized ? 'success' : 'default'} className="font-mono font-bold px-2 py-1 text-sm border-0">
                  {isOptimized ? `+ ${metrics.savingsPct}% (${metrics.savingsAmt.toLocaleString()} PKR)` : '0% (0 PKR)'}
                </Badge>
              </div>
            </div>
          </GlassPanel>

          {/* Schedule Changes */}
          <GlassPanel className="p-6 rounded-[var(--radius-lg)] flex flex-col max-h-[300px]">
            <h3 className="font-semibold text-[var(--color-text-primary)] mb-4">Key Movements</h3>
            <div className="space-y-3 overflow-y-auto flex-1 pr-2">
              {!isOptimized ? (
                <p className="text-sm text-[var(--color-text-muted)] italic text-center mt-6">Run optimization to see proposed schedule changes.</p>
              ) : jobs.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)] italic text-center mt-6">No schedule data available. Please seed data or add orders.</p>
              ) : (
                displayJobs.map((job) => (
                  <div 
                    key={job.id} 
                    className={cn(
                      "bg-[rgba(255,255,255,0.3)] p-3 rounded-[var(--radius-sm)] border cursor-pointer transition-all",
                      selectedJobId === job.id ? "border-[var(--color-primary)] ring-1 ring-[var(--color-primary)] shadow-sm" : "border-[rgba(255,255,255,0.5)] hover:border-[var(--color-primary)]"
                    )}
                    onClick={() => setSelectedJobId(job.id)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-mono text-xs font-bold text-[var(--color-text-primary)]">{job.name}</span>
                      <span className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded", 
                        job.energy_type === 'solar' ? "bg-[var(--color-success-soft)] text-[var(--color-success)]" :
                        job.energy_type === 'peak' ? "bg-[var(--color-warning-soft)] text-[var(--color-warning)]" :
                        "bg-blue-100 text-blue-600"
                      )}>
                        {job.energy_type === 'solar' ? 'Use Solar' : job.energy_type === 'peak' ? 'Peak Warning' : 'Optimized by AI'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-text-secondary)]">
                      {job.baseline_start !== job.optimized_start && (
                        <>
                          <span className="line-through opacity-70">{formatTime(job.baseline_start)}</span>
                          <ArrowRight className="w-3 h-3 text-[var(--color-text-muted)]" />
                        </>
                      )}
                      <span className="font-bold text-[var(--color-primary)]">{formatTime(job.optimized_start)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassPanel>

          {/* AI Explanation */}
          <div className="p-5 border-2 border-dashed border-[var(--color-primary-soft)] rounded-[var(--radius-md)] bg-[rgba(128,102,179,0.05)] transition-opacity duration-500" style={{ opacity: isOptimized ? 1 : 0.4 }}>
            <h3 className="font-semibold text-[var(--color-primary)] mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> AI Insights
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              The optimizer shifted energy-intensive spinning tasks to the solar generation window (11:00 - 15:00), while moving non-critical weaving orders away from the 18:00-22:00 peak tariff period. 
              <br/><br/>
              Max demand is projected to stay below the <span className="font-mono font-bold">700kW</span> threshold.
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
}

function CalculatorIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2" />
      <line x1="8" x2="16" y1="6" y2="6" />
      <line x1="16" x2="16" y1="14" y2="18" />
      <path d="M16 10h.01" />
      <path d="M12 10h.01" />
      <path d="M8 10h.01" />
      <path d="M12 14h.01" />
      <path d="M8 14h.01" />
      <path d="M12 18h.01" />
      <path d="M8 18h.01" />
    </svg>
  );
}

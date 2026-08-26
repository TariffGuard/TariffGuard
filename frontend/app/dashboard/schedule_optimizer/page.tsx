'use client';
import { useState } from 'react';
import { GlassPanel } from '@/components/ui/glass_panel';
import { ScheduleGantt, Job } from '@/components/charts/schedule_gantt';
import { mockMachines } from '@/lib/mock_data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ArrowRight, Lock, Play, RotateCcw, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const initialJobs: Job[] = [
  { id: 'ORD-1002', machineId: 1, name: 'ORD-1002', baseline_start: 18, baseline_end: 22, optimized_start: 12, optimized_end: 16, locked: false, energy_type: 'energy' },
  { id: 'ORD-2005', machineId: 2, name: 'ORD-2005', baseline_start: 8, baseline_end: 11, optimized_start: 11, optimized_end: 14, locked: false, energy_type: 'solar' },
  { id: 'ORD-1044', machineId: 3, name: 'ORD-1044', baseline_start: 19.5, baseline_end: 22, optimized_start: 6, optimized_end: 8.5, locked: false, energy_type: 'energy' },
  { id: 'ORD-3001', machineId: 4, name: 'ORD-3001', baseline_start: 10, baseline_end: 12, optimized_start: 10, optimized_end: 12, locked: true, energy_type: 'locked' },
  { id: 'ORD-4002', machineId: 1, name: 'ORD-4002', baseline_start: 7, baseline_end: 10, optimized_start: 7, optimized_end: 10, locked: false, energy_type: 'solar' },
  { id: 'ORD-5001', machineId: 7, name: 'ORD-5001', baseline_start: 17, baseline_end: 20, optimized_start: 14, optimized_end: 17, locked: false, energy_type: 'energy' },
];

export default function ScheduleOptimizerPage() {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [isOptimized, setIsOptimized] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showBaseline, setShowBaseline] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const handleOptimize = () => {
    setIsOptimizing(true);
    // Simulate API delay
    setTimeout(() => {
      setIsOptimized(true);
      setIsOptimizing(false);
    }, 1000);
  };

  const handleReset = () => {
    setIsOptimized(false);
    setShowBaseline(false);
  };

  const handleLockSelected = () => {
    if (!selectedJobId) return;
    setJobs(prev => prev.map(job => 
      job.id === selectedJobId 
        ? { ...job, locked: true, energy_type: 'locked' } 
        : job
    ));
  };

  const formatTime = (t: number) => `${Math.floor(t).toString().padStart(2, '0')}:${(t % 1 === 0.5 ? '30' : '00')}`;

  const changedJobs = jobs.filter(j => j.baseline_start !== j.optimized_start);

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
          <Button variant="ghost" className="border border-[rgba(255,255,255,0.6)] gap-2 bg-[rgba(255,255,255,0.4)]">
            All Machines <ChevronDown className="w-4 h-4" />
          </Button>
          
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

          <Button 
            variant="outline" 
            disabled={!selectedJobId} 
            className={cn("gap-2 border-[var(--color-primary)] text-[var(--color-primary)]", !selectedJobId && "opacity-50 border-gray-300 text-gray-400")}
            onClick={handleLockSelected}
          >
            <Lock className="w-4 h-4" /> Lock Selected
          </Button>
          
          <Button variant="outline" className="gap-2 text-[var(--color-text-primary)] border-[var(--color-text-primary)]" onClick={handleReset} disabled={!isOptimized}>
            <RotateCcw className="w-4 h-4" /> Reset
          </Button>
          
          <Button variant="primary" className="gap-2 shadow-md w-[170px]" onClick={handleOptimize} disabled={isOptimized || isOptimizing}>
            {isOptimizing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Optimizing...</>
            ) : (
              <><Play className="w-4 h-4 fill-current" /> Run Optimization</>
            )}
          </Button>
        </div>
      </div>
      
      {/* Main 70/30 Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Left Side: Gantt Chart */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <GlassPanel className="p-6 flex-1 overflow-auto rounded-[var(--radius-lg)]">
            <ScheduleGantt 
              machines={mockMachines} 
              jobs={jobs} 
              isOptimized={isOptimized}
              showBaseline={showBaseline}
              selectedJobId={selectedJobId}
              onJobClick={setSelectedJobId}
            />
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
                  15,200 PKR
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[var(--color-text-primary)]">Optimized Cost</span>
                <span className={cn("font-mono font-bold text-lg transition-colors duration-500", isOptimized ? "text-[var(--color-success)]" : "text-[var(--color-text-muted)]")}>
                  {isOptimized ? '12,450 PKR' : '—'}
                </span>
              </div>
              <div className="pt-3 border-t border-[rgba(255,255,255,0.4)] flex justify-between items-center">
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">Estimated Savings</span>
                <Badge variant={isOptimized ? 'success' : 'default'} className="font-mono font-bold px-2 py-1 text-sm border-0">
                  {isOptimized ? '+ 18% (2,750 PKR)' : '0% (0 PKR)'}
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
              ) : (
                changedJobs.map((job) => (
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
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--color-success-soft)] text-[var(--color-success)]">
                        {job.energy_type === 'solar' ? 'Use Solar' : 'Avoid Peak'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-text-secondary)]">
                      <span className="line-through opacity-70">{formatTime(job.baseline_start)}</span>
                      <ArrowRight className="w-3 h-3 text-[var(--color-text-muted)]" />
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

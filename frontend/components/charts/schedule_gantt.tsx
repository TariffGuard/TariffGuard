'use client';
import { Machine } from '@/types';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export type Job = {
  id: string;
  machineId: number;
  name: string;
  baseline_start: number;
  baseline_end: number;
  optimized_start: number;
  optimized_end: number;
  locked: boolean;
  energy_type: 'energy' | 'solar' | 'locked';
};

interface ScheduleGanttProps {
  machines: Machine[];
  jobs: Job[];
  isOptimized: boolean;
  showBaseline: boolean;
  selectedJobId: string | null;
  onJobClick: (id: string) => void;
}

export function ScheduleGantt({ machines, jobs, isOptimized, showBaseline, selectedJobId, onJobClick }: ScheduleGanttProps) {
  const startHour = 6;
  const endHour = 22;
  const totalHours = endHour - startHour;
  
  const getPositionPercent = (hour: number) => Math.max(0, Math.min(100, ((hour - startHour) / totalHours) * 100));
  const getWidthPercent = (startH: number, endH: number) => getPositionPercent(endH) - getPositionPercent(startH);

  const solarStart = getPositionPercent(9);
  const solarWidth = getWidthPercent(9, 16);
  const peakStart = getPositionPercent(18);
  const peakWidth = getWidthPercent(18, 22);
  const currentHour = 14.5;
  const currentPos = getPositionPercent(currentHour);

  const [hoveredJob, setHoveredJob] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  return (
    <div className="w-full h-full overflow-x-auto relative">
      <div className="min-w-[800px] pb-10">
        {/* Timeline Header */}
        <div className="flex border-b border-[rgba(255,255,255,0.2)] pb-2 mb-4 relative sticky top-0 bg-[rgba(15,15,15,0.05)] z-20 backdrop-blur-md">
          <div className="w-40 shrink-0 font-medium text-sm text-[var(--color-text-secondary)]">Machine</div>
          <div className="flex-1 relative h-6">
            {[6, 8, 10, 12, 14, 16, 18, 20, 22].map((hour) => (
              <div 
                key={hour} 
                className="absolute font-mono text-xs text-[var(--color-text-muted)] transform -translate-x-1/2"
                style={{ left: `${getPositionPercent(hour)}%` }}
              >
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>
        </div>
        
        {/* Machine Rows */}
        <div className="space-y-4 relative">
          
          {/* Background Shadings */}
          <div className="absolute top-0 bottom-0 left-40 right-0 pointer-events-none z-0">
            <div 
              className="absolute top-0 bottom-0 bg-[var(--color-success-soft)] opacity-10 border-l border-r border-[var(--color-success)] border-dashed"
              style={{ left: `${solarStart}%`, width: `${solarWidth}%` }}
            >
              <div className="absolute top-2 left-2 text-[10px] font-bold text-[var(--color-success)] uppercase tracking-widest opacity-60">Solar Window</div>
            </div>
            
            <div 
              className="absolute top-0 bottom-0 bg-[var(--color-warning-soft)] opacity-10 border-l border-[var(--color-warning)] border-dashed"
              style={{ left: `${peakStart}%`, width: `${peakWidth}%` }}
            >
              <div className="absolute top-2 left-2 text-[10px] font-bold text-[var(--color-warning)] uppercase tracking-widest opacity-60">Peak Tariff</div>
            </div>

            <div 
              className="absolute top-0 bottom-0 w-px bg-[var(--color-primary)] z-10"
              style={{ left: `${currentPos}%` }}
            >
              <div className="absolute -top-3 -left-1.5 w-3 h-3 rounded-full bg-[var(--color-primary)] shadow-sm" />
            </div>
          </div>

          {machines.map((machine) => {
            const machineJobs = jobs.filter(j => j.machineId === machine.id);
            if (machineJobs.length === 0) return null;

            return (
              <div key={machine.id} className="flex items-center relative z-10">
                <div className="w-40 shrink-0 text-sm font-medium text-[var(--color-text-primary)] truncate pr-4">
                  {machine.name}
                  <p className="text-xs text-[var(--color-text-muted)] font-normal font-mono">{machine.type} • {machine.power_kw}kW</p>
                </div>
                
                <div className="flex-1 h-14 bg-[rgba(255,255,255,0.2)] rounded-[var(--radius-sm)] relative border border-[rgba(255,255,255,0.4)]">
                  {[6, 8, 10, 12, 14, 16, 18, 20, 22].map((hour) => (
                    <div 
                      key={hour} 
                      className="absolute top-0 bottom-0 w-px bg-[rgba(255,255,255,0.3)]"
                      style={{ left: `${getPositionPercent(hour)}%` }}
                    />
                  ))}

                  {machineJobs.map(job => {
                    const activeStart = isOptimized ? job.optimized_start : job.baseline_start;
                    const activeEnd = isOptimized ? job.optimized_end : job.baseline_end;
                    const left = getPositionPercent(activeStart);
                    const width = getWidthPercent(activeStart, activeEnd);
                    
                    const baseLeft = getPositionPercent(job.baseline_start);
                    const baseWidth = getWidthPercent(job.baseline_start, job.baseline_end);
                    
                    let bgColor, borderColor, textColor;
                    if (job.locked) {
                      bgColor = 'bg-[rgba(150,150,150,0.5)]';
                      borderColor = 'border-gray-500';
                      textColor = 'text-gray-800';
                    } else if (job.energy_type === 'energy') {
                      bgColor = 'bg-[var(--color-warning-soft)]';
                      borderColor = 'border-[var(--color-warning)]';
                      textColor = 'text-[var(--color-warning)]';
                    } else if (job.energy_type === 'solar') {
                      bgColor = 'bg-[var(--color-success-soft)]';
                      borderColor = 'border-[var(--color-success)]';
                      textColor = 'text-[var(--color-success)]';
                    } else {
                      bgColor = 'bg-[rgba(255,255,255,0.6)]';
                      borderColor = 'border-[var(--color-text-muted)]';
                      textColor = 'text-[var(--color-text-secondary)]';
                    }

                    const isSelected = selectedJobId === job.id;

                    return (
                      <div key={job.id}>
                        {/* Ghost Baseline */}
                        {isOptimized && showBaseline && (job.baseline_start !== job.optimized_start) && (
                          <div 
                            className="absolute top-2 bottom-2 rounded-[var(--radius-sm)] border-2 border-dashed border-gray-400 bg-transparent opacity-40 pointer-events-none transition-all duration-500"
                            style={{ left: `${baseLeft}%`, width: `${baseWidth}%` }}
                          />
                        )}
                        
                        {/* Actual Job Block */}
                        <div 
                          className={cn(
                            "absolute top-2 bottom-2 rounded-[var(--radius-sm)] border flex items-center justify-center cursor-pointer transition-all duration-500 overflow-hidden",
                            bgColor, borderColor,
                            isSelected ? "ring-2 ring-offset-2 ring-[var(--color-primary)] scale-[1.02] shadow-lg z-20 border-[var(--color-primary)]" : "hover:shadow-md z-10 hover:brightness-95"
                          )}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          onClick={() => onJobClick(job.id)}
                          onMouseEnter={(e) => {
                            setHoveredJob(job.id);
                            setTooltipPos({ x: e.clientX, y: e.clientY });
                          }}
                          onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                          onMouseLeave={() => setHoveredJob(null)}
                        >
                          <span className={cn("font-mono text-xs font-bold truncate px-1", textColor, isSelected && "text-[var(--color-primary)]")}>
                            {job.locked ? '🔒 ' : ''}{job.name}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredJob && (
        <div 
          className="fixed z-50 bg-[rgba(255,255,255,0.95)] backdrop-blur-md border border-[rgba(255,255,255,0.6)] shadow-xl p-3 rounded-[var(--radius-md)] pointer-events-none transform -translate-x-1/2 -translate-y-full mt-[-10px]"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          {(() => {
            const job = jobs.find(j => j.id === hoveredJob);
            if (!job) return null;
            const start = isOptimized ? job.optimized_start : job.baseline_start;
            const end = isOptimized ? job.optimized_end : job.baseline_end;
            const formatTime = (t: number) => `${Math.floor(t).toString().padStart(2, '0')}:${(t % 1 === 0.5 ? '30' : '00')}`;
            
            return (
              <div className="space-y-1">
                <p className="font-bold text-[var(--color-primary)] font-mono text-sm">{job.name}</p>
                <div className="flex gap-4 text-xs">
                  <div className="flex flex-col">
                    <span className="text-[var(--color-text-muted)]">Time</span>
                    <span className="font-mono text-[var(--color-text-primary)]">{formatTime(start)} - {formatTime(end)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[var(--color-text-muted)]">Status</span>
                    <span className={job.locked ? "text-gray-600 font-semibold" : "text-[var(--color-success)] font-semibold"}>
                      {job.locked ? 'Locked' : 'Optimized'}
                    </span>
                  </div>
                </div>
                {isOptimized && job.baseline_start !== job.optimized_start && (
                  <p className="text-[10px] text-[var(--color-text-muted)] pt-1 border-t border-gray-200 mt-1">
                    Moved from {formatTime(job.baseline_start)}-{formatTime(job.baseline_end)}
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

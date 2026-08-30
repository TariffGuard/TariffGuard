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
  energy_type: 'peak' | 'offpeak' | 'solar' | 'locked' | 'energy';
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
  let startMins = Infinity;
  let endMins = -Infinity;

  if (jobs.length > 0) {
    jobs.forEach(job => {
      const activeStart = isOptimized ? job.optimized_start : job.baseline_start;
      const activeEnd = isOptimized ? job.optimized_end : job.baseline_end;
      if (activeStart < startMins) startMins = activeStart;
      if (activeEnd > endMins) endMins = activeEnd;
      if (job.baseline_start < startMins) startMins = job.baseline_start;
      if (job.baseline_end > endMins) endMins = job.baseline_end;
    });
    startMins -= 60; // 1 hr padding
    endMins += 60;
  } else {
    const today = new Date();
    today.setHours(6, 0, 0, 0);
    startMins = today.getTime() / 60000;
    endMins = startMins + 16 * 60;
  }

  const totalMins = Math.max(60, endMins - startMins);
  
  const getPositionPercent = (mins: number) => Math.max(0, Math.min(100, ((mins - startMins) / totalMins) * 100));
  const getWidthPercent = (startM: number, endM: number) => getPositionPercent(endM) - getPositionPercent(startM);

  const currentMins = new Date().getTime() / 60000;
  const currentPos = getPositionPercent(currentMins);

  const labels: { mins: number, label: string }[] = [];
  const hoursStep = totalMins > 72 * 60 ? 24 : (totalMins > 24 * 60 ? 6 : 2);
  let current = Math.ceil(startMins / 60 / hoursStep) * hoursStep * 60;
  while (current <= endMins) {
    const d = new Date(current * 60000);
    let label = `${d.getHours().toString().padStart(2, '0')}:00`;
    if (hoursStep >= 24 || d.getHours() === 0) {
        label = `${d.getMonth()+1}/${d.getDate()} ` + (hoursStep < 24 ? label : '');
    }
    labels.push({ mins: current, label });
    current += hoursStep * 60;
  }

  // Generate daily tariff zones
  const daysCount = Math.ceil(totalMins / (24 * 60)) + 1;
  const firstDayStart = Math.floor(startMins / (24 * 60)) * 24 * 60 - new Date().getTimezoneOffset(); // Rough local midnight sync
  const dailyZones = [];
  for (let i = -1; i <= daysCount; i++) {
    const dayStartM = firstDayStart + i * 24 * 60;
    dailyZones.push({
      id: i,
      solarLeft: getPositionPercent(dayStartM + 9 * 60),
      solarWidth: getPositionPercent(dayStartM + 16 * 60) - getPositionPercent(dayStartM + 9 * 60),
      peakLeft: getPositionPercent(dayStartM + 18 * 60),
      peakWidth: getPositionPercent(dayStartM + 22 * 60) - getPositionPercent(dayStartM + 18 * 60),
    });
  }

  const [hoveredJob, setHoveredJob] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  return (
    <div className="w-full h-full overflow-x-auto relative">
      <div className="min-w-[800px] pb-10">
        {/* Timeline Header */}
        <div className="flex border-b border-[rgba(255,255,255,0.2)] pb-2 mb-4 relative sticky top-0 bg-[rgba(15,15,15,0.05)] z-20 backdrop-blur-md">
          <div className="w-40 shrink-0 font-medium text-sm text-[var(--color-text-secondary)]">Machine</div>
          <div className="flex-1 relative h-6">
            {labels.map((item) => (
              <div 
                key={item.mins} 
                className="absolute font-mono text-xs text-[var(--color-text-muted)] transform -translate-x-1/2 whitespace-nowrap"
                style={{ left: `${getPositionPercent(item.mins)}%` }}
              >
                {item.label}
              </div>
            ))}
          </div>
        </div>
        
        {/* Machine Rows */}
        <div className="space-y-4 relative">
          
          {/* Background Shadings */}
          <div className="absolute top-0 bottom-0 left-40 right-0 pointer-events-none z-0">
            {dailyZones.map(zone => (
              <div key={`zone-${zone.id}`}>
                {zone.solarWidth > 0 && (
                  <div 
                    className="absolute top-0 bottom-0 bg-[var(--color-success-soft)] opacity-10 border-l border-r border-[var(--color-success)] border-dashed"
                    style={{ left: `${zone.solarLeft}%`, width: `${zone.solarWidth}%` }}
                  >
                    {zone.solarWidth > 5 && (
                      <div className="absolute top-2 left-2 text-[10px] font-bold text-[var(--color-success)] uppercase tracking-widest opacity-60">Solar</div>
                    )}
                  </div>
                )}
                
                {zone.peakWidth > 0 && (
                  <div 
                    className="absolute top-0 bottom-0 bg-[var(--color-warning-soft)] opacity-10 border-l border-[var(--color-warning)] border-dashed"
                    style={{ left: `${zone.peakLeft}%`, width: `${zone.peakWidth}%` }}
                  >
                    {zone.peakWidth > 5 && (
                      <div className="absolute top-2 left-2 text-[10px] font-bold text-[var(--color-warning)] uppercase tracking-widest opacity-60">Peak</div>
                    )}
                  </div>
                )}
              </div>
            ))}

            <div 
              className="absolute top-0 bottom-0 w-px bg-[var(--color-primary)] z-10"
              style={{ left: `${currentPos}%`, display: currentPos > 0 && currentPos < 100 ? 'block' : 'none' }}
            >
              <div className="absolute -top-3 -left-1.5 w-3 h-3 rounded-full bg-[var(--color-primary)] shadow-sm" />
            </div>
          </div>

          {machines.map((machine) => {
            const machineJobs = jobs.filter(j => j.machineId === machine.id);

            return (
              <div key={machine.id} className="flex items-center relative z-10">
                <div className="w-40 shrink-0 text-sm font-medium text-[var(--color-text-primary)] truncate pr-4">
                  {machine.name}
                  <p className="text-xs text-[var(--color-text-muted)] font-normal font-mono">{machine.type} • {machine.power_kw}kW</p>
                </div>
                
                <div className="flex-1 h-[40px] bg-[rgba(255,255,255,0.2)] rounded-[var(--radius-sm)] relative border border-[rgba(255,255,255,0.4)] overflow-hidden">
                  {labels.map((item) => (
                    <div 
                      key={item.mins} 
                      className="absolute top-0 bottom-0 w-px bg-[rgba(255,255,255,0.3)]"
                      style={{ left: `${getPositionPercent(item.mins)}%` }}
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
                    } else if (job.energy_type === 'peak' || job.energy_type === 'energy') {
                      bgColor = 'bg-amber-500/20';
                      borderColor = 'border-amber-500';
                      textColor = 'text-amber-500';
                    } else if (job.energy_type === 'solar') {
                      bgColor = 'bg-green-500/20';
                      borderColor = 'border-green-500';
                      textColor = 'text-green-500';
                    } else {
                      bgColor = 'bg-gray-500/20';
                      borderColor = 'border-gray-400';
                      textColor = 'text-gray-400';
                    }

                    const isSelected = selectedJobId === job.id;

                    return (
                      <div key={job.id}>
                        {/* Ghost Baseline */}
                        {isOptimized && showBaseline && (job.baseline_start !== job.optimized_start) && baseWidth > 0 && (
                          <div 
                            className="absolute border-2 border-dashed border-gray-400 bg-transparent opacity-40 pointer-events-none transition-all duration-500"
                            style={{ left: `${baseLeft}%`, width: `${baseWidth}%`, top: '5px', height: '28px', borderRadius: '6px' }}
                          />
                        )}
                        
                        {/* Actual Job Block */}
                        {width > 0 && (
                          <div 
                            className={cn(
                              "absolute border flex items-center justify-center cursor-pointer transition-all duration-500 overflow-hidden",
                              bgColor, borderColor,
                              isSelected ? "ring-2 ring-offset-2 ring-[var(--color-primary)] scale-[1.02] shadow-lg z-20 border-[var(--color-primary)]" : "hover:shadow-md z-10 hover:brightness-95"
                            )}
                            style={{ left: `${left}%`, width: `${width}%`, top: '5px', height: '28px', borderRadius: '6px' }}
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
                        )}
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
            const formatTimeInfo = (t: number) => {
              const d = new Date(t * 60000);
              return `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
            };
            
            return (
              <div className="space-y-1 min-w-[200px]">
                <p className="font-bold text-[var(--color-primary)] font-mono text-sm">{job.name}</p>
                <div className="flex gap-4 text-xs">
                  <div className="flex flex-col">
                    <span className="text-[var(--color-text-muted)]">Time</span>
                    <span className="font-mono text-[var(--color-text-primary)]">{formatTimeInfo(start)} - {formatTimeInfo(end)}</span>
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
                    Moved from {formatTimeInfo(job.baseline_start)} - {formatTimeInfo(job.baseline_end)}
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

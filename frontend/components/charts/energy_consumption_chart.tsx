'use client';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { EnergyReading } from '@/types';

export function EnergyConsumptionChart({ data }: { data: EnergyReading[] }) {
  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorGrid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-energy)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="var(--color-energy)" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="var(--color-text-muted)" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            stroke="var(--color-text-muted)" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(value) => `${value}kW`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'var(--color-background-soft)', 
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-neutral)',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="grid_kw" 
            name="Grid Usage (kW)" 
            stroke="var(--color-energy)" 
            fillOpacity={1} 
            fill="url(#colorGrid)" 
          />
          <Area 
            type="monotone" 
            dataKey="solar_kw" 
            name="Solar Generation (kW)" 
            stroke="var(--color-success)" 
            fillOpacity={1} 
            fill="url(#colorSolar)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

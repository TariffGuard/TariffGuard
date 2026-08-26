'use client';
import { GlassPanel } from '@/components/ui/glass_panel';
import { Button } from '@/components/ui/button';
import { 
  Calendar as CalendarIcon, Download, FileText, ChevronDown 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';

const costData = [
  { name: 'Off-Peak Energy', value: 52, color: 'rgba(255,255,255,0.4)' },
  { name: 'Peak Energy', value: 31, color: 'var(--color-warning)' },
  { name: 'Solar Offset', value: 17, color: 'var(--color-success)' },
];

const savingsTrendData = [
  { date: '01 Aug', savings: 18000, cumulative: 18000 },
  { date: '02 Aug', savings: 22000, cumulative: 40000 },
  { date: '03 Aug', savings: 19500, cumulative: 59500 },
  { date: '04 Aug', savings: 24000, cumulative: 83500 },
  { date: '05 Aug', savings: 15000, cumulative: 98500 },
  { date: '06 Aug', savings: 21000, cumulative: 119500 },
  { date: '07 Aug', savings: 25000, cumulative: 144500 },
  { date: '08 Aug', savings: 19000, cumulative: 163500 },
  { date: '09 Aug', savings: 28000, cumulative: 191500 },
  { date: '10 Aug', savings: 12000, cumulative: 203500 },
  { date: '11 Aug', savings: 22500, cumulative: 226000 },
  { date: '12 Aug', savings: 31000, cumulative: 257000 },
  { date: '13 Aug', savings: 29000, cumulative: 286000 },
  { date: '14 Aug', savings: 26800, cumulative: 312800 },
];

export default function ReportsPage() {
  return (
    <div className="p-6 text-[var(--color-text-primary)] max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">Reports</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Daily and weekly energy savings summaries</p>
        </div>
      </div>

      {/* Section 1: Report Period Selector */}
      <GlassPanel className="p-4 rounded-[var(--radius-lg)] flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[rgba(255,255,255,0.4)] border border-[rgba(255,255,255,0.6)] rounded-[var(--radius-sm)] px-4 py-2 cursor-pointer hover:bg-[rgba(255,255,255,0.6)] transition-colors">
            <CalendarIcon className="w-4 h-4 text-[var(--color-text-muted)]" />
            <span className="text-sm font-medium">01 Aug 2026 — 14 Aug 2026</span>
            <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)] ml-2" />
          </div>
          <Button variant="primary" className="h-9 px-6 text-sm">Generate Report</Button>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] h-9 px-4 text-sm bg-transparent">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" className="border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] h-9 px-4 text-sm bg-transparent">
            <FileText className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </GlassPanel>

      {/* Section 2: Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-[var(--radius-md)] border-t-4 border-t-[var(--color-warning)]">
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">Total Energy Cost</p>
          <p className="text-2xl font-bold mt-1 font-mono">Rs. 1,842,500</p>
        </div>
        <div className="glass-card p-5 rounded-[var(--radius-md)] border-t-4 border-t-[var(--color-success)] relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[var(--color-success-soft)] to-transparent pointer-events-none opacity-50"></div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">Total Savings</p>
          <div className="flex items-end gap-2 mt-1">
            <p className="text-2xl font-bold font-mono text-[var(--color-success)]">Rs. 312,800</p>
            <span className="text-sm font-bold text-[var(--color-success)] bg-[var(--color-success-soft)] px-1.5 rounded mb-1">(16.9%)</span>
          </div>
        </div>
        <div className="glass-card p-5 rounded-[var(--radius-md)] border-t-4 border-t-[var(--color-warning)]">
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">Average Peak Demand</p>
          <p className="text-2xl font-bold mt-1 font-mono">178 kW</p>
        </div>
        <div className="glass-card p-5 rounded-[var(--radius-md)] border-t-4 border-t-[var(--color-success)]">
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">Average Solar Utilization</p>
          <p className="text-2xl font-bold mt-1 font-mono text-[var(--color-success)]">64%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 3: Cost Breakdown */}
        <GlassPanel className="p-6 rounded-[var(--radius-lg)] flex flex-col h-[400px]">
          <h3 className="font-semibold text-[var(--color-primary)] mb-6">Cost Breakdown</h3>
          <div className="flex-1 w-full min-h-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={costData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth={2}
                >
                  {costData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.5)', fontSize: '12px', fontFamily: 'monospace' }}
                  itemStyle={{ color: 'var(--color-text-primary)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pb-8 pointer-events-none">
              <span className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider font-semibold">Total</span>
              <span className="text-lg font-bold font-mono">100%</span>
            </div>
          </div>
          
          {/* Custom Legend */}
          <div className="mt-2 space-y-3">
            {costData.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border border-white/50" style={{ backgroundColor: item.color }}></span>
                  <span className="text-sm font-medium text-[var(--color-text-secondary)]">{item.name}</span>
                </div>
                <span className="font-mono font-semibold text-sm">
                  {item.name === 'Solar Offset' ? '-' : ''}{item.value}%
                </span>
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* Section 4: Savings Trend */}
        <GlassPanel className="p-6 rounded-[var(--radius-lg)] lg:col-span-2 flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-[var(--color-primary)]">Savings Trend</h3>
            <div className="flex gap-4 text-xs font-medium">
              <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                <span className="w-3 h-3 bg-[var(--color-success)] rounded-sm opacity-60"></span> Daily Savings (PKR)
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-1 bg-[var(--color-primary)] rounded-full"></span> Cumulative Savings
              </div>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={savingsTrendData} margin={{ top: 20, right: 0, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.4)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontFamily: 'monospace' }} dy={10} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontFamily: 'monospace' }} tickFormatter={(value) => `Rs.${value/1000}k`} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.5)', fontFamily: 'monospace', fontSize: '12px' }}
                  formatter={(value: any, name: any) => [`Rs. ${Number(value).toLocaleString()}`, name]}
                />
                <Bar yAxisId="left" dataKey="savings" name="Daily Savings" fill="var(--color-success)" radius={[4, 4, 0, 0]} fillOpacity={0.6} barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="cumulative" name="Cumulative Savings" stroke="var(--color-primary)" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: 'var(--color-primary)', stroke: 'white' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
      </div>

    </div>
  );
}

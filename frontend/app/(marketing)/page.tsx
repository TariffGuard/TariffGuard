import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass_panel';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, Play, TrendingUp, CloudSun, AlertTriangle, 
  Upload, Brain, MessageCircle, Calendar, Sun, 
  Gauge, GitCompare, Users, BarChart3, CheckCircle2
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen text-[var(--color-text-primary)] pb-12">
      
      {/* 1. Sticky Navbar */}
      <nav className="sticky top-0 z-50 px-6 py-4">
        <GlassPanel className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-primary)] flex items-center justify-center text-white">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <span className="font-bold text-xl text-[var(--color-primary)] tracking-tight">TariffGuard</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--color-text-secondary)]">
            <Link href="#features" className="hover:text-[var(--color-primary)] transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-[var(--color-primary)] transition-colors">How It Works</Link>
            <Link href="#pricing" className="hover:text-[var(--color-primary)] transition-colors">Pricing</Link>
            <Link href="#faq" className="hover:text-[var(--color-primary)] transition-colors">FAQ</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-[var(--color-primary)] hover:opacity-80 transition-opacity">
              Login
            </Link>
            <Link href="/signup" className="hidden sm:inline-flex"><Button variant="primary">Get Started</Button></Link>
          </div>
        </GlassPanel>
      </nav>

      {/* 2. Hero Section */}
      <section className="pt-24 pb-20 px-6 text-center max-w-4xl mx-auto flex flex-col items-center">
        <Badge className="mb-8 px-4 py-1.5 text-sm glass-card border-none text-[var(--color-primary)]">
          <Zap className="w-4 h-4 inline-block mr-2 text-[var(--color-energy)]" />
          Built for Pakistan's Textile Industry
        </Badge>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight mb-6">
          Cut Your Factory's Electricity Bill <br className="hidden md:block"/> Without Cutting Production
        </h1>
        <p className="text-lg text-[var(--color-text-secondary)] mb-10 max-w-2xl leading-relaxed">
          TariffGuard is an AI-powered energy optimization platform that tells your factory exactly when to run each machine to minimize electricity costs — considering tariffs, solar, weather, and peak demand.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
          <Link href="/signup"><Button variant="primary" className="h-12 px-8 text-base shadow-glass">Start Free Trial</Button></Link>
          <Button variant="outline" className="h-12 px-8 text-base bg-[rgba(255,255,255,0.4)] backdrop-blur-md border-white">
            <Play className="w-5 h-5 mr-2" /> Watch Demo
          </Button>
        </div>
        <p className="text-sm text-[var(--color-text-muted)] font-medium">
          No hardware required · Works with your existing meter · Setup in 10 minutes
        </p>
      </section>

      {/* Hero Visual Mockup */}
      <section className="px-6 mb-20">
        <div className="max-w-5xl mx-auto">
          <GlassPanel className="p-4 md:p-8 rounded-[var(--radius-xl)] shadow-glass border-white/[0.8]">
            <div className="aspect-[16/9] w-full bg-[rgba(255,255,255,0.5)] rounded-[var(--radius-lg)] border border-[rgba(255,255,255,0.4)] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(128,102,179,0.1)] to-transparent" />
              <div className="text-center p-8">
                <span className="text-[var(--color-primary-soft)] opacity-50 font-mono text-xl">DASHBOARD MOCKUP PREVIEW</span>
              </div>
            </div>
          </GlassPanel>
        </div>
      </section>

      {/* 3. Trust Bar */}
      <section className="border-y border-[rgba(255,255,255,0.4)] bg-[rgba(255,255,255,0.2)] backdrop-blur-sm py-12 px-6 mb-32">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-[13px] uppercase tracking-[0.2em] font-semibold text-[var(--color-text-secondary)] mb-8">
            Trusted by 25+ textile factories across Faisalabad, Lahore, and Karachi
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-[rgba(255,255,255,0.4)]">
            <div className="flex flex-col items-center pt-4 md:pt-0">
              <span className="font-mono text-4xl font-bold text-[var(--color-primary)] mb-2">Rs. 2.5M+</span>
              <span className="text-sm font-medium text-[var(--color-text-secondary)]">saved by customers</span>
            </div>
            <div className="flex flex-col items-center pt-8 md:pt-0">
              <span className="font-mono text-4xl font-bold text-[var(--color-success)] mb-2">30%</span>
              <span className="text-sm font-medium text-[var(--color-text-secondary)]">avg. reduction in peak-hour costs</span>
            </div>
            <div className="flex flex-col items-center pt-8 md:pt-0">
              <span className="font-mono text-4xl font-bold text-[var(--color-text-primary)] mb-2">100+</span>
              <span className="text-sm font-medium text-[var(--color-text-secondary)]">machines optimized</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Problem Section */}
      <section className="max-w-6xl mx-auto px-6 mb-32">
        <div className="text-center mb-16">
          <span className="text-[12px] uppercase tracking-[0.15em] font-bold text-[var(--color-primary)]">The Problem</span>
          <h2 className="text-3xl md:text-4xl font-semibold mt-4">Your Factory Is Losing Money Every Single Day</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <GlassPanel asCard className="p-8 hover:shadow-soft transition-shadow">
            <div className="w-12 h-12 rounded-full bg-[var(--color-warning-soft)] text-[var(--color-warning)] flex items-center justify-center mb-6">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold mb-4">Peak-Hour Penalties</h3>
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              Running machines from 6-10 PM costs 40-50% more per unit. Most factories don't even realize how much they're losing.
            </p>
          </GlassPanel>
          <GlassPanel asCard className="p-8 hover:shadow-soft transition-shadow">
            <div className="w-12 h-12 rounded-full bg-[var(--color-energy-soft)] text-[var(--color-energy)] flex items-center justify-center mb-6">
              <CloudSun className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold mb-4">Wasted Solar Energy</h3>
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              Your solar panels generate the most power at noon, but your machines are scheduled for evening shifts. That solar goes to waste.
            </p>
          </GlassPanel>
          <GlassPanel asCard className="p-8 hover:shadow-soft transition-shadow">
            <div className="w-12 h-12 rounded-full bg-[var(--color-warning-soft)] text-[var(--color-warning)] flex items-center justify-center mb-6">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold mb-4">Demand Spikes</h3>
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              When multiple machines start simultaneously, your peak demand crosses the threshold — triggering penalties and higher fixed charges.
            </p>
          </GlassPanel>
        </div>
      </section>

      {/* 5. Solution Section */}
      <section className="max-w-6xl mx-auto px-6 mb-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-[12px] uppercase tracking-[0.15em] font-bold text-[var(--color-success)]">The Solution</span>
            <h2 className="text-3xl md:text-4xl font-semibold mt-4 mb-8 leading-tight">
              TariffGuard Turns Your Production Plan Into an Energy-Aware Plan
            </h2>
            <div className="space-y-6">
              {[
                { title: 'AI-Powered Scheduling', desc: 'Our optimizer places flexible jobs into the most cost-effective time slots — automatically.' },
                { title: 'Solar-Aware Planning', desc: 'Schedule energy-intensive work when solar output is highest.' },
                { title: 'Peak Demand Management', desc: 'Avoid simultaneous machine starts that cause costly demand spikes.' },
                { title: 'WhatsApp Alerts', desc: 'Get step-by-step instructions in Urdu or English, sent directly to your foreman\'s WhatsApp.' },
                { title: 'No Hardware Needed', desc: 'Just connect your existing meter data. No IoT sensors, no expensive installation.' }
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="mt-1">
                    <CheckCircle2 className="w-5 h-5 text-[var(--color-success)]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg text-[var(--color-text-primary)] mb-1">{item.title}</h4>
                    <p className="text-[var(--color-text-secondary)]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <GlassPanel className="p-4 rounded-[var(--radius-xl)] shadow-glass border-white/[0.8]">
              <div className="aspect-[4/3] w-full bg-[rgba(255,255,255,0.4)] rounded-[var(--radius-lg)] border border-[rgba(255,255,255,0.4)] flex items-center justify-center">
                <span className="text-[var(--color-primary-soft)] opacity-50 font-mono text-sm">OPTIMIZER MOCKUP</span>
              </div>
            </GlassPanel>
          </div>
        </div>
      </section>

      {/* 6. How It Works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 mb-32">
        <div className="text-center mb-16">
          <span className="text-[12px] uppercase tracking-[0.15em] font-bold text-[var(--color-primary)]">How It Works</span>
          <h2 className="text-3xl md:text-4xl font-semibold mt-4">From Bill to Savings in 3 Simple Steps</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Upload, num: '01', title: 'Connect Your Factory', desc: 'Upload your factory profile, machine list, and tariff details. Or just snap a photo of your electricity bill — our AI reads it automatically.' },
            { icon: Brain, num: '02', title: 'AI Analyzes & Optimizes', desc: 'Our AI forecasts solar availability, predicts load, and generates the optimal machine schedule that minimizes cost while meeting deadlines.' },
            { icon: MessageCircle, num: '03', title: 'Get Actionable Instructions', desc: 'Receive a clear schedule on your dashboard and WhatsApp — in Urdu or English. Your foreman knows exactly what to run and when.' }
          ].map((step, i) => (
            <GlassPanel asCard key={i} className="p-8 relative overflow-hidden">
              <div className="absolute -top-4 -right-4 font-mono text-8xl font-bold opacity-5 text-[var(--color-primary)]">
                {step.num}
              </div>
              <div className="w-12 h-12 rounded-[var(--radius-sm)] bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center mb-6 relative z-10">
                <step.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-4 relative z-10">{step.title}</h3>
              <p className="text-[var(--color-text-secondary)] leading-relaxed relative z-10">{step.desc}</p>
            </GlassPanel>
          ))}
        </div>
      </section>

      {/* 7. Features Grid */}
      <section id="features" className="max-w-6xl mx-auto px-6 mb-32">
        <div className="text-center mb-16">
          <span className="text-[12px] uppercase tracking-[0.15em] font-bold text-[var(--color-primary)]">Features</span>
          <h2 className="text-3xl md:text-4xl font-semibold mt-4">Everything You Need to Stop Wasting Electricity</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { icon: Calendar, title: 'Multi-Tariff Support', desc: 'Handles peak/off-peak rates, fuel adjustments, and fixed charges — configurable for any DISCO.' },
            { icon: Sun, title: 'Solar Forecasting', desc: 'Predicts solar generation using weather forecasts and your PV capacity.' },
            { icon: Gauge, title: 'Demand Risk Alerts', desc: 'Warns you before predicted demand crosses your threshold.' },
            { icon: GitCompare, title: 'What-If Analysis', desc: 'Compare scenarios: What if I add more solar? What if I shift to night shifts?' },
            { icon: Users, title: 'Role-Based Access', desc: 'Owner sees savings. Manager creates schedules. Supervisor updates status.' },
            { icon: BarChart3, title: 'Reports & Analytics', desc: 'Daily, weekly, monthly savings reports. Export to CSV or PDF.' }
          ].map((feat, i) => (
            <GlassPanel asCard key={i} className="p-6 flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-[rgba(255,255,255,0.6)] border border-[rgba(255,255,255,0.8)] flex items-center justify-center text-[var(--color-primary)]">
                <feat.icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-2">{feat.title}</h4>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{feat.desc}</p>
              </div>
            </GlassPanel>
          ))}
        </div>
      </section>

      {/* 8. Pricing Section */}
      <section id="pricing" className="max-w-5xl mx-auto px-6 mb-32">
        <div className="text-center mb-16">
          <span className="text-[12px] uppercase tracking-[0.15em] font-bold text-[var(--color-primary)]">Pricing</span>
          <h2 className="text-3xl md:text-4xl font-semibold mt-4">Simple Pricing for Every Factory Size</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          
          <GlassPanel asCard className="p-8 flex flex-col h-full">
            <h3 className="text-xl font-semibold mb-2">Starter</h3>
            <div className="font-mono text-3xl font-bold text-[var(--color-text-primary)] mb-6">Rs. 15,000<span className="text-sm font-sans text-[var(--color-text-muted)] font-normal">/month</span></div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-center gap-3 text-[var(--color-text-secondary)] text-sm"><CheckCircle2 className="w-4 h-4 text-[var(--color-success)]"/> Up to 10 machines</li>
              <li className="flex items-center gap-3 text-[var(--color-text-secondary)] text-sm"><CheckCircle2 className="w-4 h-4 text-[var(--color-success)]"/> Basic scheduling</li>
              <li className="flex items-center gap-3 text-[var(--color-text-secondary)] text-sm"><CheckCircle2 className="w-4 h-4 text-[var(--color-success)]"/> Email alerts</li>
            </ul>
            <Button variant="outline" className="w-full">Start Free Trial</Button>
          </GlassPanel>

          <GlassPanel className="p-8 flex flex-col h-[105%] border-2 border-[var(--color-primary)] relative shadow-glass">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--color-primary)] text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
              Most Popular
            </div>
            <h3 className="text-xl font-semibold mb-2">Professional</h3>
            <div className="font-mono text-3xl font-bold text-[var(--color-primary)] mb-6">Rs. 35,000<span className="text-sm font-sans text-[var(--color-text-muted)] font-normal">/month</span></div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-center gap-3 text-[var(--color-text-secondary)] text-sm"><CheckCircle2 className="w-4 h-4 text-[var(--color-success)]"/> Up to 50 machines</li>
              <li className="flex items-center gap-3 text-[var(--color-text-secondary)] text-sm"><CheckCircle2 className="w-4 h-4 text-[var(--color-success)]"/> AI-powered optimization</li>
              <li className="flex items-center gap-3 text-[var(--color-text-secondary)] text-sm"><CheckCircle2 className="w-4 h-4 text-[var(--color-success)]"/> Solar forecasting</li>
              <li className="flex items-center gap-3 text-[var(--color-text-secondary)] text-sm"><CheckCircle2 className="w-4 h-4 text-[var(--color-success)]"/> WhatsApp alerts</li>
            </ul>
            <Button variant="primary" className="w-full">Start Free Trial</Button>
          </GlassPanel>

          <GlassPanel asCard className="p-8 flex flex-col h-full">
            <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
            <div className="font-mono text-3xl font-bold text-[var(--color-text-primary)] mb-6">Custom</div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-center gap-3 text-[var(--color-text-secondary)] text-sm"><CheckCircle2 className="w-4 h-4 text-[var(--color-success)]"/> Unlimited machines</li>
              <li className="flex items-center gap-3 text-[var(--color-text-secondary)] text-sm"><CheckCircle2 className="w-4 h-4 text-[var(--color-success)]"/> API access</li>
              <li className="flex items-center gap-3 text-[var(--color-text-secondary)] text-sm"><CheckCircle2 className="w-4 h-4 text-[var(--color-success)]"/> Custom integrations</li>
              <li className="flex items-center gap-3 text-[var(--color-text-secondary)] text-sm"><CheckCircle2 className="w-4 h-4 text-[var(--color-success)]"/> Dedicated account manager</li>
            </ul>
            <Button variant="outline" className="w-full">Contact Sales</Button>
          </GlassPanel>
          
        </div>
        <p className="text-center text-sm text-[var(--color-text-muted)] mt-8">All plans include a 14-day free trial. No credit card required.</p>
      </section>

      {/* 9. Testimonials */}
      <section className="max-w-6xl mx-auto px-6 mb-32">
        <div className="text-center mb-16">
          <span className="text-[12px] uppercase tracking-[0.15em] font-bold text-[var(--color-primary)]">Testimonials</span>
          <h2 className="text-3xl md:text-4xl font-semibold mt-4">Factory Owners Are Saving Real Money</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { quote: "We saved Rs. 87,000 in our first month just by shifting our dyeing operations to solar hours. The WhatsApp alerts make it easy for my foreman to follow.", author: "Muhammad Imran", role: "Owner, Imran Textile Mills, Faisalabad" },
            { quote: "I didn't realize we were paying 40% extra during peak hours. TariffGuard showed me exactly where the money was going and how to fix it.", author: "Sadia Khan", role: "Production Manager, Khan Weaving Co., Lahore" },
            { quote: "The demand spike alerts saved us from a Rs. 120,000 penalty. It's like having an energy consultant watching over us 24/7.", author: "Usman Tariq", role: "Director, Tariq Fabrics, Karachi" }
          ].map((t, i) => (
            <GlassPanel asCard key={i} className="p-8 flex flex-col justify-between">
              <p className="text-[var(--color-text-secondary)] leading-relaxed italic mb-8">"{t.quote}"</p>
              <div>
                <h5 className="font-semibold text-[var(--color-text-primary)]">{t.author}</h5>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">{t.role}</p>
              </div>
            </GlassPanel>
          ))}
        </div>
      </section>

      {/* 10. FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 mb-32">
        <div className="text-center mb-16">
          <span className="text-[12px] uppercase tracking-[0.15em] font-bold text-[var(--color-primary)]">FAQ</span>
          <h2 className="text-3xl md:text-4xl font-semibold mt-4">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-4">
          {[
            { q: "Do I need to install any hardware or smart meters?", a: "No. TariffGuard works with your existing electricity meter. You can upload meter readings as CSV, snap a photo of your bill, or connect your existing smart meter if you have one." },
            { q: "Which DISCOs does TariffGuard support?", a: "TariffGuard works with all Pakistani DISCOs — LESCO, FESCO, IESCO, KESC, and others. Our tariff engine is configurable, so rates and peak hours are always up-to-date." },
            { q: "Does this work with solar panels?", a: "Yes. TariffGuard integrates with your solar inverter data and weather forecasts to predict solar generation. It then schedules energy-intensive jobs during high-solar windows." },
            { q: "Can my foreman understand the schedule?", a: "Absolutely. Schedules are sent via WhatsApp in simple Urdu or English. Your foreman sees exactly which machine to run and when. No technical knowledge needed." },
            { q: "How much can I actually save?", a: "Most factories save 15-25% on their monthly electricity bills within the first month. The exact amount depends on your current schedule, tariff category, and solar setup." },
            { q: "Is my factory data secure?", a: "Yes. All data is encrypted and stored on Alibaba Cloud infrastructure. You control who has access to what, with role-based permissions." }
          ].map((faq, i) => (
            <GlassPanel asCard key={i} className="p-6">
              <details className="group">
                <summary className="font-semibold text-lg cursor-pointer list-none flex justify-between items-center">
                  {faq.q}
                  <span className="text-[var(--color-primary)] transition group-open:rotate-45">+</span>
                </summary>
                <p className="text-[var(--color-text-secondary)] mt-4 leading-relaxed">{faq.a}</p>
              </details>
            </GlassPanel>
          ))}
        </div>
      </section>

      {/* 11. Final CTA */}
      <section className="px-6 mb-32">
        <GlassPanel className="max-w-5xl mx-auto p-12 md:p-20 text-center rounded-[var(--radius-xl)] bg-gradient-to-br from-[rgba(255,255,255,0.6)] to-[rgba(255,255,255,0.2)] border-white shadow-glass">
          <h2 className="text-3xl md:text-5xl font-semibold mb-6">Stop Wasting Electricity. <br className="hidden md:block"/> Start Saving Today.</h2>
          <p className="text-lg text-[var(--color-text-secondary)] mb-10 max-w-2xl mx-auto">
            Join 25+ textile factories in Pakistan that are already saving money with TariffGuard.
          </p>
          <Link href="/signup"><Button variant="primary" className="h-14 px-10 text-lg shadow-glass mb-6">Start Your Free Trial</Button></Link>
          <p className="text-sm font-medium text-[var(--color-text-muted)]">
            No hardware required · Setup in 10 minutes · 14-day free trial
          </p>
        </GlassPanel>
      </section>

      {/* 12. Footer */}
      <footer className="border-t border-[rgba(255,255,255,0.4)] bg-[rgba(255,255,255,0.2)] backdrop-blur-sm pt-16 pb-8 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--color-primary)] flex items-center justify-center text-white">
                  <Zap className="w-4 h-4 fill-current" />
                </div>
                <span className="font-bold text-lg text-[var(--color-primary)] tracking-tight">TariffGuard</span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-6">Protect. Optimize. Save.</p>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.8)] flex items-center justify-center cursor-pointer hover:bg-[var(--color-primary-light)] transition-colors">in</div>
                <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.8)] flex items-center justify-center cursor-pointer hover:bg-[var(--color-primary-light)] transition-colors">tw</div>
                <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.8)] flex items-center justify-center cursor-pointer hover:bg-[var(--color-primary-light)] transition-colors">fb</div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-6">Product</h4>
              <ul className="space-y-3 text-sm text-[var(--color-text-secondary)]">
                <li><Link href="#features" className="hover:text-[var(--color-primary)]">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-[var(--color-primary)]">Pricing</Link></li>
                <li><Link href="#how-it-works" className="hover:text-[var(--color-primary)]">How It Works</Link></li>
                <li><Link href="#" className="hover:text-[var(--color-primary)]">Demo</Link></li>
                <li><Link href="#faq" className="hover:text-[var(--color-primary)]">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-6">Company</h4>
              <ul className="space-y-3 text-sm text-[var(--color-text-secondary)]">
                <li><Link href="#" className="hover:text-[var(--color-primary)]">About Us</Link></li>
                <li><Link href="#" className="hover:text-[var(--color-primary)]">Contact</Link></li>
                <li><Link href="#" className="hover:text-[var(--color-primary)]">Careers</Link></li>
                <li><Link href="#" className="hover:text-[var(--color-primary)]">Blog</Link></li>
                <li><Link href="#" className="hover:text-[var(--color-primary)]">Press</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-6">Contact</h4>
              <ul className="space-y-3 text-sm text-[var(--color-text-secondary)] mb-6">
                <li>hello@tariffguard.pk</li>
                <li className="font-mono">+92 300 1234567</li>
                <li>Faisalabad, Pakistan</li>
              </ul>
              <Badge className="bg-[var(--color-primary-light)] text-[var(--color-primary)] border-none px-3 py-1 text-xs">
                Bano Qabil AI Hackathon
              </Badge>
            </div>
          </div>
          <div className="border-t border-[rgba(255,255,255,0.4)] pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[var(--color-text-muted)]">
            <p>© 2026 TariffGuard. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="#" className="hover:text-[var(--color-text-primary)]">Privacy Policy</Link>
              <Link href="#" className="hover:text-[var(--color-text-primary)]">Terms of Service</Link>
              <Link href="#" className="hover:text-[var(--color-text-primary)]">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

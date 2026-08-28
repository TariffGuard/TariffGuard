'use client';
import { usePathname } from 'next/navigation';
import { StatusDot } from '../ui/status_dot';
import { Sun, CloudSun, Cloud, CloudRain, CloudLightning, Snowflake, CloudFog, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const getWeatherIcon = (code: number) => {
  if (code === 0) return Sun;
  if (code === 1 || code === 2) return CloudSun;
  if (code === 3) return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return CloudRain;
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return Snowflake;
  if (code >= 95) return CloudLightning;
  return Sun; // default
};

export function Topbar() {
  const pathname = usePathname();
  const [time, setTime] = useState<string>('');
  const [currentWeather, setCurrentWeather] = useState<{ temp: number; code: number } | null>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const [currentRes, forecastRes] = await Promise.all([
          fetch('https://api.open-meteo.com/v1/forecast?latitude=31.4181&longitude=73.0776&current_weather=true'),
          fetch('https://api.open-meteo.com/v1/forecast?latitude=31.4181&longitude=73.0776&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Asia/Karachi')
        ]);
        
        if (currentRes.ok) {
          const currentData = await currentRes.json();
          setCurrentWeather({
            temp: Math.round(currentData.current_weather.temperature),
            code: currentData.current_weather.weathercode
          });
        }

        if (forecastRes.ok) {
          const forecastData = await forecastRes.json();
          const daily = forecastData.daily;
          const mappedForecast = daily.time.map((dateStr: string, idx: number) => {
            const date = new Date(dateStr);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            return {
              day: dayName,
              min: Math.round(daily.temperature_2m_min[idx]),
              max: Math.round(daily.temperature_2m_max[idx]),
              code: daily.weathercode[idx]
            };
          });
          setForecast(mappedForecast);
        }
      } catch (err) {
        console.error('Failed to fetch weather:', err);
      }
    };
    fetchWeather();
  }, []);

  const getPageTitle = (path: string) => {
    if (path === '/') return 'Dashboard Overview';
    const segment = path.split('/')[1];
    if (!segment) return 'Dashboard';
    return segment.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const CurrentIcon = currentWeather ? getWeatherIcon(currentWeather.code) : Sun;
  const displayTemp = currentWeather ? `${currentWeather.temp}°C` : '—';

  return (
    <>
      <header className="h-[60px] glass-panel mt-4 mr-4 rounded-[var(--radius-lg)] flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center">
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">
            {getPageTitle(pathname)}
          </h2>
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:bg-[rgba(255,255,255,0.1)] p-1.5 rounded transition-colors cursor-pointer"
            title="View 7-Day Forecast"
          >
            <CurrentIcon className="w-4 h-4 text-[var(--color-energy)]" />
            <span className="font-mono text-sm font-medium">{displayTemp}</span>
          </button>
          
          <div className="h-4 w-px bg-[rgba(255,255,255,0.6)]" />
          
          <span className="font-mono text-sm font-medium text-[var(--color-text-primary)]">
            {time || '...'}
          </span>

          <div className="h-4 w-px bg-[rgba(255,255,255,0.6)]" />

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--color-text-primary)]">Faisalabad Plant</span>
            <StatusDot status="online" />
          </div>
        </div>
      </header>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setIsModalOpen(false)}>
          <div className="w-full max-w-sm glass-panel p-6 rounded-[var(--radius-lg)] shadow-2xl border border-[rgba(255,255,255,0.5)]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-[var(--color-primary)]">7-Day Forecast — Faisalabad</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              {forecast.length > 0 ? (
                forecast.map((day, idx) => {
                  const DayIcon = getWeatherIcon(day.code);
                  return (
                    <div key={idx} className="flex justify-between items-center p-3 bg-[rgba(255,255,255,0.3)] rounded-[var(--radius-sm)] border border-[rgba(255,255,255,0.2)]">
                      <span className="font-medium text-[var(--color-text-primary)] w-12">{idx === 0 ? 'Today' : day.day}</span>
                      <DayIcon className="w-5 h-5 text-[var(--color-energy)]" />
                      <div className="font-mono text-sm text-[var(--color-text-secondary)] font-medium">
                        {day.min}° / <span className="text-[var(--color-text-primary)] font-bold">{day.max}°</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-sm text-[var(--color-text-muted)] py-4">Loading forecast...</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

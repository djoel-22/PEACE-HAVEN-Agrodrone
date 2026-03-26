import React, { useState } from 'react';
import { Thermometer, Wind, Droplets, CloudSun, AlertTriangle, CheckCircle2, RefreshCw, MapPin } from 'lucide-react';
import { useWeather, useAllCitiesWeather } from '../../hooks/useApi';
import { cn } from '../../lib/utils';

const TN_CITIES = ['Chennai','Coimbatore','Salem','Madurai','Erode','Trichy','Tirunelveli','Vellore','Thanjavur','Tirupur'];

export const AdminWeatherMonitorPage = () => {
  const [selectedCity, setSelectedCity] = useState('Chennai');
  const { data: weather, loading, refetch } = useWeather(selectedCity);
  const { data: allCities, loading: allLoading } = useAllCitiesWeather();

  const isSafe = weather.suitable_for_spraying && weather.windSpeed < 15;
  const isModerate = weather.suitable_for_spraying && weather.windSpeed >= 12 && weather.windSpeed < 20;
  const isUnsafe = !weather.suitable_for_spraying || weather.windSpeed >= 20;

  const sprayable = allCities.filter(c => c.suitable_for_spraying && c.windSpeed < 15).length;
  const cautious = allCities.filter(c => c.suitable_for_spraying && c.windSpeed >= 12 && c.windSpeed < 20).length;
  const avoid = allCities.filter(c => !c.suitable_for_spraying || c.windSpeed >= 20).length;

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div>
          <h1 className="text-4xl font-extrabold uppercase tracking-tight mb-2.5">Weather <span className="text-italics lowercase text-zinc-400">monitor.</span></h1>
          <p className="text-base font-bold text-zinc-500">Live spray conditions across <span className="text-black underline underline-offset-4 decoration-brand-accent decoration-2">Tamil Nadu</span>.</p>
        </div>
        <button onClick={refetch} disabled={loading} className="dj-button-outline py-2 px-5 text-[10px] flex items-center gap-2 disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Fleet-wide summary */}
      {!allLoading && allCities.length > 0 && (
        <div className="grid grid-cols-3 gap-0 border border-black">
          {[
            { label: 'Safe to Spray', value: sprayable, color: 'bg-brand-accent text-black' },
            { label: 'Use Caution', value: cautious, color: 'bg-orange-400 text-white' },
            { label: 'Avoid Spraying', value: avoid, color: 'bg-red-600 text-white' },
          ].map((s, i) => (
            <div key={s.label} className={cn('p-6 flex flex-col justify-between min-h-[120px] border-black', i !== 2 && 'border-r', s.color)}>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-70">{s.label}</p>
              <p className="text-4xl font-black tracking-tighter">{s.value} <span className="text-lg">cities</span></p>
            </div>
          ))}
        </div>
      )}

      {/* City selector */}
      <div className="flex flex-wrap gap-0 border border-black overflow-x-auto">
        {TN_CITIES.map(city => (
          <button
            key={city}
            onClick={() => setSelectedCity(city)}
            className={cn(
              'px-5 py-3 text-[8px] font-black uppercase tracking-widest border-r border-black last:border-r-0 transition-all whitespace-nowrap',
              selectedCity === city ? 'bg-black text-white' : 'bg-white text-zinc-400 hover:text-black hover:bg-zinc-50'
            )}
          >
            {city}
          </button>
        ))}
      </div>

      {/* Detail card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border border-black">
        <div className="lg:col-span-8 p-8 bg-white border-black lg:border-r border-b lg:border-b-0">
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={12} className="text-zinc-400" />
                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-400">{selectedCity}, Tamil Nadu</p>
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">{loading ? 'Loading...' : weather.condition}</h2>
              {weather.last_updated && <p className="text-[8px] text-zinc-300 font-bold mt-1">{weather.last_updated}</p>}
            </div>
            <div className="text-right">
              <p className="text-5xl font-black tracking-tighter">{loading ? '--' : `${weather.temp}°C`}</p>
              <p className="text-[8px] font-bold text-zinc-400">Feels like {loading ? '--' : `${weather.feels_like}°C`}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-black">
            {[
              { label: 'Temperature', value: `${weather.temp}°C`, icon: <Thermometer size={20} />, color: 'bg-white hover:bg-brand-accent' },
              { label: 'Wind Speed', value: `${weather.windSpeed} km/h ${weather.wind_direction}`, icon: <Wind size={20} />, color: 'bg-zinc-50 hover:bg-black hover:text-white' },
              { label: 'Humidity', value: `${weather.humidity}%`, icon: <Droplets size={20} />, color: 'bg-white hover:bg-brand-accent' },
              { label: 'Conditions', value: weather.condition || 'Clear', icon: <CloudSun size={20} />, color: 'bg-zinc-50 hover:bg-brand-accent' },
            ].map((item, idx) => (
              <div key={item.label} className={cn('p-5 border-black flex flex-col justify-between min-h-[110px] transition-colors cursor-default', idx !== 3 && 'border-r', item.color)}>
                <div className="text-current mb-3">{item.icon}</div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-1">{item.label}</p>
                  <p className="text-base font-black tracking-tighter">{loading ? '--' : item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Spray suitability */}
        <div className={cn(
          'lg:col-span-4 p-8 flex flex-col justify-between min-h-[280px]',
          isUnsafe ? 'bg-red-600 text-white' : isModerate ? 'bg-black text-white' : 'bg-brand-accent text-black'
        )}>
          <div>
            <h3 className="text-[8px] font-black uppercase tracking-[0.3em] mb-6 opacity-70">Spray Decision</h3>
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 border border-current flex items-center justify-center">
                {isUnsafe ? <AlertTriangle size={28} /> : isModerate ? <AlertTriangle size={28} /> : <CheckCircle2 size={28} />}
              </div>
              <div>
                <p className="text-3xl font-black uppercase tracking-tighter leading-none mb-2.5">
                  {isUnsafe ? 'Do Not Spray' : isModerate ? 'Use Caution' : 'Safe to Spray'}
                </p>
                <p className="text-sm font-bold leading-tight opacity-80">
                  {isUnsafe
                    ? `Wind ${weather.windSpeed} km/h — unsafe for operations`
                    : isModerate
                    ? `Wind ${weather.windSpeed} km/h — pilot discretion advised`
                    : `Wind ${weather.windSpeed} km/h — ideal conditions`}
                </p>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-current/20">
            <p className="text-[10px] font-bold leading-tight">
              {isUnsafe
                ? 'Reschedule affected missions. Notify pilots immediately.'
                : isModerate
                ? 'Smaller drones may experience drift. Monitor closely.'
                : 'All systems go. Optimal precision spraying window.'}
            </p>
          </div>
        </div>
      </div>

      {/* All cities table */}
      <div>
        <h3 className="text-xl font-extrabold uppercase tracking-tight mb-6">All Cities <span className="text-italics lowercase text-zinc-400">status.</span></h3>
        {allLoading ? (
          <div className="border border-black p-8 text-center text-zinc-400 font-bold">Loading all city data...</div>
        ) : (
          <div className="border border-black overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-black text-white">
                  <th className="px-6 py-4 text-[8px] font-bold uppercase tracking-widest text-left border-r border-white/10">City</th>
                  <th className="px-6 py-4 text-[8px] font-bold uppercase tracking-widest text-left border-r border-white/10">Temp</th>
                  <th className="px-6 py-4 text-[8px] font-bold uppercase tracking-widest text-left border-r border-white/10">Wind</th>
                  <th className="px-6 py-4 text-[8px] font-bold uppercase tracking-widest text-left border-r border-white/10">Humidity</th>
                  <th className="px-6 py-4 text-[8px] font-bold uppercase tracking-widest text-left border-r border-white/10">Condition</th>
                  <th className="px-6 py-4 text-[8px] font-bold uppercase tracking-widest text-left">Spray Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {allCities.map((c) => {
                  const safe = c.suitable_for_spraying && c.windSpeed < 15;
                  const moderate = c.suitable_for_spraying && c.windSpeed >= 12;
                  const decision = safe ? 'Safe' : moderate ? 'Caution' : 'Avoid';
                  return (
                    <tr
                      key={c.city}
                      onClick={() => setSelectedCity(c.city)}
                      className={cn('cursor-pointer transition-all hover:bg-zinc-50', selectedCity === c.city && 'bg-brand-accent/10')}
                    >
                      <td className="px-6 py-4 font-extrabold uppercase tracking-tight border-r border-black/5">{c.city}</td>
                      <td className="px-6 py-4 font-bold border-r border-black/5">{c.temp}°C</td>
                      <td className="px-6 py-4 font-bold border-r border-black/5">{c.windSpeed} km/h</td>
                      <td className="px-6 py-4 font-bold border-r border-black/5">{c.humidity}%</td>
                      <td className="px-6 py-4 font-bold text-sm border-r border-black/5">{c.condition}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          'text-[8px] font-black uppercase tracking-widest px-2.5 py-1 border border-black',
                          safe ? 'bg-brand-accent text-white' :
                          moderate ? 'bg-orange-400 text-white' : 'bg-red-600 text-white'
                        )}>
                          {decision}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

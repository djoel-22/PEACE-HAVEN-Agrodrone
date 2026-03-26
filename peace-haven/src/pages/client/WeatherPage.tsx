import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  CloudSun, Thermometer, Wind, Droplets,
  CloudRain, AlertTriangle, CheckCircle2, MapPin, RefreshCw, Eye, Gauge
} from 'lucide-react';
import { useWeather, useAllCitiesWeather } from '../../hooks/useApi';
import { cn } from '../../lib/utils';

const TN_CITIES = [
  'Chennai','Coimbatore','Salem','Madurai','Erode',
  'Trichy','Tirunelveli','Vellore','Thanjavur','Tirupur'
];

export const WeatherPage = () => {
  const [selectedCity, setSelectedCity] = useState('Chennai');
  const { data: weather, loading, refetch } = useWeather(selectedCity);
  const { data: allCities, loading: allLoading } = useAllCitiesWeather();

  const getSuitabilityInfo = (suitable: boolean, windSpeed: number) => {
    if (!suitable || windSpeed > 20) return {
      status: 'Not Recommended',
      color: 'bg-red-600 text-white',
      icon: <AlertTriangle size={32} />,
      reason: windSpeed > 20 ? 'High wind speed detected' : 'Unfavorable conditions',
      description: 'Drone spraying is dangerous and ineffective. Please wait for better conditions.',
    };
    if (windSpeed > 12) return {
      status: 'Moderate Risk',
      color: 'bg-black text-white',
      icon: <AlertTriangle size={32} />,
      reason: 'Moderate wind conditions',
      description: 'Proceed with caution. Smaller drones may experience drift. Consult your pilot.',
    };
    return {
      status: 'Safe to Spray',
      color: 'bg-brand-accent text-black',
      icon: <CheckCircle2 size={32} />,
      reason: 'Optimal conditions',
      description: 'Low wind, good visibility. Perfect for precision agricultural spraying.',
    };
  };

  const suitability = getSuitabilityInfo(weather.suitable_for_spraying, weather.windSpeed);

  return (
    <div className="relative min-h-screen bg-white bg-grid">
      <div className="max-w-6xl mx-auto px-5 py-16 relative z-10">

        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-5xl font-black uppercase tracking-tighter mb-3">
              Weather <br /><span className="text-italics lowercase text-zinc-400">monitor.</span>
            </h1>
            <p className="text-base font-bold text-zinc-500 max-w-xl">
              Live conditions across <span className="text-black">Tamil Nadu</span> for optimal drone spraying decisions.
            </p>
          </div>
          <button
            onClick={refetch}
            disabled={loading}
            className="flex items-center gap-2 dj-button-outline py-2 px-4 text-xs disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* City Selector */}
        <div className="flex flex-wrap gap-0 border border-black mb-8 overflow-x-auto">
          {TN_CITIES.map((city) => (
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

        {/* Main weather card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border border-black mb-8">
          <div className="lg:col-span-8 p-8 bg-white border-black lg:border-r border-b lg:border-b-0">
            <div className="flex flex-col md:flex-row justify-between items-start mb-10 gap-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MapPin size={14} className="text-zinc-400" />
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-400">
                    {selectedCity}, Tamil Nadu
                  </p>
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tighter">{weather.condition}</h2>
                {weather.last_updated && (
                  <p className="text-[8px] text-zinc-400 font-bold mt-1">Updated: {weather.last_updated}</p>
                )}
              </div>
              <div className="text-left md:text-right">
                <p className="text-6xl font-black tracking-tighter leading-none mb-1.5">
                  {loading ? '--' : `${weather.temp}°C`}
                </p>
                <p className="text-[8px] font-black uppercase tracking-widest text-brand-accent bg-black px-1.5 py-0.5 inline-block">
                  Feels like {loading ? '--' : `${weather.feels_like}°C`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-black">
              {[
                { icon: Droplets, label: 'Humidity', value: loading ? '--' : `${weather.humidity}%` },
                { icon: Wind, label: 'Wind Speed', value: loading ? '--' : `${weather.windSpeed} km/h ${weather.wind_direction}` },
                { icon: CloudRain, label: 'Rain Est.', value: loading ? '--' : `${weather.rainChance}%` },
                { icon: Eye, label: 'Visibility', value: loading ? '--' : `${(weather as any).visibility ?? '--'} km` },
              ].map((item, idx) => (
                <div
                  key={item.label}
                  className={cn(
                    'p-5 border-black flex flex-col justify-between min-h-[110px]',
                    idx !== 3 && 'md:border-r border-b md:border-b-0',
                    idx % 2 === 1 ? 'bg-zinc-50' : 'bg-white'
                  )}
                >
                  <item.icon size={16} className="text-black mb-3" />
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-1">{item.label}</p>
                    <p className="text-lg font-black tracking-tighter">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Suitability */}
          <div className={cn('lg:col-span-4 p-8 flex flex-col justify-between min-h-[280px]', suitability.color)}>
            <div>
              <h3 className="text-[8px] font-black uppercase tracking-[0.3em] mb-6 opacity-70">Spray Suitability</h3>
              <div className="flex flex-col gap-4">
                <div className="w-12 h-12 border border-current flex items-center justify-center">
                  {suitability.icon}
                </div>
                <div>
                  <p className="text-3xl font-black uppercase tracking-tighter leading-none mb-2.5">{suitability.status}</p>
                  <p className="text-sm font-bold leading-tight opacity-80">{suitability.reason}</p>
                </div>
              </div>
            </div>
            <div className="pt-6 border-t border-current/20">
              <p className="text-[10px] font-bold leading-tight">{suitability.description}</p>
            </div>
          </div>
        </div>

        {/* All cities grid */}
        <div>
          <h3 className="text-xl font-black uppercase tracking-tighter mb-6">
            All Tamil Nadu <span className="text-italics lowercase text-zinc-400">cities.</span>
          </h3>
          {allLoading ? (
            <div className="border border-black p-10 text-center text-zinc-400 font-bold text-sm">Loading all cities...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-0 border border-black">
              {allCities.map((c, idx) => {
                const safe = c.suitable_for_spraying;
                const risky = !safe || c.windSpeed > 12;
                return (
                  <button
                    key={c.city}
                    onClick={() => setSelectedCity(c.city)}
                    className={cn(
                      'p-5 border-black text-left transition-all hover:bg-zinc-50 group',
                      idx % 5 !== 4 && 'border-r',
                      idx < allCities.length - 5 && 'border-b',
                      selectedCity === c.city && 'bg-black text-white hover:bg-black'
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-60">{c.city}</p>
                      <div className={cn(
                        'w-2 h-2',
                        safe && !risky ? 'bg-brand-accent' : risky ? 'bg-orange-400' : 'bg-red-500'
                      )} />
                    </div>
                    <p className="text-2xl font-black tracking-tighter">{c.temp}°</p>
                    <p className="text-[8px] font-bold uppercase tracking-widest opacity-50 mt-1 truncate">{c.condition}</p>
                    <p className="text-[7px] font-bold mt-2 opacity-40">
                      💨 {c.windSpeed} km/h · 💧 {c.humidity}%
                    </p>
                    <p className={cn(
                      'text-[7px] font-black uppercase tracking-widest mt-2',
                      safe && !risky ? 'text-green-600' : risky ? 'text-orange-500' : 'text-red-500',
                      selectedCity === c.city && 'text-current opacity-80'
                    )}>
                      {safe && !risky ? '✓ Safe' : risky ? '⚠ Caution' : '✗ Avoid'}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Warning banner */}
        {!weather.suitable_for_spraying && !loading && (
          <div className="mt-10 p-6 bg-red-600 text-white border border-black flex items-center gap-4">
            <AlertTriangle size={20} className="flex-shrink-0" />
            <p className="text-base font-black uppercase tracking-tighter">
              Spraying not recommended in {selectedCity} — {weather.condition}. Wind: {weather.windSpeed} km/h.
            </p>
          </div>
        )}
        {weather.suitable_for_spraying && weather.windSpeed > 12 && !loading && (
          <div className="mt-10 p-6 bg-orange-500 text-white border border-black flex items-center gap-4">
            <AlertTriangle size={20} className="flex-shrink-0" />
            <p className="text-base font-black uppercase tracking-tighter">
              Moderate wind ({weather.windSpeed} km/h) in {selectedCity} — proceed with caution.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

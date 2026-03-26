import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, CloudSun, ShieldCheck, Zap,
  Activity, Globe, Users, Drone as DroneIcon
} from 'lucide-react';
import { Badge } from '../../components/shared/UI';
import { useWeather, useStats } from '../../hooks/useApi';
import { cn } from '../../lib/utils';

const Marquee = ({ items, reverse = false }: { items: string[], reverse?: boolean }) => (
  <div className="marquee-container py-10 border-y border-black bg-black text-white">
    <div className={cn('marquee-content', reverse && 'direction-reverse')}>
      {[...items, ...items, ...items].map((item, i) => (
        <span key={i} className="text-4xl font-black uppercase tracking-tighter mx-10 flex items-center gap-4">
          <DroneIcon size={32} className="text-brand-accent" />{item}
        </span>
      ))}
    </div>
  </div>
);

export const HomePage = () => {
  const { data: weather } = useWeather('Chennai');
  const { data: stats } = useStats();

  const droneFeatures = ['Precision Spraying','Autonomous Flight','Thermal Mapping','Crop Health Monitoring','Swarm Technology','Tamil Nadu Wide','24/7 Support'];

  const farmersServed = stats?.total_farmers ?? 0;
  const activeDrones = stats?.active_drones ?? 0;
  const totalOrders = stats?.total_bookings ?? 0;

  const sprayStatus = weather.suitable_for_spraying
    ? (weather.windSpeed < 12 ? '✓ Safe to Spray Today' : '⚠ Moderate Conditions')
    : '✗ Not Recommended Today';
  const sprayColor = weather.suitable_for_spraying
    ? (weather.windSpeed < 12 ? 'text-green-600' : 'text-orange-500')
    : 'text-red-500';

  return (
    <div className="w-full bg-white overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-[50vh] flex flex-col justify-center px-5 py-10 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
          <div className="lg:col-span-8">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <Badge className="mb-3 py-1 px-2.5 text-[7px] font-black tracking-[0.3em] uppercase bg-black text-white rounded-none border-none">
                <Activity size={8} className="mr-1.5 inline animate-pulse text-brand-accent" />
                Fleet Status: Active in Tamil Nadu
              </Badge>
            </motion.div>
            <h1 className="text-4xl md:text-[5.5rem] font-black tracking-tighter leading-[0.8] mb-5 text-black uppercase">
              Precision <br />
              <span className="text-italics lowercase text-zinc-400">flight.</span> <br />
              Superior <br />
              <span className="text-brand-accent">yield.</span>
            </h1>
            <p className="text-base text-zinc-500 mb-8 max-w-lg leading-tight font-bold">
              Tamil Nadu's #1 drone subscription service for <span className="text-black">modern farmers</span>.
              We spray your pesticides with precision. Pause or cancel anytime.
            </p>

            {/* Live weather strip */}
            <div className="flex items-center gap-4 mb-6 p-3 border border-black bg-zinc-50">
              <CloudSun size={16} className="text-zinc-400 flex-shrink-0" />
              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Chennai Today:</span>
              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-700">{weather.temp}°C · Wind {weather.windSpeed} km/h</span>
              <span className={cn('text-[8px] font-black uppercase tracking-widest ml-auto', sprayColor)}>{sprayStatus}</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <Link to="/book"><button className="dj-button-filled text-sm h-12 px-6">Book a Mission</button></Link>
              <Link to="/track"><button className="dj-button-outline text-sm h-12 px-6">Track Order</button></Link>
            </div>
          </div>

          <div className="lg:col-span-4 hidden lg:block">
            <div className="dj-card p-0 overflow-hidden aspect-[3/4] relative group">
              <img
                src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1200"
                alt="Agriculture" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all" />
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-black text-white translate-y-full group-hover:translate-y-0 transition-transform">
                <p className="text-[10px] font-black uppercase tracking-widest mb-1.5">Live Fleet</p>
                <p className="text-lg font-black tracking-tighter">Active in Tamil Nadu</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Marquee items={droneFeatures} />

      {/* Services */}
      <section className="px-5 py-16 max-w-6xl mx-auto">
        <div className="mb-12">
          <h2 className="text-3xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9]">
            The way farming <br /><span className="text-italics lowercase text-zinc-400">should've</span> <br />been done
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-black">
          {[
            { title: 'Subscribe', desc: "Subscribe to a plan & request as many missions as you'd like across Tamil Nadu.", icon: Zap, color: 'bg-white', link: '/book' },
            { title: 'Request', desc: 'Provide your pesticides & request a mission for precision spraying.', icon: Globe, color: 'bg-brand-accent', link: '/book' },
            { title: 'Receive', desc: 'Receive your drone swarm within 24 hours on average at your farm.', icon: DroneIcon, color: 'bg-white', link: '/track' },
          ].map((item, idx) => (
            <div key={item.title} className={cn('p-8 border-black flex flex-col justify-between min-h-[260px]', idx !== 2 && 'md:border-r border-b md:border-b-0', item.color)}>
              <div>
                <item.icon size={32} className="mb-6 text-black" />
                <h3 className="text-2xl font-black uppercase tracking-tighter mb-3">{item.title}</h3>
                <p className="text-base font-bold leading-tight text-zinc-600">{item.desc}</p>
              </div>
              <Link to={item.link} className="flex items-center gap-2 font-black uppercase tracking-widest text-[8px] mt-6 hover:gap-3 transition-all">
                Get Started <ArrowRight size={12} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="px-5 py-16 bg-black text-white">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12 max-w-3xl">
            <p className="text-[8px] font-black uppercase tracking-[0.5em] mb-5 text-brand-accent">Membership benefits</p>
            <h2 className="text-3xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9]">
              It's <span className="text-italics lowercase text-zinc-500">"you'll never go back"</span> better
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Mission Board', desc: 'Easily manage your mission queue with a dedicated board.' },
              { title: 'Fixed Monthly Rate', desc: 'No surprises here! Pay the same fixed price each month.' },
              { title: 'Fast Deployment', desc: 'Get your drones deployed in just a couple days on average.' },
              { title: 'Top-Notch Quality', desc: 'Senior-level agricultural expertise at your fingertips.' },
              { title: 'Flexible & Scalable', desc: 'Scale up or down as needed, and pause or cancel anytime.' },
              { title: 'Tamil Nadu Wide', desc: 'Coverage across all 38 districts — Coimbatore to Chennai.' },
            ].map(b => (
              <div key={b.title} className="p-6 border border-white/10 hover:border-brand-accent transition-colors group">
                <h4 className="text-lg font-black uppercase tracking-tighter mb-2.5 group-hover:text-brand-accent transition-colors">{b.title}</h4>
                <p className="text-zinc-500 font-bold leading-tight text-xs">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Stats */}
      <section className="px-5 py-16 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Farmers Served', value: farmersServed > 0 ? `${farmersServed.toLocaleString()}+` : '—' },
            { label: 'Orders Placed', value: totalOrders > 0 ? `${totalOrders.toLocaleString()}+` : '—' },
            { label: 'Drones Active', value: activeDrones > 0 ? `${activeDrones}+` : '—' },
            { label: 'Efficiency Rate', value: stats ? `${stats.efficiency_rate}%` : '—' },
          ].map(stat => (
            <div key={stat.label} className="text-center md:text-left">
              <p className="text-4xl font-black tracking-tighter mb-1">{stat.value}</p>
              <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-12 max-w-6xl mx-auto">
        <div className="dj-card bg-brand-accent p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-[0.9] mb-6">
            Ready to <span className="text-italics lowercase text-black/50">transform</span> your farm?
          </h2>
          <Link to="/book"><button className="dj-button-filled text-base h-14 px-8">Get Started Now</button></Link>
        </div>
      </section>
    </div>
  );
};

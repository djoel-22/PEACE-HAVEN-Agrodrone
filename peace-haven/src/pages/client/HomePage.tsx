import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowRight, CloudSun, Zap, Globe, Users } from 'lucide-react';
import { useWeather, useStats } from '../../hooks/useApi';
import { cn } from '../../lib/utils';

// ── Clean professional marquee ────────────────────────────────────────────────
const MARQUEE_ITEMS = [
  'Precision Spraying', 'Autonomous Flight', 'Thermal Mapping',
  'Crop Health Monitoring', 'Swarm Technology', 'Tamil Nadu Wide',
  '24/7 Support', 'Real-time Tracking', 'Certified Pilots', 'Zero Contact',
];

const Marquee = () => (
  <div className="overflow-hidden border-y border-black bg-black" style={{ height: '50px' }}>
    <div className="flex items-center h-full animate-marquee whitespace-nowrap" style={{ width: 'max-content' }}>
      {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
        <span key={i} className="inline-flex items-center gap-3 mx-10">
          <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: '#4a9a40' }} />
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/80">{item}</span>
        </span>
      ))}
    </div>
  </div>
);

export const HomePage = () => {
  const { data: weather } = useWeather('Chennai');
  const { data: stats }   = useStats();

  const farmersServed = stats?.total_farmers ?? 0;
  const activeDrones  = stats?.active_drones ?? 0;
  const totalOrders   = stats?.total_bookings ?? 0;

  const sprayStatus = weather.suitable_for_spraying
    ? (weather.windSpeed < 12 ? '✓ Safe to Spray Today' : '⚠ Moderate Conditions')
    : '✗ Not Recommended Today';
  const sprayColor = weather.suitable_for_spraying
    ? (weather.windSpeed < 12 ? 'text-green-600' : 'text-orange-500')
    : 'text-red-500';

  return (
    <div className="w-full bg-white overflow-hidden">

      {/* ── Hero — true fullscreen video ─────────────────────────────────── */}
      <section className="relative w-full" style={{ minHeight: '100vh' }}>

        {/* Video fills entire section */}
        <video
          autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 0 }}
        >
          <source src="/videos/drone-video.mp4" type="video/mp4" />
        </video>

        {/* Gradient overlay — strong on left for text, fades to transparent right */}
        <div
          className="absolute inset-0"
          style={{
            zIndex: 1,
            background: 'linear-gradient(105deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.88) 45%, rgba(255,255,255,0.4) 75%, rgba(255,255,255,0.1) 100%)',
          }}
        />

        {/* Bottom fade to white for smooth transition into marquee */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{ zIndex: 2, height: '120px', background: 'linear-gradient(to bottom, transparent, white)' }}
        />

        {/* Content */}
        <div className="relative w-full max-w-6xl mx-auto px-5 flex items-center" style={{ zIndex: 3, minHeight: '100vh' }}>
          <div className="w-full py-24 max-w-2xl">

            {/* Hero text */}
            <div>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-black text-white mb-5">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: '#4a9a40' }} />
                  <span className="text-[7px] font-black uppercase tracking-[0.35em]">Fleet Status: Active in Tamil Nadu</span>
                </div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="font-black tracking-tighter leading-[0.85] mb-6 uppercase text-black"
                style={{ fontSize: 'clamp(3.5rem, 8vw, 6.5rem)' }}
              >
                Precision <br />
                <span className="text-italics lowercase text-zinc-400">flight.</span> <br />
                Superior <br />
                <span style={{ color: '#4a9a40' }}>yield.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="text-base text-zinc-600 mb-8 max-w-md leading-relaxed font-medium"
              >
                Tamil Nadu's #1 drone subscription service for{' '}
                <span className="text-black font-bold">modern farmers</span>.
                Precision pesticide spraying — pause or cancel anytime.
              </motion.p>

              {/* Weather strip */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="flex flex-wrap items-center gap-3 mb-8 p-3 border border-black/15 bg-white/85"
              >
                <CloudSun size={14} className="text-zinc-400 flex-shrink-0" />
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Chennai Today:</span>
                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-700">
                  {weather.temp}°C · Wind {weather.windSpeed} km/h
                </span>
                <span className={cn('text-[8px] font-black uppercase tracking-widest ml-auto', sprayColor)}>
                  {sprayStatus}
                </span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <Link to="/book">
                  <button className="dj-button-filled h-12 px-8 text-sm">Book a Mission</button>
                </Link>
                <Link to="/track">
                  <button className="h-12 px-8 text-sm font-black uppercase tracking-widest border-2 border-black bg-white/85 text-black hover:bg-black hover:text-white transition-all">
                    Track Order
                  </button>
                </Link>
              </motion.div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Marquee ── */}
      <Marquee />

      {/* ── Services ── */}
      <section className="px-5 py-20 max-w-6xl mx-auto">
        <div className="mb-14">
          <p className="text-[8px] font-black uppercase tracking-[0.5em] text-zinc-400 mb-4">How It Works</p>
          <h2 className="text-3xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9]">
            The way farming <br />
            <span className="text-italics lowercase text-zinc-400">should've</span> <br />
            been done
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-black">
          {[
            {
              step: '01', title: 'Subscribe',
              desc: "Choose a plan and request as many missions as you need across Tamil Nadu.",
              icon: Zap, bg: 'bg-white', textClass: 'text-zinc-500', iconClass: 'text-black',
              link: '/book',
            },
            {
              step: '02', title: 'Request',
              desc: 'Provide your pesticides and submit a mission for precision drone spraying.',
              icon: Globe, bg: 'bg-black', textClass: 'text-zinc-400', iconClass: 'text-white',
              link: '/book',
            },
            {
              step: '03', title: 'Receive',
              desc: 'Our certified pilot team arrives within 24 hours at your farm, ready to fly.',
              icon: Users, bg: 'bg-white', textClass: 'text-zinc-500', iconClass: 'text-black',
              link: '/track',
            },
          ].map((item, idx) => (
            <div key={item.title} className={cn(
              'p-8 border-black flex flex-col justify-between min-h-[280px]',
              idx !== 2 && 'md:border-r border-b md:border-b-0',
              item.bg
            )}>
              <div>
                <div className="flex items-start justify-between mb-6">
                  <item.icon size={26} className={item.iconClass} />
                  <span className={cn('text-[10px] font-black tracking-[0.25em]',
                    item.bg === 'bg-black' ? 'text-white/20' : 'text-black/10')}>
                    {item.step}
                  </span>
                </div>
                <h3 className={cn('text-xl font-black uppercase tracking-tighter mb-3',
                  item.bg === 'bg-black' ? 'text-white' : 'text-black')}>
                  {item.title}
                </h3>
                <p className={cn('text-sm font-medium leading-relaxed', item.textClass)}>{item.desc}</p>
              </div>
              <Link to={item.link}>
                <div className={cn(
                  'flex items-center gap-2 font-black uppercase tracking-widest text-[8px] mt-6 hover:gap-3 transition-all',
                  item.bg === 'bg-black' ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-black'
                )}>
                  <span>Get Started</span>
                  <ArrowRight size={11} />
                </div>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="px-5 py-20 bg-black">
        <div className="max-w-6xl mx-auto">
          <div className="mb-14 max-w-3xl">
            <p className="text-[8px] font-black uppercase tracking-[0.5em] mb-5" style={{ color: '#4a9a40' }}>
              Why Choose Peace Haven
            </p>
            <h2 className="text-3xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9] text-white">
              It's <span className="text-italics lowercase text-zinc-600">"you'll never go back"</span> better
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5">
            {[
              { title: 'Mission Board',       desc: 'Manage your entire mission queue from a clean, intuitive dashboard.' },
              { title: 'Fixed Monthly Rate',  desc: 'No surprises. One transparent price every month, GST included.' },
              { title: 'Fast Deployment',     desc: 'Drones deployed within 24–48 hours of booking confirmation.' },
              { title: 'Certified Expertise', desc: 'DGCA-certified pilots with deep agricultural knowledge.' },
              { title: 'Flexible Plans',      desc: 'Scale missions up or down. Pause or cancel anytime, no penalties.' },
              { title: 'Tamil Nadu Wide',     desc: 'Full coverage across all 38 districts — from Coimbatore to Chennai.' },
            ].map(b => (
              <div key={b.title} className="p-8 bg-black hover:bg-white/4 transition-colors group">
                <div className="w-1 h-6 mb-5" style={{ backgroundColor: '#4a9a40' }} />
                <h4 className="text-sm font-black uppercase tracking-tighter mb-3 text-white">{b.title}</h4>
                <p className="text-zinc-600 font-medium leading-relaxed text-xs">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="px-5 py-16 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-black/10">
          {[
            { label: 'Farmers Served',  value: farmersServed > 0 ? `${farmersServed.toLocaleString()}+` : '—' },
            { label: 'Missions Placed', value: totalOrders   > 0 ? `${totalOrders.toLocaleString()}+`   : '—' },
            { label: 'Drones Active',   value: activeDrones  > 0 ? `${activeDrones}+`                   : '—' },
            { label: 'Efficiency Rate', value: stats ? `${stats.efficiency_rate}%`                      : '—' },
          ].map((stat, i) => (
            <div key={stat.label} className={cn(
              'p-8 text-center md:text-left',
              i !== 3 && 'border-r border-black/10 border-b md:border-b-0'
            )}>
              <p className="text-4xl font-black tracking-tighter mb-2 text-black">{stat.value}</p>
              <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-5 pb-20 max-w-6xl mx-auto">
        <div className="bg-black border border-black p-12 md:p-16 text-center">
          <p className="text-[8px] font-black uppercase tracking-[0.5em] mb-4" style={{ color: '#4a9a40' }}>
            Start Today
          </p>
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-none mb-4 text-white">
            Ready to <span className="text-italics lowercase text-zinc-600">transform</span> your farm?
          </h2>
          <p className="text-zinc-500 font-medium text-sm mb-10 max-w-md mx-auto leading-relaxed">
            Join Tamil Nadu farmers already using precision drone technology for better yields and healthier crops.
          </p>
          <Link to="/book">
            <button className="h-14 px-10 font-black uppercase tracking-widest text-sm bg-white text-black hover:bg-[#4a9a40] hover:text-white transition-all">
              Get Started Now
            </button>
          </Link>
        </div>
      </section>

    </div>
  );
};
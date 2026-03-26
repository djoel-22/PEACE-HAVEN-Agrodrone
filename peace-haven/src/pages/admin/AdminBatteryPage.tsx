import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Battery, Zap, RefreshCw, AlertCircle, CheckCircle2, ShieldCheck, AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDrones } from '../../hooks/useApi';
import { logCharge } from '../../lib/api';

export const AdminBatteryPage = () => {
  const { data: drones, loading, refetch } = useDrones();
  const [charging, setCharging] = useState<string | null>(null);
  const [filter, setFilter] = useState<'All' | 'Charging' | 'Ready' | 'Alert'>('All');
  const [msg, setMsg] = useState('');

  const batteries = drones.map(d => ({
    id: `BT-${d.id}`,
    droneId: d.id,
    status: d.battery === 100 ? 'Ready' : d.battery < 20 ? 'Alert' : 'Charging',
    level: d.battery,
    health: d.health,
    temp: 30 + Math.round(Math.random() * 8), // ambient estimate
    cycles: d.cycleCount,
    lastCharged: d.lastCharged,
    model: d.model,
  }));

  const filtered = filter === 'All' ? batteries : batteries.filter(b => b.status === filter);

  const avgHealth = batteries.length ? Math.round(batteries.reduce((s, b) => s + b.health, 0) / batteries.length) : 0;
  const criticalCount = batteries.filter(b => b.status === 'Alert').length;

  const handleCharge = async (droneId: string, btId: string) => {
    setCharging(btId);
    try {
      await logCharge(droneId);
      setMsg(`✓ Charge cycle logged for ${btId}`);
      await refetch();
    } catch (e: any) {
      setMsg(`✗ Error: ${e.message}`);
    } finally {
      setCharging(null);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div>
          <h1 className="text-5xl font-extrabold uppercase tracking-tight mb-3">Batteries <span className="text-italics lowercase text-zinc-400">fleet.</span></h1>
          <p className="text-lg font-bold text-zinc-500">Monitor health, cycles, and charging status across the <span className="text-black underline underline-offset-8 decoration-brand-accent decoration-4">Tamil Nadu fleet</span>.</p>
        </div>
        <div className="flex gap-4 items-end">
          {msg && <p className={cn('text-[9px] font-bold uppercase tracking-widest px-4 py-2 border', msg.startsWith('✓') ? 'border-green-300 text-green-600 bg-green-50' : 'border-red-300 text-red-600 bg-red-50')}>{msg}</p>}
          <button onClick={refetch} disabled={loading} className="px-6 py-3 text-[8px] font-bold uppercase tracking-[0.3em] bg-black text-white hover:bg-brand-accent transition-all border-2 border-black flex items-center gap-3 disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync All
          </button>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-2 border-black">
        {[
          { label: 'Avg Health', value: `${avgHealth}%`, icon: <ShieldCheck size={24} />, color: 'bg-white' },
          { label: 'Total Units', value: `${batteries.length}`, icon: <Battery size={24} />, color: 'bg-zinc-50' },
          { label: 'Critical Alerts', value: `${criticalCount}`, icon: <AlertCircle size={24} />, color: criticalCount > 0 ? 'bg-red-600 text-white' : 'bg-white' },
        ].map((stat, i) => (
          <div key={i} className={cn('p-10 border-black flex flex-col justify-between min-h-[160px]', i !== 2 && 'md:border-r-2 border-b-2 md:border-b-0', stat.color)}>
            <div className="w-12 h-12 border-2 border-current flex items-center justify-center">{stat.icon}</div>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.4em] mb-2 opacity-70">{stat.label}</p>
              <h3 className="text-5xl font-extrabold uppercase tracking-tight leading-none">{loading ? '—' : stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-0 border-2 border-black w-fit">
        {(['All', 'Charging', 'Ready', 'Alert'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn('px-6 py-3 text-[8px] font-bold uppercase tracking-[0.3em] transition-colors border-r-2 border-black last:border-r-0',
              filter === f ? 'bg-black text-white' : 'bg-white text-black hover:bg-brand-accent hover:text-white'
            )}>
            {f}
          </button>
        ))}
      </div>

      {/* Battery grid */}
      {loading ? (
        <div className="border-2 border-black p-16 text-center text-zinc-400 font-bold">Loading battery data...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-0 border-2 border-black">
          {filtered.map((bt, idx) => (
            <div key={bt.id} className={cn(
              'p-10 border-black flex flex-col justify-between min-h-[320px] group',
              idx % 3 !== 2 && 'xl:border-r-2',
              idx < filtered.length - 3 && 'border-b-2',
              idx % 2 === 1 ? 'bg-zinc-50' : 'bg-white'
            )}>
              <div className="space-y-8">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className={cn('w-14 h-14 border-2 border-black flex items-center justify-center',
                      bt.status === 'Ready' ? 'bg-brand-accent text-white' :
                      bt.status === 'Charging' ? 'bg-black text-white' : 'bg-red-600 text-white'
                    )}>
                      <Battery size={24} />
                    </div>
                    <div>
                      <h4 className="text-2xl font-extrabold uppercase tracking-tight leading-none mb-1">{bt.id}</h4>
                      <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.3em]">Drone: {bt.droneId}</p>
                    </div>
                  </div>
                  <span className={cn('text-[8px] font-bold uppercase tracking-[0.3em] px-3 py-1.5 border-2 border-black',
                    bt.status === 'Ready' ? 'bg-brand-accent text-white' :
                    bt.status === 'Charging' ? 'bg-black text-white' : 'bg-red-600 text-white'
                  )}>{bt.status}</span>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.3em]">Charge Level</span>
                    <span className="text-4xl font-extrabold tracking-tight">{bt.level}%</span>
                  </div>
                  <div className="h-4 border-2 border-black bg-white p-1">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${bt.level}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={cn('h-full', bt.level < 20 ? 'bg-red-500' : bt.level === 100 ? 'bg-brand-accent' : 'bg-black')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 pt-6 border-t-2 border-black/10">
                  <div>
                    <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.3em]">Health</p>
                    <p className="text-xl font-extrabold">{bt.health}%</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.3em]">Temp</p>
                    <p className="text-xl font-extrabold">{bt.temp}°C</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.3em]">Cycles</p>
                    <p className="text-xl font-extrabold">{bt.cycles}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleCharge(bt.droneId, bt.id)}
                disabled={charging === bt.id}
                className="mt-6 w-full py-4 text-[8px] font-bold uppercase tracking-[0.3em] bg-white border-2 border-black hover:bg-brand-accent hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Zap size={14} />
                {charging === bt.id ? 'Logging...' : 'Log Charge Cycle'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Critical warning banner */}
      {criticalCount > 0 && !loading && (
        <div className="border-2 border-red-600 p-10 bg-red-50">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-14 h-14 bg-red-600 border-2 border-black flex items-center justify-center text-white">
              <AlertCircle size={28} />
            </div>
            <h4 className="text-2xl font-extrabold uppercase tracking-tight text-red-600">
              {criticalCount} Battery {criticalCount === 1 ? 'Alert' : 'Alerts'}
            </h4>
          </div>
          <p className="text-base font-bold text-zinc-600 mb-6">
            {batteries.filter(b => b.status === 'Alert').map(b => b.id).join(', ')} — battery below 20%.
            Immediate charging required before next deployment.
          </p>
          <button
            onClick={() => setFilter('Alert')}
            className="py-4 px-8 text-[8px] font-bold uppercase tracking-[0.3em] border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-all flex items-center gap-2"
          >
            View Critical Units <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

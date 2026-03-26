import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Drone as DroneIcon, MoreHorizontal, Battery, X } from 'lucide-react';
import { useDrones } from '../../hooks/useApi';
import { logCharge } from '../../lib/api';
import { cn } from '../../lib/utils';

export const AdminDronesPage = () => {
  const { data: drones, loading, refetch } = useDrones();
  const [selected, setSelected] = useState<any>(null);
  const [charging, setCharging] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const handleCharge = async (droneId: string) => {
    setCharging(droneId);
    try {
      await logCharge(droneId);
      setMsg(`Charge logged for ${droneId}`);
      await refetch();
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    } finally {
      setCharging(null);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const available = drones.filter(d => d.status === 'Available').length;
  const inUse = drones.filter(d => d.status === 'In Use').length;
  const maintenance = drones.filter(d => d.status === 'Maintenance').length;
  const lowBattery = drones.filter(d => d.battery < 20).length;

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div>
          <h1 className="text-4xl font-extrabold uppercase tracking-tight mb-2.5">Fleet</h1>
          <p className="text-base font-bold text-zinc-500">Monitor health, battery, and deployment status of all <span className="text-black underline underline-offset-4 decoration-brand-accent decoration-4">active units</span> in Tamil Nadu.</p>
        </div>
        {msg && <p className={cn('text-[9px] font-bold uppercase tracking-widest px-4 py-2 border', msg.startsWith('Error') ? 'border-red-300 text-red-600 bg-red-50' : 'border-green-300 text-green-600 bg-green-50')}>{msg}</p>}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-black">
        {[
          { label: 'Available', value: available, color: 'bg-brand-accent text-black' },
          { label: 'In Use', value: inUse, color: 'bg-black text-white' },
          { label: 'Maintenance', value: maintenance, color: 'bg-zinc-100 text-black' },
          { label: 'Low Battery', value: lowBattery, color: lowBattery > 0 ? 'bg-red-600 text-white' : 'bg-white text-black' },
        ].map((s, i) => (
          <div key={s.label} className={cn('p-6 border-black flex flex-col justify-between min-h-[100px]', i !== 3 && 'border-r', s.color)}>
            <p className="text-[8px] font-black uppercase tracking-widest opacity-70">{s.label}</p>
            <p className="text-4xl font-black tracking-tighter">{loading ? '—' : s.value}</p>
          </div>
        ))}
      </div>

      {/* Drone cards */}
      {loading ? (
        <div className="border border-black p-16 text-center text-zinc-400 font-bold">Loading fleet data...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-0 border border-black">
          {drones.map((drone, idx) => (
            <div
              key={drone.id}
              className={cn(
                'p-8 border-black flex flex-col justify-between min-h-[320px] group transition-colors hover:bg-black hover:text-white cursor-pointer',
                idx % 4 !== 3 && 'xl:border-r',
                idx < drones.length - 4 && 'border-b',
                idx % 2 === 1 ? 'bg-zinc-50' : 'bg-white'
              )}
              onClick={() => setSelected(drone)}
            >
              <div className="space-y-8">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 border border-black flex items-center justify-center group-hover:bg-brand-accent group-hover:text-white transition-all duration-500">
                    <DroneIcon size={24} />
                  </div>
                  <span className={cn(
                    'text-[8px] font-bold uppercase tracking-[0.3em] px-2.5 py-1 border border-black',
                    drone.status === 'Available' ? 'bg-brand-accent text-white' :
                    drone.status === 'In Use' ? 'bg-black text-white group-hover:bg-white group-hover:text-black' : 'bg-white text-black'
                  )}>
                    {drone.status}
                  </span>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.4em] mb-1.5 group-hover:text-zinc-500">{drone.model}</p>
                  <h3 className="text-3xl font-extrabold uppercase tracking-tight group-hover:text-brand-accent transition-colors">{drone.id}</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.3em] group-hover:text-zinc-500">Battery Level</span>
                    <span className={cn('text-xl font-extrabold tracking-tight', drone.battery < 20 ? 'text-red-500' : 'text-black group-hover:text-white')}>
                      {drone.battery}%
                    </span>
                  </div>
                  <div className="h-4 border-2 border-black bg-white p-0.5 group-hover:border-white/20">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${drone.battery}%` }}
                      transition={{ duration: 1.5, ease: 'easeOut' }}
                      className={cn('h-full', drone.battery < 20 ? 'bg-red-500' : drone.battery < 50 ? 'bg-orange-400' : 'bg-brand-accent')}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-black/10 group-hover:border-white/10">
                  <div>
                    <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.3em] group-hover:text-zinc-500">Health</p>
                    <p className="text-lg font-extrabold">{drone.health}%</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.3em] group-hover:text-zinc-500">Cycles</p>
                    <p className="text-lg font-extrabold">{drone.cycleCount}</p>
                  </div>
                </div>
              </div>
              <div className="pt-6 flex gap-0 border-t border-black mt-6 -mx-8 -mb-8 group-hover:border-white/10">
                <button
                  onClick={(e) => { e.stopPropagation(); handleCharge(drone.id); }}
                  disabled={charging === drone.id}
                  className="flex-1 py-4 text-[8px] font-bold uppercase tracking-[0.3em] bg-white text-black hover:bg-brand-accent hover:text-white transition-all border-r border-black disabled:opacity-50"
                >
                  {charging === drone.id ? 'Logging...' : 'Log Charge'}
                </button>
                <button onClick={(e) => { e.stopPropagation(); setSelected(drone); }} className="w-14 py-4 flex items-center justify-center bg-white text-black hover:bg-brand-accent hover:text-white transition-all">
                  <MoreHorizontal size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drone detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-black w-full max-w-md overflow-hidden">
            <div className="p-8 border-b border-black flex justify-between items-center bg-zinc-50">
              <div>
                <h3 className="text-2xl font-extrabold uppercase tracking-tight">{selected.id}</h3>
                <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest mt-1">{selected.model}</p>
              </div>
              <button onClick={() => setSelected(null)} className="w-10 h-10 border border-black flex items-center justify-center hover:bg-black hover:text-white transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-4">
              {[
                ['Status', selected.status],
                ['Battery Level', `${selected.battery}%`],
                ['Health', `${selected.health}%`],
                ['Cycle Count', selected.cycleCount],
                ['Last Charged', selected.lastCharged],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between items-center border-b border-black/5 pb-3">
                  <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{label}</p>
                  <p className="font-extrabold uppercase tracking-tight">{value}</p>
                </div>
              ))}
            </div>
            <div className="p-8 bg-zinc-50 border-t border-black flex gap-3">
              <button
                onClick={() => { handleCharge(selected.id); setSelected(null); }}
                className="dj-button-filled flex-1 h-12"
              >
                Log Charge Cycle
              </button>
              <button onClick={() => setSelected(null)} className="dj-button-outline flex-1 h-12">Close</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

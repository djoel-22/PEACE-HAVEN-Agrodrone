// ============================================================
// TrackOrderPage.tsx — fixed bg-brand-accent contrast on status banner
// ============================================================
import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Search, MapPin, Calendar, Sprout,
  Plane, Clock, CheckCircle2, Circle,
  Ruler, User, Phone
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { trackByBookingId } from '../../lib/api';
import { mapOrder } from '../../lib/mappers';
import type { Order } from '../../types';

const STEPS = ['Placed', 'Scheduled', 'In Progress', 'Completed'];

export const TrackOrderPage = () => {
  const [searchId, setSearchId]   = useState('');
  const [order, setOrder]         = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = searchId.trim().toUpperCase();
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await trackByBookingId(id);
      setOrder(mapOrder(result));
    } catch {
      setError(`No order found for "${id}". Please check the booking ID and try again.`);
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getSteps = (status: string) => {
    const currentIndex = STEPS.indexOf(status);
    return STEPS.map((label, idx) => ({
      label,
      status: idx < currentIndex ? 'completed' : idx === currentIndex ? 'current' : 'pending',
    }));
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'Scheduled':   return 'Your service has been scheduled. Our pilot will arrive at the farm on time.';
      case 'In Progress': return 'Drone is currently spraying your field. Live monitoring active.';
      case 'Completed':   return 'Service completed successfully. Thank you for choosing Peace Haven!';
      default:            return 'Your booking has been received and is being processed by our team.';
    }
  };

  return (
    <div className="relative min-h-screen bg-white bg-grid">
      <div className="max-w-6xl mx-auto px-5 py-16 relative z-10">
        <div className="mb-16 text-center md:text-left">
          <div className="inline-block px-3 py-1.5 bg-black text-white text-[8px] font-black uppercase tracking-[0.3em] mb-6">Real-time Tracking</div>
          <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tighter leading-none uppercase">
            Track <br /><span className="text-italics lowercase text-zinc-400">order.</span>
          </h1>
          <p className="text-base font-bold text-zinc-500 max-w-xl">
            Enter your booking ID to see real-time progress of your <span className="text-black">agricultural mission in Tamil Nadu</span>.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-0 border border-black group relative overflow-hidden mb-12">
          <div className="relative flex-1">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-black transition-colors" size={20} />
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Enter Booking ID (e.g. AGR0001)"
              className="w-full h-16 pl-16 pr-6 bg-white focus:outline-none font-black text-base uppercase tracking-tighter placeholder:text-zinc-200 placeholder:normal-case placeholder:tracking-normal"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="h-16 px-10 bg-black text-white font-black uppercase tracking-widest text-[10px] hover:bg-[#4a9a40] transition-all border-l border-black disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Searching...</>
            ) : 'Track'}
          </button>
        </form>

        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-5 border border-red-300 bg-red-50 text-red-700 font-bold text-sm">
            {error}
          </motion.div>
        )}

        {order && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

            {/* Status banner — FIX: was bg-brand-accent (dark green) with mixed text
                Now: Completed = bright green bg + BLACK text (readable)
                     In Progress = black bg + WHITE text (readable)
                     Other = white bg + BLACK text (readable) */}
            <div className={cn('p-6 border border-black flex items-center gap-5',
              order.status === 'Completed'   ? 'text-black'       :
              order.status === 'In Progress' ? 'bg-black text-white' : 'bg-white text-black'
            )}
            style={order.status === 'Completed' ? { backgroundColor: '#4a9a40' } : undefined}
            >
              <div className="w-12 h-12 border border-current flex items-center justify-center flex-shrink-0">
                {order.status === 'Completed' ? <CheckCircle2 size={24} /> : <Plane size={24} />}
              </div>
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.3em] opacity-60 mb-1">Current Status</p>
                <p className="text-2xl font-black uppercase tracking-tighter">{order.status}</p>
                <p className="text-sm font-bold opacity-70 mt-1">{getStatusMessage(order.status)}</p>
              </div>
            </div>

            {/* Progress steps — FIX: completed steps use bright green + black text */}
            <div className="grid grid-cols-4 gap-0 border border-black">
              {getSteps(order.status).map((step, idx) => (
                <div key={step.label}
                  className={cn('p-6 border-black flex flex-col items-center text-center gap-3',
                    idx !== 3 && 'border-r',
                    step.status === 'current' ? 'bg-black text-white' : 'bg-white text-black'
                  )}
                  style={step.status === 'completed' ? { backgroundColor: '#4a9a40' } : undefined}
                >
                  <div className={cn('w-8 h-8 border flex items-center justify-center',
                    step.status === 'completed' ? 'border-black bg-black text-white' :
                    step.status === 'current'   ? 'border-white' : 'border-black/20'
                  )}>
                    {step.status === 'completed' ? <CheckCircle2 size={16} /> :
                     step.status === 'current'   ? <div className="w-2 h-2 bg-white rounded-full animate-pulse" /> :
                     <Circle size={16} className="text-zinc-200" />}
                  </div>
                  <p className={cn('text-[8px] font-black uppercase tracking-widest',
                    step.status === 'pending' ? 'text-zinc-300' : ''
                  )}>{step.label}</p>
                </div>
              ))}
            </div>

            {/* Order details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-black">
              {[
                { icon: User,   label: 'Customer',         value: order.customerName },
                { icon: Phone,  label: 'Phone',             value: order.phone || '—' },
                { icon: Sprout, label: 'Pesticide / Crop',  value: order.cropType },
                { icon: Ruler,  label: 'Land Area',         value: order.area },
                { icon: MapPin, label: 'Location',          value: order.location },
                { icon: Calendar, label: 'Scheduled Date',  value: order.date || '—' },
                { icon: Clock,  label: 'Scheduled Time',    value: order.scheduledTime || '—' },
                { icon: Plane,  label: 'Assigned Drone',    value: order.droneId || 'Not yet assigned' },
              ].map((item, idx) => (
                <div key={item.label} className={cn('p-6 border-black flex items-center gap-4',
                  idx % 2 === 0 && 'md:border-r',
                  idx < 6 && 'border-b'
                )}>
                  <div className="w-10 h-10 border border-black flex items-center justify-center flex-shrink-0 bg-zinc-50">
                    <item.icon size={16} className="text-black" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">{item.label}</p>
                    <p className="text-base font-black uppercase tracking-tight">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {!order && !error && (
          <div className="text-center py-20 border border-black/10">
            <Plane size={48} className="mx-auto mb-6 text-zinc-200" />
            <p className="text-zinc-300 font-black uppercase tracking-widest text-sm">Enter your booking ID above to track your order</p>
          </div>
        )}
      </div>
    </div>
  );
};
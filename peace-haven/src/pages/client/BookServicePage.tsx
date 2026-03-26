import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, AlertCircle, ArrowRight, 
  User, Phone, MapPin, Sprout, Ruler,
  Sparkles, ShieldCheck, Zap, Droplets, Clock
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { createOrder } from '../../lib/api';

export const BookServicePage = () => {
  const navigate = useNavigate();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    pesticideName: '',
    area: '',
    location: ''
  });

  const validateForm = () => {
    if (!formData.name || !formData.phone || !formData.pesticideName || !formData.area || !formData.location) {
      setError('Please fill in all required fields.');
      return false;
    }
    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    if (!phoneRegex.test(formData.phone)) {
      setError('Please enter a valid phone number.');
      return false;
    }
    const areaValue = parseFloat(formData.area);
    if (isNaN(areaValue) || areaValue <= 0) {
      setError('Please enter a valid numeric land area.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const res = await createOrder({
        farmer_name: formData.name,
        phone: formData.phone,
        service_type: 'pesticide_spray',
        area_hectares: parseFloat(formData.area),
        location: formData.location,
        crop_type: formData.pesticideName,
      });
      setBookingId(`AGR${String(res.request_id ?? res.id).padStart(4, '0')}`);
      setIsSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Booking failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white bg-grid px-5 py-16">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-2xl w-full"
        >
          <div className="dj-card p-10 md:p-16 text-center relative overflow-hidden">
            <div className="w-20 h-20 bg-brand-accent border border-black flex items-center justify-center mx-auto mb-10">
              <CheckCircle2 size={40} />
            </div>
            
            <h2 className="text-4xl font-black uppercase tracking-tighter mb-3 leading-none">Mission <br /><span className="text-italics lowercase text-zinc-400">initialized.</span></h2>
            <p className="text-base font-bold text-zinc-500 mb-10">
              Your agricultural mission <span className="text-black underline underline-offset-4 decoration-brand-accent">{bookingId}</span> has been queued. 
              Our flight controllers in <span className="text-black">Tamil Nadu</span> will contact you within 30 minutes.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-black mb-10 text-left">
              {[
                { label: 'Pesticide', value: formData.pesticideName, icon: Droplets },
                { label: 'Mission Area', value: `${formData.area} Acres`, icon: Ruler },
                { label: 'Coordinates', value: formData.location, icon: MapPin, full: true },
              ].map((item, idx) => (
                <div 
                  key={item.label} 
                  className={cn(
                    "p-6 border-black",
                    item.full ? "md:col-span-2" : "border-b md:border-b-0 md:border-r",
                    idx === 0 && "border-b md:border-b-0",
                    idx % 2 === 1 ? "bg-zinc-50" : "bg-white"
                  )}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <item.icon size={14} className="text-black" />
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em]">{item.label}</p>
                  </div>
                  <p className="text-lg font-black uppercase tracking-tighter truncate">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-5 justify-center">
              <button
                className="dj-button-filled h-16 px-10 text-lg"
                onClick={() => navigate('/track')}
              >
                Track Live
              </button>
              <button className="dj-button-outline h-16 px-10 text-lg" onClick={() => setIsSubmitted(false)}>
                New Booking
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white bg-grid min-h-screen relative">
      <div className="max-w-6xl mx-auto px-5 py-16 relative z-10">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-[8px] font-black uppercase tracking-[0.3em] px-2 py-1 bg-black text-white">
              Tamil Nadu's #1 Drone Service
            </div>
            <div className="h-px flex-1 bg-black/10"></div>
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-3 tracking-tighter leading-none uppercase">
            Schedule a <br />
            <span className="text-italics lowercase text-zinc-400">mission.</span>
          </h1>
          <p className="text-base font-bold text-zinc-500 max-w-xl">Configure your autonomous flight parameters below for <span className="text-black">precision results</span> across Tamil Nadu.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7">
            <div className="dj-card p-6 md:p-8 relative overflow-hidden">
              <AnimatePresence>
                {isLoading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/95 backdrop-blur-sm z-30 flex items-center justify-center"
                  >
                    <div className="flex flex-col items-center gap-5">
                      <div className="w-16 h-16 border-4 border-black border-t-brand-accent animate-spin"></div>
                      <p className="text-lg font-black uppercase tracking-tighter">Calculating Flight Path...</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                  <div className="p-5 bg-brand-pink text-white border border-black flex items-center gap-3 font-black uppercase tracking-tighter text-sm">
                    <AlertCircle size={18} />
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-2">
                      <User size={10} /> Farmer Name
                    </label>
                    <input 
                      type="text" 
                      placeholder="FULL NAME"
                      className="w-full px-4 py-2.5 border border-black focus:outline-none focus:bg-zinc-50 transition-all font-black uppercase text-[9px] tracking-widest"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-2">
                      <Phone size={10} /> Contact Number
                    </label>
                    <input 
                      type="tel" 
                      placeholder="PHONE NUMBER"
                      className="w-full px-4 py-2.5 border border-black focus:outline-none focus:bg-zinc-50 transition-all font-black uppercase text-[9px] tracking-widest"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-2">
                      <Droplets size={10} /> Pesticide Details (Farmer Provided)
                    </label>
                    <input 
                      type="text" 
                      placeholder="NAME OF PESTICIDE"
                      className="w-full px-4 py-2.5 border border-black focus:outline-none focus:bg-zinc-50 transition-all font-black uppercase text-[9px] tracking-widest"
                      value={formData.pesticideName}
                      onChange={(e) => setFormData({...formData, pesticideName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-2">
                      <Ruler size={10} /> Mission Area (Acres)
                    </label>
                    <input 
                      type="number" 
                      step="0.1"
                      placeholder="0.0"
                      className="w-full px-4 py-2.5 border border-black focus:outline-none focus:bg-zinc-50 transition-all font-black uppercase text-[9px] tracking-widest"
                      value={formData.area}
                      onChange={(e) => setFormData({...formData, area: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-2">
                    <MapPin size={10} /> Farm Location (Tamil Nadu)
                  </label>
                  <textarea 
                    rows={3}
                    placeholder="ENTER FARM ADDRESS OR GPS COORDINATES IN TAMIL NADU..."
                    className="w-full px-4 py-2.5 border border-black focus:outline-none focus:bg-zinc-50 transition-all font-black uppercase text-[9px] tracking-widest resize-none"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
                </div>

                <div className="pt-3">
                  <button type="submit" className="dj-button-filled w-full h-14 text-base">
                    Initialize Mission
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-10">
            <div className="dj-card p-0 overflow-hidden group">
              <img 
                src="https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&q=80&w=800" 
                alt="Precision Agriculture" 
                className="w-full h-64 object-cover grayscale hover:grayscale-0 transition-all duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="p-8 bg-black text-white">
                <p className="text-2xl font-black uppercase tracking-tighter leading-none">Autonomous Swarm <br /><span className="text-brand-accent">Technology.</span></p>
              </div>
            </div>

            <div className="dj-card bg-black text-white p-10">
              <h4 className="text-2xl font-black uppercase tracking-tighter mb-10 flex items-center gap-3">
                <ShieldCheck className="text-brand-accent" /> Mission Protocol
              </h4>
              <ul className="space-y-8">
                {[
                  { title: "90% Efficiency", desc: "Optimized flight paths reduce time and resource consumption.", icon: Zap },
                  { title: "Precision Spray", desc: "Ultra-fine droplet control reduces chemical usage by 30%.", icon: Droplets },
                  { title: "Zero Contact", desc: "Fully autonomous deployment ensures operator safety.", icon: ShieldCheck }
                ].map((item) => (
                  <li key={item.title} className="flex gap-6">
                    <div className="w-12 h-12 border border-white/20 flex-shrink-0 flex items-center justify-center text-brand-accent">
                      <item.icon size={20} />
                    </div>
                    <div>
                      <p className="font-black uppercase tracking-tighter text-lg mb-1.5">{item.title}</p>
                      <p className="text-xs font-bold text-zinc-400 leading-tight">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-8 bg-brand-accent border border-black flex gap-5">
              <AlertCircle className="text-black flex-shrink-0" size={28} />
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-1.5">Safety Notice</p>
                <p className="text-xs font-black uppercase tracking-tighter leading-tight">
                  Final mission parameters and pricing will be confirmed by our flight controllers after coordinate verification.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

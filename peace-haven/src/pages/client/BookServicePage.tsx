import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2, AlertCircle, MapPin, Ruler, Droplets,
  User, Phone, ShieldCheck, Zap, Wind, CloudRain, Eye,
  ChevronDown, RefreshCw, AlertTriangle,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { createOrder } from '../../lib/api';
import { useWeather } from '../../hooks/useApi';
import { useNavigate } from 'react-router-dom';

// ── Constants ─────────────────────────────────────────────────────────────────
const PRICE_PER_ACRE = 599; // ₹599 per acre

const CROP_TYPES = [
  'Rice / Paddy',
  'Wheat',
  'Cotton',
  'Sugarcane',
  'Maize / Corn',
  'Groundnut',
  'Sunflower',
  'Soybean',
  'Chilli',
  'Tomato',
  'Banana',
  'Coconut',
  'Turmeric',
  'Onion',
  'Other',
];

const TN_DISTRICTS = [
  'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
  'Tirunelveli', 'Vellore', 'Erode', 'Thoothukudi', 'Dindigul',
  'Thanjavur', 'Ranipet', 'Sivagangai', 'Virudhunagar', 'Namakkal',
  'Karur', 'Nagapattinam', 'Tiruppur', 'Krishnagiri', 'Dharmapuri',
  'Ariyalur', 'Perambalur', 'Cuddalore', 'Villupuram', 'Kallakurichi',
  'Kancheepuram', 'Chengalpattu', 'Tiruvallur', 'Nilgiris', 'Tiruvannamalai',
  'Pudukkottai', 'Ramanathapuram', 'Tenkasi', 'Theni', 'Tirupattur',
  'Tiruvarur', 'Mayiladuthurai', 'Kanniyakumari',
];

// ── Weather Sidebar ───────────────────────────────────────────────────────────
const WeatherWidget = ({ district }: { district: string }) => {
  const city = district || 'Chennai';
  const { data: weather, loading, refetch } = useWeather(city);

  const suitability = weather.suitable_for_spraying && weather.windSpeed <= 20
    ? weather.windSpeed > 12
      ? { label: '⚠ Moderate Conditions', color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200' }
      : { label: '✓ Safe to Spray', color: 'text-green-600', bg: 'bg-green-50 border-green-200' }
    : { label: '✗ Not Recommended', color: 'text-red-600', bg: 'bg-red-50 border-red-200' };

  // Best time suggestion
  const bestTime = weather.windSpeed < 10 && weather.humidity < 70
    ? 'Early morning (6–8 AM) or evening (5–7 PM)'
    : weather.windSpeed < 15
    ? 'Early morning only (6–8 AM) — low wind window'
    : 'Postpone — check again tomorrow morning';

  return (
    <div className="dj-card p-0 overflow-hidden">
      <div className="px-6 pt-6 pb-4 border-b border-black/10 flex items-center justify-between">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-0.5">Live Weather</p>
          <p className="text-lg font-black uppercase tracking-tighter">{city}</p>
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          className="p-2 border border-black/20 hover:border-black transition-all"
          title="Refresh weather"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="p-6 space-y-4">
        {/* Temperature */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-4xl font-black tracking-tighter">
              {loading ? '--' : `${weather.temp}°C`}
            </p>
            <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
              Feels like {loading ? '--' : `${weather.feels_like}°C`}
            </p>
          </div>
          <p className="text-sm font-black uppercase tracking-tighter text-zinc-500">
            {loading ? '...' : weather.condition}
          </p>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Wind, label: 'Wind', value: loading ? '--' : `${weather.windSpeed} km/h ${weather.wind_direction ?? ''}` },
            { icon: Droplets, label: 'Humidity', value: loading ? '--' : `${weather.humidity}%` },
            { icon: CloudRain, label: 'Rain Est.', value: loading ? '--' : `${weather.rainChance}%` },
            { icon: Eye, label: 'Visibility', value: loading ? '--' : `${(weather as any).visibility ?? '--'} km` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="p-3 bg-zinc-50 border border-black/10">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={10} className="text-zinc-400" />
                <p className="text-[7px] font-black uppercase tracking-widest text-zinc-400">{label}</p>
              </div>
              <p className="text-sm font-black tracking-tighter">{value}</p>
            </div>
          ))}
        </div>

        {/* Suitability badge */}
        <div className={cn('p-4 border rounded-none', suitability.bg)}>
          <p className={cn('text-sm font-black uppercase tracking-tighter', suitability.color)}>
            {suitability.label}
          </p>
          <p className="text-[8px] font-bold text-zinc-500 mt-1 leading-snug">
            Wind {loading ? '--' : weather.windSpeed} km/h ·{' '}
            {weather.suitable_for_spraying ? 'Conditions favorable' : 'Unfavorable for spraying'}
          </p>
        </div>

        {/* Best spray time */}
        <div className="p-4 bg-black text-white">
          <p className="text-[7px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-1.5">
            Suggested Spray Time
          </p>
          <p className="text-[10px] font-black uppercase tracking-tight leading-snug">
            {loading ? 'Calculating...' : bestTime}
          </p>
        </div>
      </div>
    </div>
  );
};

// ── Main BookServicePage ──────────────────────────────────────────────────────
export const BookServicePage = () => {
  const navigate = useNavigate();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState('');
  const [estimatedCost, setEstimatedCost] = useState(0);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    cropType: '',
    area: '',
    district: '',
    addressLine1: '',
    addressLine2: '',
    landmark: '',
    pincode: '',
  });

  // Compute live price
  const areaNum = parseFloat(formData.area);
  const livePrice = !isNaN(areaNum) && areaNum > 0 ? areaNum * PRICE_PER_ACRE : 0;

  const fullAddress = [
    formData.addressLine1,
    formData.addressLine2,
    formData.landmark,
    formData.district,
    formData.pincode ? `Tamil Nadu - ${formData.pincode}` : 'Tamil Nadu',
  ].filter(Boolean).join(', ');

  const set = (key: keyof typeof formData) => (
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setFormData(prev => ({ ...prev, [key]: e.target.value }))
  );

  const validateForm = () => {
    const { name, phone, cropType, area, district, addressLine1 } = formData;
    if (!name || !phone || !cropType || !area || !district || !addressLine1) {
      setError('Please fill in all required fields.');
      return false;
    }
    if (!/^\+?[\d\s-]{10,}$/.test(phone)) {
      setError('Please enter a valid phone number (10+ digits).');
      return false;
    }
    const areaVal = parseFloat(area);
    if (isNaN(areaVal) || areaVal <= 0) {
      setError('Please enter a valid land area greater than 0.');
      return false;
    }
    if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
      setError('Please enter a valid 6-digit PIN code.');
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
        location: fullAddress,
        crop_type: formData.cropType,
      });
      setBookingId(`AGR${String(res.request_id ?? res.id).padStart(4, '0')}`);
      setEstimatedCost(res.estimated_cost ?? livePrice);
      setIsSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Booking failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Success Screen ──────────────────────────────────────────────────────────
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
            <h2 className="text-4xl font-black uppercase tracking-tighter mb-3 leading-none">
              Mission <br /><span className="text-italics lowercase text-zinc-400">initialized.</span>
            </h2>
            <p className="text-base font-bold text-zinc-500 mb-10">
              Booking <span className="text-black underline underline-offset-4 decoration-brand-accent">{bookingId}</span> confirmed.
              Our team in <span className="text-black">Tamil Nadu</span> will contact you within 30 minutes.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-black mb-6 text-left">
              {[
                { label: 'Crop Type', value: formData.cropType, icon: Droplets },
                { label: 'Land Area', value: `${formData.area} Acres`, icon: Ruler },
                { label: 'Total Price', value: `₹${estimatedCost.toLocaleString('en-IN')}`, icon: ShieldCheck },
                { label: 'Rate', value: `₹${PRICE_PER_ACRE}/acre`, icon: Zap },
                { label: 'Farm Location', value: fullAddress, icon: MapPin, full: true },
              ].map((item, idx) => (
                <div
                  key={item.label}
                  className={cn(
                    'p-6 border-black',
                    (item as any).full ? 'md:col-span-2 border-t' : idx % 2 === 0 ? 'border-b md:border-r' : 'border-b',
                    idx % 2 === 1 ? 'bg-zinc-50' : 'bg-white'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <item.icon size={12} className="text-black" />
                    <p className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em]">{item.label}</p>
                  </div>
                  <p className="text-base font-black uppercase tracking-tighter">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="dj-button-filled h-14 px-10 text-base" onClick={() => navigate('/track')}>
                Track Live
              </button>
              <button className="dj-button-outline h-14 px-10 text-base" onClick={() => { setIsSubmitted(false); setFormData({ name:'',phone:'',cropType:'',area:'',district:'',addressLine1:'',addressLine2:'',landmark:'',pincode:'' }); }}>
                New Booking
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Booking Form ────────────────────────────────────────────────────────────
  return (
    <div className="w-full bg-white bg-grid min-h-screen relative">
      <div className="max-w-6xl mx-auto px-5 py-16 relative z-10">

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-[8px] font-black uppercase tracking-[0.3em] px-2 py-1 bg-black text-white">
              Tamil Nadu's #1 Drone Service
            </div>
            <div className="h-px flex-1 bg-black/10" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-3 tracking-tighter leading-none uppercase">
            Book a <br />
            <span className="text-italics lowercase text-zinc-400">mission.</span>
          </h1>
          <p className="text-base font-bold text-zinc-500 max-w-xl">
            Fill in your farm details and get an <span className="text-black">instant price</span>. ₹{PRICE_PER_ACRE} per acre — no hidden charges.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ── Form ── */}
          <div className="lg:col-span-7">
            <div className="dj-card p-6 md:p-8 relative overflow-hidden">
              <AnimatePresence>
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/95 backdrop-blur-sm z-30 flex items-center justify-center"
                  >
                    <div className="flex flex-col items-center gap-5">
                      <div className="w-16 h-16 border-4 border-black border-t-brand-accent animate-spin" />
                      <p className="text-lg font-black uppercase tracking-tighter">Calculating Flight Path...</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-300 text-red-700 flex items-center gap-3 text-sm font-bold">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                {/* Section: Farmer Info */}
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-4 flex items-center gap-2">
                    <User size={10} /> Farmer Details
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em]">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text" placeholder="YOUR FULL NAME" value={formData.name} onChange={set('name')}
                        className="w-full px-4 py-2.5 border border-black focus:outline-none focus:bg-zinc-50 font-black uppercase text-[9px] tracking-widest"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em]">
                        <Phone size={10} className="inline mr-1" />Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel" placeholder="+91 XXXXX XXXXX" value={formData.phone} onChange={set('phone')}
                        className="w-full px-4 py-2.5 border border-black focus:outline-none focus:bg-zinc-50 font-black uppercase text-[9px] tracking-widest"
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Crop & Land */}
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-4 flex items-center gap-2">
                    <Droplets size={10} /> Crop & Land Details
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Crop type dropdown */}
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em]">
                        Crop Type <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={formData.cropType} onChange={set('cropType')}
                          className="w-full px-4 py-2.5 border border-black focus:outline-none focus:bg-zinc-50 font-black uppercase text-[9px] tracking-widest appearance-none bg-white"
                        >
                          <option value="">SELECT CROP</option>
                          {CROP_TYPES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                        </select>
                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400" />
                      </div>
                    </div>

                    {/* Land size */}
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em]">
                        <Ruler size={10} className="inline mr-1" />Land Size (Acres) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number" step="0.5" min="0.5" placeholder="e.g. 2.5"
                        value={formData.area} onChange={set('area')}
                        className="w-full px-4 py-2.5 border border-black focus:outline-none focus:bg-zinc-50 font-black text-[9px] tracking-widest"
                      />
                    </div>
                  </div>

                  {/* Live price display */}
                  {livePrice > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 bg-brand-accent border border-black flex items-center justify-between"
                    >
                      <div>
                        <p className="text-[7px] font-black uppercase tracking-[0.3em] text-black/60">Estimated Price</p>
                        <p className="text-2xl font-black tracking-tighter">
                          ₹{livePrice.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[7px] font-black uppercase tracking-[0.3em] text-black/60">Rate</p>
                        <p className="text-sm font-black tracking-tighter">
                          ₹{PRICE_PER_ACRE} × {formData.area} acres
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Section: Farm Location */}
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-4 flex items-center gap-2">
                    <MapPin size={10} /> Farm Location (Tamil Nadu) <span className="text-red-500">*</span>
                  </p>
                  <div className="space-y-4">

                    {/* District */}
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em]">
                        District <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={formData.district} onChange={set('district')}
                          className="w-full px-4 py-2.5 border border-black focus:outline-none focus:bg-zinc-50 font-black uppercase text-[9px] tracking-widest appearance-none bg-white"
                        >
                          <option value="">SELECT DISTRICT</option>
                          {TN_DISTRICTS.map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
                        </select>
                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400" />
                      </div>
                    </div>

                    {/* Address Line 1 */}
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em]">
                        Address Line 1 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text" placeholder="VILLAGE / STREET / SURVEY NO."
                        value={formData.addressLine1} onChange={set('addressLine1')}
                        className="w-full px-4 py-2.5 border border-black focus:outline-none focus:bg-zinc-50 font-black uppercase text-[9px] tracking-widest"
                      />
                    </div>

                    {/* Address Line 2 */}
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em]">
                        Address Line 2 (Optional)
                      </label>
                      <input
                        type="text" placeholder="TALUK / BLOCK / MANDAL"
                        value={formData.addressLine2} onChange={set('addressLine2')}
                        className="w-full px-4 py-2.5 border border-black focus:outline-none focus:bg-zinc-50 font-black uppercase text-[9px] tracking-widest"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Landmark */}
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em]">
                          Landmark (Optional)
                        </label>
                        <input
                          type="text" placeholder="NEAR SCHOOL / TEMPLE..."
                          value={formData.landmark} onChange={set('landmark')}
                          className="w-full px-4 py-2.5 border border-black focus:outline-none focus:bg-zinc-50 font-black uppercase text-[9px] tracking-widest"
                        />
                      </div>

                      {/* Pincode */}
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.3em]">
                          PIN Code (Optional)
                        </label>
                        <input
                          type="text" maxLength={6} placeholder="6-DIGIT PIN"
                          value={formData.pincode} onChange={set('pincode')}
                          className="w-full px-4 py-2.5 border border-black focus:outline-none focus:bg-zinc-50 font-black text-[9px] tracking-widest"
                        />
                      </div>
                    </div>

                    {/* Address preview */}
                    {fullAddress && (
                      <div className="p-3 bg-zinc-50 border border-black/20">
                        <p className="text-[7px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-1">Address Preview</p>
                        <p className="text-[9px] font-bold text-zinc-600">{fullAddress}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit */}
                <div className="pt-2">
                  <button type="submit" disabled={isLoading} className="dj-button-filled w-full h-14 text-base disabled:opacity-50">
                    {livePrice > 0
                      ? `Book Now — ₹${livePrice.toLocaleString('en-IN')}`
                      : 'Initialize Mission'}
                  </button>
                  <p className="text-[8px] font-bold text-zinc-400 text-center mt-3">
                    Final price confirmed after farm coordinate verification · No advance payment required
                  </p>
                </div>
              </form>
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className="lg:col-span-5 space-y-6">
            {/* Live weather for selected district */}
            <WeatherWidget district={formData.district} />

            {/* Safety notice */}
            <div className="p-6 bg-brand-accent border border-black flex gap-4">
              <AlertCircle className="text-black flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-1.5">Pricing Notice</p>
                <p className="text-xs font-black uppercase tracking-tighter leading-tight">
                  ₹{PRICE_PER_ACRE} per acre · GST included · No hidden charges.
                  Final mission parameters confirmed by our flight controllers after location verification.
                </p>
              </div>
            </div>

            {/* Mission protocol */}
            <div className="dj-card bg-black text-white p-8">
              <h4 className="text-xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3">
                <ShieldCheck className="text-brand-accent" size={20} /> Mission Protocol
              </h4>
              <ul className="space-y-6">
                {[
                  { title: '90% Efficiency', desc: 'Optimised flight paths reduce time and resource consumption.', icon: Zap },
                  { title: 'Precision Spray', desc: 'Ultra-fine droplet control reduces chemical usage by 30%.', icon: Droplets },
                  { title: 'Zero Contact', desc: 'Fully autonomous deployment ensures operator safety.', icon: ShieldCheck },
                ].map((item) => (
                  <li key={item.title} className="flex gap-5">
                    <div className="w-10 h-10 border border-white/20 flex-shrink-0 flex items-center justify-center text-brand-accent">
                      <item.icon size={18} />
                    </div>
                    <div>
                      <p className="font-black uppercase tracking-tighter text-base mb-1">{item.title}</p>
                      <p className="text-xs font-bold text-zinc-400 leading-tight">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

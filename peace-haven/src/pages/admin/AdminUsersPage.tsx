import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, Search,
  MoreVertical, MapPin,
  ShieldCheck, User, Download,
  CheckCircle2, Clock, TrendingUp, X
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { fetchFarmers, type BackendFarmer } from '../../lib/api';

type Farmer = BackendFarmer;

export const AdminUsersPage = () => {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Farmer | null>(null);

  useEffect(() => {
    fetchFarmers()
      .then(data => setFarmers(data as any[]))
      .catch(() => setFarmers([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = farmers.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.phone.includes(search) ||
    (f.location || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalOrders = farmers.reduce((s, f) => s + f.total_services, 0);
  const totalArea = farmers.reduce((s, f) => s + f.total_area_hectares, 0);

  const handleExport = () => {
    const rows = [
      ['Name','Phone','Location','Total Services','Total Area (ha)','Total Spent (₹)','Joined'],
      ...filtered.map(f => [f.name, f.phone, f.location, f.total_services, f.total_area_hectares.toFixed(1), f.total_spent, f.joined?.split('T')[0] || '']),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `farmers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div>
          <h1 className="text-4xl font-extrabold uppercase tracking-tight mb-2.5">
            Farmers <span className="italic lowercase text-zinc-400">directory.</span>
          </h1>
          <p className="text-base font-bold text-zinc-500">
            Registered farmers and their service history across <span className="text-black underline underline-offset-8 decoration-brand-accent decoration-2">Tamil Nadu</span>.
          </p>
        </div>
        <div className="flex gap-0 border border-black">
          <button onClick={handleExport} className="px-6 py-3 text-[8px] font-bold uppercase tracking-[0.3em] bg-white text-black hover:bg-brand-accent transition-all border-r border-black flex items-center gap-2">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-black">
        {[
          { label: 'Total Farmers', value: farmers.length.toLocaleString(), icon: <Users size={18} />, color: 'bg-black text-white hover:bg-brand-accent hover:text-black' },
          { label: 'Total Services', value: totalOrders.toLocaleString(), icon: <ShieldCheck size={18} />, color: 'bg-brand-accent text-black hover:bg-black hover:text-white' },
          { label: 'Area Covered', value: `${totalArea.toFixed(0)} ha`, icon: <User size={18} />, color: 'bg-zinc-50 text-black hover:bg-black hover:text-white' },
          { label: 'Avg Orders/Farmer', value: farmers.length ? (totalOrders / farmers.length).toFixed(1) : '0', icon: <TrendingUp size={18} />, color: 'bg-white text-black hover:bg-brand-accent hover:text-black' },
        ].map((stat, i) => (
          <div key={i} className={cn('p-8 border-black flex flex-col justify-between min-h-[150px] transition-colors duration-300 cursor-default', i !== 3 && 'lg:border-r border-b lg:border-b-0', stat.color)}>
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 border border-current flex items-center justify-center">{stat.icon}</div>
            </div>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.4em] mb-1.5 opacity-70">{stat.label}</p>
              <h3 className="text-3xl font-extrabold uppercase tracking-tight leading-none">{loading ? '...' : stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="border border-black bg-white overflow-hidden">
        <div className="p-8 border-b border-black flex flex-col md:flex-row md:items-center justify-between gap-8 bg-zinc-50">
          <div className="relative flex-1 max-w-lg border border-black group bg-white">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-black" size={18} />
            <input
              type="text"
              placeholder="Search by name, phone, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-transparent focus:outline-none font-bold text-[10px] uppercase tracking-[0.2em] placeholder:text-zinc-300"
            />
          </div>
          <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">
            {filtered.length} of {farmers.length} farmers
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black text-white">
                <th className="px-8 py-5 text-[8px] font-bold uppercase tracking-[0.4em] border-r border-white/10">Farmer</th>
                <th className="px-8 py-5 text-[8px] font-bold uppercase tracking-[0.4em] border-r border-white/10">Location</th>
                <th className="px-8 py-5 text-[8px] font-bold uppercase tracking-[0.4em] border-r border-white/10">Services</th>
                <th className="px-8 py-5 text-[8px] font-bold uppercase tracking-[0.4em] border-r border-white/10">Area (ha)</th>
                <th className="px-8 py-5 text-[8px] font-bold uppercase tracking-[0.4em] border-r border-white/10">Revenue (₹)</th>
                <th className="px-8 py-5 text-[8px] font-bold uppercase tracking-[0.4em]">Last Service</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {loading ? (
                <tr><td colSpan={6} className="px-8 py-12 text-center text-zinc-400 font-bold">Loading farmers...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-12 text-center text-zinc-400 font-bold">No farmers found.</td></tr>
              ) : filtered.map((farmer) => (
                <tr key={farmer.id} onClick={() => setSelected(farmer)} className="hover:bg-brand-accent/10 transition-colors group cursor-pointer">
                  <td className="px-8 py-6 border-r border-black/5">
                    <div className="flex items-center gap-5">
                      <div className="w-10 h-10 border border-black flex items-center justify-center text-black font-bold text-lg bg-white group-hover:bg-black group-hover:text-white transition-all">
                        {farmer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-base font-extrabold uppercase tracking-tight leading-none mb-1">{farmer.name}</p>
                        <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.2em]">{farmer.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 border-r border-black/5">
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="text-zinc-400" />
                      <span className="text-sm font-bold uppercase tracking-tight">{farmer.location}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 border-r border-black/5">
                    <span className="text-xl font-extrabold">{farmer.total_services}</span>
                  </td>
                  <td className="px-8 py-6 border-r border-black/5 font-bold">{farmer.total_area_hectares.toFixed(1)}</td>
                  <td className="px-8 py-6 border-r border-black/5 font-bold">₹{farmer.total_spent.toLocaleString()}</td>
                  <td className="px-8 py-6 text-[8px] font-bold text-zinc-400 uppercase tracking-widest">
                    {farmer.last_service ? farmer.last_service.split('T')[0] : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-black w-full max-w-md overflow-hidden">
            <div className="p-8 border-b border-black flex justify-between items-center bg-zinc-50">
              <h3 className="text-2xl font-extrabold uppercase tracking-tight">Farmer <span className="text-italics lowercase text-zinc-400">profile.</span></h3>
              <button onClick={() => setSelected(null)} className="w-10 h-10 border border-black flex items-center justify-center hover:bg-black hover:text-white transition-all"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              {[
                ['Name', selected.name],
                ['Phone', selected.phone],
                ['Location', selected.location],
                ['Total Services', selected.total_services],
                ['Total Area', `${selected.total_area_hectares.toFixed(1)} ha`],
                ['Total Revenue', `₹${selected.total_spent.toLocaleString()}`],
                ['Joined', selected.joined?.split('T')[0] || '—'],
                ['Last Service', selected.last_service?.split('T')[0] || '—'],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between items-start border-b border-black/5 pb-3">
                  <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{label}</p>
                  <p className="text-sm font-extrabold uppercase tracking-tight">{value}</p>
                </div>
              ))}
            </div>
            <div className="p-8 bg-zinc-50 border-t border-black">
              <button onClick={() => setSelected(null)} className="dj-button-filled w-full h-12">Close</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

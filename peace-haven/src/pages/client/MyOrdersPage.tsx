import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, ChevronRight, Sprout, MapPin, Calendar,
  ClipboardList, X, Phone, Plane, Link as LinkIcon
} from 'lucide-react';
import { Badge } from '../../components/shared/UI';
import { useOrders } from '../../hooks/useApi';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';
import type { Order } from '../../types';

const getStatusVariant = (status: string): 'success' | 'info' | 'warning' | 'active' => {
  switch (status) {
    case 'Completed':   return 'success';
    case 'In Progress': return 'active';
    case 'Scheduled':   return 'warning';
    default:            return 'info';
  }
};

export const MyOrdersPage = () => {
  const { data: orders, loading } = useOrders();
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch]             = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filtered = orders.filter(o => {
    const matchStatus = filterStatus === 'All' || o.status === filterStatus;
    const matchSearch = !search ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      (o.location || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="relative min-h-screen bg-white bg-grid">
      <div className="max-w-5xl mx-auto px-5 py-10 md:py-12 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5 mb-10">
          <div>
            <div className="inline-block px-2.5 py-1 bg-black text-white text-[8px] font-black uppercase tracking-[0.3em] mb-5">Order History</div>
            <h1 className="text-4xl md:text-5xl font-black mb-3 tracking-tighter uppercase">
              My <br /><span className="text-italics lowercase text-zinc-400">orders.</span>
            </h1>
            <p className="text-base font-bold text-zinc-500">History of your drone spray services in <span className="text-black">Tamil Nadu</span>.</p>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto">
            <div className="relative border border-black bg-white">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" size={16} />
              <input
                type="text"
                placeholder="Search orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-transparent focus:outline-none font-bold text-[10px] uppercase tracking-widest placeholder:text-zinc-200 text-black"
              />
            </div>
            <div className="flex items-center gap-0 border border-black bg-white overflow-x-auto no-scrollbar">
              {['All', 'Placed', 'Scheduled', 'In Progress', 'Completed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={cn(
                    'px-5 py-2.5 font-black text-[8px] uppercase tracking-widest transition-all whitespace-nowrap border-r border-black last:border-r-0',
                    filterStatus === status ? 'bg-black text-white' : 'text-zinc-400 hover:bg-zinc-50 hover:text-black'
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="border border-black p-16 text-center text-zinc-400 font-bold">Loading your orders...</div>
        ) : (
          <div className="space-y-0 border border-black divide-y divide-black">
            <AnimatePresence mode="popLayout">
              {filtered.map((order) => (
                <motion.div key={order.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div
                    className="p-5 md:p-6 hover:bg-zinc-50 transition-all cursor-pointer group relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-8 flex-1">
                      <div className="w-24">
                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">Booking ID</p>
                        <p className="text-sm font-black text-black">{order.id}</p>
                      </div>
                      <div className="flex items-center gap-2.5 w-36">
                        {/* FIX: was bg-brand-accent (dark green) with no explicit text color = unreadable
                            Now: bg-black with white icon = always readable */}
                        <div className="w-8 h-8 border border-black flex items-center justify-center bg-black text-white">
                          <Sprout size={16} />
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.2em]">Pesticide</p>
                          <p className="text-sm font-black uppercase tracking-tight text-black">{order.cropType}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 w-36">
                        <div className="w-8 h-8 border border-black flex items-center justify-center">
                          <MapPin size={16} className="text-black" />
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.2em]">Area</p>
                          <p className="text-sm font-black uppercase tracking-tight text-black">{order.area}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1.5">Status</p>
                        <Badge variant={getStatusVariant(order.status)} className="border border-black">{order.status}</Badge>
                      </div>
                    </div>
                    <div className="w-8 h-8 border border-black flex items-center justify-center text-black group-hover:bg-black group-hover:text-white transition-all">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20 border border-black bg-zinc-50">
            <div className="w-16 h-16 border border-black flex items-center justify-center mx-auto mb-6 text-zinc-300">
              <ClipboardList size={32} />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-1.5 text-black">No orders found</h3>
            <p className="text-sm text-zinc-500 font-bold mb-6">Try changing your filter or book a new service.</p>
            <Link to="/book"><button className="dj-button-filled px-8 py-2.5">Book Your First Spray</button></Link>
          </div>
        )}
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-black w-full max-w-lg overflow-hidden relative z-10"
            >
              <div className="p-6 md:p-8">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <Badge variant={getStatusVariant(selectedOrder.status)} className="mb-3 border border-black">{selectedOrder.status}</Badge>
                    <h2 className="text-3xl font-black tracking-tighter uppercase text-black">{selectedOrder.id}</h2>
                    <p className="text-sm text-zinc-500 font-bold">Booked: {selectedOrder.date || '—'}</p>
                  </div>
                  <button onClick={() => setSelectedOrder(null)} className="w-8 h-8 border border-black flex items-center justify-center hover:bg-black hover:text-white transition-all">
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">
                  {[
                    ['Customer',        selectedOrder.customerName],
                    ['Phone',           selectedOrder.phone || '—'],
                    ['Pesticide / Crop',selectedOrder.cropType],
                    ['Land Area',       selectedOrder.area],
                    ['Location',        selectedOrder.location],
                    ['Scheduled Date',  selectedOrder.date || '—'],
                    ['Scheduled Time',  selectedOrder.scheduledTime || '—'],
                    ['Assigned Drone',  selectedOrder.droneId || 'Not Assigned'],
                  ].map(([label, value]) => (
                    <div key={label} className="space-y-1">
                      <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">{label}</p>
                      <p className="text-base font-black uppercase tracking-tight text-black">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setSelectedOrder(null)} className="dj-button-filled flex-1 py-3 text-base">Close</button>
                  <Link to="/track" className="flex-1">
                    <button className="dj-button-outline w-full py-3 text-base flex items-center justify-center gap-2">
                      <LinkIcon size={14} /> Track Order
                    </button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Plus, MoreVertical, X, Edit, MapPin, Drone as DroneIcon, Download } from 'lucide-react';
import { useAdminOrders, updateOrderStatus } from '../../hooks/useApi';
import { cn } from '../../lib/utils';

const STATUS_VALUES = ['pending','scheduled','in_progress','completed'];
const STATUS_LABELS = ['Placed','Scheduled','In Progress','Completed'];

export const AdminOrdersPage = () => {
  const { data: orders, refetch } = useAdminOrders();
  const MOCK_ORDERS = orders;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editDrone, setEditDrone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const filteredOrders = MOCK_ORDERS.filter(order => {
    const matchesSearch =
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.location || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openOrder = (order: any) => {
    setSelectedOrder(order);
    const be = STATUS_VALUES[STATUS_LABELS.indexOf(order.status)] ?? 'pending';
    setEditStatus(be);
    setEditDrone(order.droneId || '');
    setSaveMsg('');
  };

  const handleUpdate = async () => {
    if (!selectedOrder) return;
    setSaving(true);
    try {
      const numId = parseInt(selectedOrder.id.replace(/\D/g, ''), 10);
      await updateOrderStatus(numId, editStatus, editDrone || undefined);
      setSaveMsg('Order updated successfully.');
      await refetch();
      setTimeout(() => setSelectedOrder(null), 800);
    } catch (e: any) {
      setSaveMsg(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const rows = [
      ['Order ID','Customer','Phone','Location','Area','Crop/Pesticide','Status','Date'],
      ...filteredOrders.map(o => [o.id, o.customerName, o.phone, o.location, o.area, o.cropType, o.status, o.date])
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div>
          <h1 className="text-4xl font-extrabold uppercase tracking-tight mb-2.5">Orders</h1>
          <p className="text-base font-bold text-zinc-500">Manage, assign, and track all <span className="text-black underline underline-offset-4 decoration-brand-accent decoration-2">customer bookings</span> in Tamil Nadu.</p>
        </div>
        <div className="flex gap-2.5">
          <button onClick={handleExport} className="dj-button-outline py-2 px-5 text-[10px] flex items-center gap-2">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="border border-black bg-white overflow-hidden">
        <div className="p-6 border-b border-black flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-zinc-50">
          <div className="relative flex-1 max-w-lg border border-black group bg-white">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-black transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search by order ID, customer, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-transparent focus:outline-none font-bold text-[10px] uppercase tracking-[0.2em] placeholder:text-zinc-300"
            />
          </div>
          <div className="flex flex-wrap items-center gap-0 border border-black bg-white">
            {['All', 'Placed', 'Scheduled', 'In Progress', 'Completed'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  'px-5 py-3 text-[8px] font-bold uppercase tracking-[0.3em] transition-all border-black first:border-0 border-l',
                  statusFilter === status ? 'bg-black text-white' : 'bg-white text-zinc-400 hover:text-black hover:bg-zinc-50'
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black text-white">
                <th className="px-8 py-5 text-[8px] font-bold uppercase tracking-[0.4em] border-r border-white/10">Order Details</th>
                <th className="px-8 py-5 text-[8px] font-bold uppercase tracking-[0.4em] border-r border-white/10">Service Info</th>
                <th className="px-8 py-5 text-[8px] font-bold uppercase tracking-[0.4em] border-r border-white/10">Drone</th>
                <th className="px-8 py-5 text-[8px] font-bold uppercase tracking-[0.4em] border-r border-white/10">Status</th>
                <th className="px-8 py-5 text-[8px] font-bold uppercase tracking-[0.4em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {filteredOrders.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-12 text-center text-zinc-400 font-bold">No orders found.</td></tr>
              ) : filteredOrders.map((order) => (
                <tr key={order.id} className="group hover:bg-zinc-50 transition-all cursor-pointer" onClick={() => openOrder(order)}>
                  <td className="px-8 py-6 border-r border-black/5">
                    <div className="flex items-center gap-5">
                      <div className="w-10 h-10 border border-black flex items-center justify-center text-black font-bold text-base group-hover:bg-brand-accent group-hover:text-white transition-all duration-500">
                        {order.id.slice(-2)}
                      </div>
                      <div>
                        <p className="text-lg font-extrabold uppercase tracking-tight text-black leading-none mb-1">{order.customerName}</p>
                        <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-[0.2em]">{order.id}</p>
                        {order.phone && <p className="text-[8px] text-zinc-300 font-bold">{order.phone}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 border-r border-black/5">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-tight text-zinc-600">
                        <MapPin size={14} className="text-zinc-400" />{order.location}
                      </div>
                      <div className="text-[8px] text-zinc-400 font-bold uppercase tracking-[0.2em]">
                        {order.cropType} • {order.area}
                      </div>
                      {order.date && <div className="text-[8px] text-zinc-300 font-bold">{order.date}</div>}
                    </div>
                  </td>
                  <td className="px-8 py-6 border-r border-black/5">
                    {order.droneId ? (
                      <div className="flex items-center gap-2.5 px-3 py-1.5 border border-black bg-white w-fit group-hover:bg-black group-hover:text-white transition-colors">
                        <DroneIcon size={14} />
                        <span className="text-[8px] font-bold uppercase tracking-[0.2em]">{order.droneId}</span>
                      </div>
                    ) : (
                      <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Unassigned</span>
                    )}
                  </td>
                  <td className="px-8 py-6 border-r border-black/5">
                    <span className={cn(
                      'text-[8px] font-bold uppercase tracking-widest px-3 py-1.5 border border-black',
                      order.status === 'Completed' ? 'bg-brand-accent text-white' :
                      order.status === 'In Progress' ? 'bg-black text-white' : 'bg-white text-black'
                    )}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); openOrder(order); }} className="w-8 h-8 border border-black flex items-center justify-center hover:bg-black hover:text-white transition-all">
                        <Edit size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-black flex items-center justify-between bg-zinc-50">
          <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-[0.3em]">
            Showing {filteredOrders.length} of {MOCK_ORDERS.length} orders
          </p>
        </div>
      </div>

      {/* Order Detail/Edit Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-black w-full max-w-xl overflow-hidden"
          >
            <div className="p-8 border-b border-black flex justify-between items-center bg-zinc-50">
              <div>
                <h3 className="text-3xl font-extrabold uppercase tracking-tight leading-none">Order <span className="text-italics lowercase text-zinc-400">details.</span></h3>
                <p className="text-zinc-400 font-bold uppercase tracking-widest text-[8px] mt-2.5">{selectedOrder.id}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="w-10 h-10 border border-black flex items-center justify-center hover:bg-black hover:text-white transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                {[
                  ['Customer', selectedOrder.customerName],
                  ['Phone', selectedOrder.phone || '—'],
                  ['Location', selectedOrder.location],
                  ['Area', selectedOrder.area],
                  ['Pesticide / Crop', selectedOrder.cropType],
                  ['Date', selectedOrder.date || '—'],
                ].map(([label, val]) => (
                  <div key={label} className="space-y-1">
                    <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.3em]">{label}</p>
                    <p className="text-base font-extrabold uppercase tracking-tight text-black">{val}</p>
                  </div>
                ))}
              </div>

              <div className="p-6 border border-black bg-zinc-50 space-y-6">
                <h4 className="text-[9px] font-bold uppercase tracking-widest text-black">Update Assignment</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Job Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-black focus:outline-none font-bold text-[9px] uppercase tracking-widest appearance-none cursor-pointer"
                    >
                      {STATUS_VALUES.map((v, i) => (
                        <option key={v} value={v}>{STATUS_LABELS[i]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Assigned Drone ID</label>
                    <input
                      type="text"
                      value={editDrone}
                      onChange={(e) => setEditDrone(e.target.value)}
                      placeholder="e.g. AGD-001"
                      className="w-full px-4 py-3 bg-white border border-black focus:outline-none font-bold text-[9px] uppercase tracking-widest"
                    />
                  </div>
                </div>
                {saveMsg && (
                  <p className={cn('text-[9px] font-bold uppercase tracking-widest', saveMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600')}>
                    {saveMsg}
                  </p>
                )}
              </div>
            </div>
            <div className="p-8 bg-zinc-50 flex gap-3 border-t border-black">
              <button onClick={handleUpdate} disabled={saving} className="dj-button-filled flex-1 h-14 text-base disabled:opacity-50">
                {saving ? 'Saving...' : 'Update Order'}
              </button>
              <button onClick={() => setSelectedOrder(null)} className="dj-button-outline flex-1 h-14 text-base">Cancel</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ChevronLeft, ChevronRight, Plus, X, CheckCircle2,
  Drone as DroneIcon, Clock,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useScheduledJobs, usePendingOrders, useAvailableDrones } from '../../hooks/useApi';
import { createJob } from '../../lib/api';

const HOUR_HEIGHT = 80;
const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7 AM – 6 PM

function todayISO() {
  return new Date().toISOString().split('T')[0];
}
function parseHour(iso: string | null) {
  if (!iso) return 8;
  try { return new Date(iso).getHours(); } catch { return 8; }
}
function fmtTime(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

export const AdminSchedulingPage = () => {
  const { data: jobs, refetch: refetchJobs } = useScheduledJobs();
  const { data: pendingOrders } = usePendingOrders();
  const { data: availDrones } = useAvailableDrones();

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const [form, setForm] = useState({
    order_id: '',        // numeric string like "1"
    drone_id_str: '',
    pilot_name: '',
    title: '',
    date: todayISO(),
    start_time: '08:00',
    end_time: '10:00',
    notes: '',
  });

  // Jobs for the selected date — backend returns start/end (not start_time/end_time)
  const todaysJobs = (jobs as any[]).filter(j => {
    try { return new Date(j.start).toISOString().split('T')[0] === selectedDate; }
    catch { return false; }
  });

  const openNewModal = (prefillOrderId = '') => {
    setForm({
      order_id: prefillOrderId,
      drone_id_str: '',
      pilot_name: '',
      title: prefillOrderId ? `Order ${prefillOrderId}` : '',
      date: selectedDate,
      start_time: '08:00',
      end_time: '10:00',
      notes: '',
    });
    setSaveMsg('');
    setShowModal(true);
  };

  const handleDroneSelect = (droneId: string) => {
    const drone = availDrones.find(d => d.id === droneId);
    setForm(f => ({
      ...f,
      drone_id_str: droneId,
      pilot_name: drone ? (drone as any).pilot_name || '' : f.pilot_name,
    }));
  };

  const handleOrderSelect = (orderId: string) => {
    const order = pendingOrders.find(o => o.id === orderId);
    setForm(f => ({
      ...f,
      order_id: orderId,
      title: order ? `${order.customerName} – ${order.area}` : f.title,
    }));
  };

  const handleSave = async () => {
    if (!form.drone_id_str) { setSaveMsg('Please select a drone.'); return; }
    if (!form.title.trim()) { setSaveMsg('Please enter a title.'); return; }
    setSaving(true);
    setSaveMsg('');
    try {
      const scheduledStart = `${form.date}T${form.start_time}:00`;
      const scheduledEnd   = `${form.date}T${form.end_time}:00`;

      // Build payload matching backend JobCreate model exactly
      const payload: any = {
        drone_id_str:    form.drone_id_str,
        pilot_name:      form.pilot_name || 'TBD',
        title:           form.title.trim() || 'Spray Mission',
        scheduled_start: scheduledStart,
        scheduled_end:   scheduledEnd,
        notes:           form.notes,
      };

      // Link to service request if an order was selected
      if (form.order_id) {
        const numId = parseInt(form.order_id.replace(/\D/g, ''), 10);
        if (!isNaN(numId) && numId > 0) {
          payload.service_request_id = numId;
        }
      }

      await createJob(payload);
      setSaveMsg('Job scheduled!');
      await refetchJobs();
      setTimeout(() => setShowModal(false), 600);
    } catch (e: any) {
      setSaveMsg(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const daysInMonth = new Date(currentMonth.year, currentMonth.month + 1, 0).getDate();
  const firstDay    = new Date(currentMonth.year, currentMonth.month, 1).getDay();
  const monthName   = new Date(currentMonth.year, currentMonth.month)
    .toLocaleString('en-IN', { month: 'long' });

  const prevMonth = () => setCurrentMonth(m => {
    const d = new Date(m.year, m.month - 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const nextMonth = () => setCurrentMonth(m => {
    const d = new Date(m.year, m.month + 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div>
          <h1 className="text-4xl font-extrabold uppercase tracking-tight mb-2.5">
            Schedule <span className="text-italics lowercase text-zinc-400">coordinator.</span>
          </h1>
          <p className="text-base font-bold text-zinc-500">
            Coordinate drone deployments and{' '}
            <span className="text-black underline underline-offset-8 decoration-brand-accent decoration-4">service times</span>{' '}
            in Tamil Nadu.
          </p>
        </div>
        <button
          onClick={() => openNewModal()}
          className="px-6 py-3 text-[8px] font-bold uppercase tracking-[0.3em] bg-black text-white hover:bg-brand-accent transition-all flex items-center gap-2.5 border-2 border-black"
        >
          <Plus size={14} /> New Schedule
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left sidebar */}
        <div className="lg:col-span-4 space-y-8">
          {/* Calendar */}
          <div className="border-2 border-black p-8 bg-white">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-extrabold uppercase tracking-tight">
                {monthName} <span className="text-italics lowercase text-zinc-400">{currentMonth.year}.</span>
              </h3>
              <div className="flex gap-0 border-2 border-black">
                <button onClick={prevMonth} className="p-2.5 hover:bg-brand-accent hover:text-white transition-all border-r-2 border-black">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={nextMonth} className="p-2.5 hover:bg-brand-accent hover:text-white transition-all">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-0 border-2 border-black">
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <div key={i} className="py-2 text-[8px] font-bold text-zinc-400 uppercase border-r-2 border-b-2 border-black last:border-r-0 bg-zinc-50 flex items-center justify-center">{d}</div>
              ))}
              {Array.from({ length: firstDay }, (_, i) => (
                <div key={`e${i}`} className="aspect-square border-r-2 border-b-2 border-black bg-zinc-50" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const iso = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const hasJob = (jobs as any[]).some(j => {
                  try { return new Date(j.start).toISOString().split('T')[0] === iso; }
                  catch { return false; }
                });
                const isSelected = iso === selectedDate;
                return (
                  <button key={day} onClick={() => setSelectedDate(iso)}
                    className={cn('aspect-square text-[10px] font-bold flex items-center justify-center transition-all border-r-2 border-b-2 border-black relative',
                      isSelected ? 'bg-brand-accent text-white' : 'hover:bg-brand-accent hover:text-white'
                    )}>
                    {day}
                    {hasJob && !isSelected && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-brand-accent rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Available drones */}
          <div className="border-2 border-black p-8 bg-black text-white">
            <h3 className="text-xl font-extrabold uppercase tracking-tight mb-6">
              Fleet <span className="text-italics lowercase text-brand-accent">availability.</span>
            </h3>
            <div className="space-y-0 border border-white/10">
              {availDrones.length === 0 ? (
                <p className="p-5 text-zinc-500 font-bold text-sm">No drones available.</p>
              ) : availDrones.map((drone, i) => (
                <div key={drone.id} className={cn('flex items-center justify-between p-5 hover:bg-white/10 transition-colors', i !== availDrones.length - 1 && 'border-b border-white/10')}>
                  <div className="flex items-center gap-4">
                    <div className={cn('w-3 h-3', (drone as any).is_available ? 'bg-brand-accent' : 'bg-orange-500')} />
                    <span className="text-base font-bold uppercase tracking-tight">{drone.id}</span>
                  </div>
                  <span className="text-[8px] font-bold uppercase tracking-[0.3em] opacity-40">
                    {(drone as any).is_available ? 'Free' : 'Busy'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pending orders */}
          <div className="border-2 border-black p-8 bg-white">
            <h3 className="text-xl font-extrabold uppercase tracking-tight mb-6">
              Pending <span className="text-italics lowercase text-zinc-400">orders.</span>
            </h3>
            <div className="space-y-0 border border-black">
              {pendingOrders.length === 0 ? (
                <div className="p-5 flex items-center gap-3 text-zinc-400">
                  <CheckCircle2 size={16} className="text-brand-accent" />
                  <p className="font-bold text-sm">All orders scheduled!</p>
                </div>
              ) : pendingOrders.slice(0, 6).map((order, i) => (
                <div
                  key={order.id}
                  className={cn('p-5 hover:bg-zinc-50 transition-colors cursor-pointer group', i !== pendingOrders.length - 1 && 'border-b border-black')}
                  onClick={() => openNewModal(order.id)}
                >
                  <p className="font-extrabold uppercase tracking-tight text-sm leading-none mb-1 group-hover:text-brand-accent transition-colors">
                    {order.customerName}
                  </p>
                  <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">
                    {order.id} · {order.area}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="lg:col-span-8">
          <div className="border-2 border-black p-8 bg-white">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 border-2 border-black flex flex-col items-center justify-center bg-brand-accent text-white">
                  <span className="text-[8px] font-bold uppercase tracking-[0.3em]">
                    {new Date(selectedDate + 'T12:00:00').toLocaleString('en-IN', { weekday: 'short' })}
                  </span>
                  <span className="text-2xl font-extrabold leading-none">
                    {new Date(selectedDate + 'T12:00:00').getDate()}
                  </span>
                </div>
                <div>
                  <h3 className="text-3xl font-extrabold uppercase tracking-tight">
                    Daily <span className="text-italics lowercase text-zinc-400">timeline.</span>
                  </h3>
                  <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.4em] mt-1">
                    {todaysJobs.length} Job{todaysJobs.length !== 1 ? 's' : ''} Scheduled
                  </p>
                </div>
              </div>
            </div>

            <div className="relative border-t-2 border-black pt-8">
              {/* Hour grid */}
              <div className="space-y-20">
                {HOURS.map(hour => (
                  <div key={hour} className="flex items-center gap-8 group">
                    <span className="w-20 text-[8px] font-black text-zinc-300 uppercase tracking-[0.3em] group-hover:text-black transition-colors">
                      {hour > 12 ? hour - 12 : hour}:00 {hour >= 12 ? 'PM' : 'AM'}
                    </span>
                    <div className="flex-1 h-px bg-zinc-100 group-hover:bg-black transition-colors" />
                  </div>
                ))}
              </div>

              {/* Job blocks — use j.start / j.end */}
              <div className="absolute top-8 left-28 right-0 bottom-0 pointer-events-none">
                {todaysJobs.map((job: any) => {
                  const startH = parseHour(job.start);
                  const endH   = parseHour(job.end);
                  const top    = (startH - 7) * (HOUR_HEIGHT + 1);
                  const height = Math.max((endH - startH) * (HOUR_HEIGHT + 1) - 10, 50);
                  return (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="absolute left-5 right-8 bg-white border-2 border-black p-5 pointer-events-auto cursor-default group hover:bg-black hover:text-white transition-all duration-300"
                      style={{ top: `${top}px`, height: `${height}px` }}
                    >
                      <p className="text-[8px] font-bold text-brand-accent uppercase tracking-[0.3em] mb-1 group-hover:text-brand-accent">{job.title}</p>
                      <p className="text-base font-extrabold uppercase tracking-tight leading-none">{job.drone_id}</p>
                      <p className="text-[8px] font-bold text-zinc-400 group-hover:text-zinc-300 mt-1">
                        {fmtTime(job.start)} – {fmtTime(job.end)}
                        {job.pilot_name && ` · ${job.pilot_name}`}
                      </p>
                    </motion.div>
                  );
                })}
                {todaysJobs.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                    <div className="text-center">
                      <p className="text-zinc-300 font-bold text-sm uppercase tracking-widest">No jobs on this date</p>
                      <button onClick={() => openNewModal()} className="mt-4 dj-button-filled text-xs px-6 py-2">
                        + Schedule One
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white border-2 border-black w-full max-w-lg overflow-hidden"
          >
            <div className="p-8 border-b-2 border-black flex justify-between items-center bg-zinc-50">
              <h3 className="text-2xl font-extrabold uppercase tracking-tight">
                New <span className="text-italics lowercase text-zinc-400">schedule.</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="w-10 h-10 border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-5">
              {/* Link to order (optional) */}
              <div className="space-y-2">
                <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.4em]">
                  Link to Pending Order (optional)
                </label>
                <select
                  value={form.order_id}
                  onChange={e => handleOrderSelect(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-black focus:outline-none font-bold text-[10px] uppercase tracking-[0.2em] appearance-none cursor-pointer"
                >
                  <option value="">-- None / Manual Entry --</option>
                  {pendingOrders.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.id} · {o.customerName} · {o.area}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mission title */}
              <div className="space-y-2">
                <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.4em]">Mission Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Pesticide Spray – John's Farm"
                  className="w-full px-4 py-3 bg-white border-2 border-black focus:outline-none font-bold text-[10px] uppercase tracking-[0.2em] placeholder:normal-case placeholder:tracking-normal"
                />
              </div>

              {/* Drone selection */}
              <div className="space-y-2">
                <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.4em]">Select Drone *</label>
                <select
                  value={form.drone_id_str}
                  onChange={e => handleDroneSelect(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-black focus:outline-none font-bold text-[10px] uppercase tracking-[0.2em] appearance-none cursor-pointer"
                >
                  <option value="">-- Select Drone --</option>
                  {availDrones.map(d => (
                    <option key={d.id} value={d.id} disabled={!(d as any).is_available}>
                      {d.id} · {d.model}{(d as any).is_available ? '' : ' (BUSY)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pilot name */}
              <div className="space-y-2">
                <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.4em]">Pilot Name</label>
                <input
                  type="text"
                  value={form.pilot_name}
                  onChange={e => setForm(f => ({ ...f, pilot_name: e.target.value }))}
                  placeholder="Pilot name (auto-filled from drone)"
                  className="w-full px-4 py-3 bg-white border-2 border-black focus:outline-none font-bold text-[10px] placeholder:normal-case placeholder:tracking-normal"
                />
              </div>

              {/* Date + times */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.4em]">Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-3 bg-white border-2 border-black focus:outline-none font-bold text-[10px]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.4em]">Start</label>
                  <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                    className="w-full px-3 py-3 bg-white border-2 border-black focus:outline-none font-bold text-[10px]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.4em]">End</label>
                  <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                    className="w-full px-3 py-3 bg-white border-2 border-black focus:outline-none font-bold text-[10px]" />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.4em]">Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Any special instructions..."
                  className="w-full px-4 py-3 bg-white border-2 border-black focus:outline-none font-bold text-[10px] resize-none placeholder:normal-case placeholder:tracking-normal"
                />
              </div>

              {saveMsg && (
                <p className={`text-[9px] font-bold uppercase tracking-widest ${saveMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {saveMsg}
                </p>
              )}
            </div>

            <div className="p-8 bg-zinc-50 flex gap-0 border-t-2 border-black">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-5 text-base font-bold uppercase tracking-tight bg-black text-white hover:bg-brand-accent transition-all border-r-2 border-black disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Schedule'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-5 text-base font-bold uppercase tracking-tight bg-white hover:bg-zinc-100 transition-all"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

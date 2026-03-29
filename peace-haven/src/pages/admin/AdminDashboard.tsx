import React from 'react';
import { motion } from 'motion/react';
import {
  ClipboardList,
  Battery, AlertTriangle,
  ArrowUpRight, Clock, Plane
} from 'lucide-react';
import { useOrders, useDrones, useDashboardStats } from '../../hooks/useApi';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';

export const AdminDashboard = () => {
  const { data: orders } = useOrders();
  const { data: drones } = useDrones();
  const { data: stats } = useDashboardStats();

  const MOCK_ORDERS = orders;
  const MOCK_DRONES = drones;

  const totalOrders  = stats?.total_bookings  ?? MOCK_ORDERS.length;
  const activeJobs   = stats?.active_requests ?? MOCK_ORDERS.filter(o => o.status === 'In Progress').length;
  const availDrones  = stats?.active_drones   ?? MOCK_DRONES.filter(d => d.status === 'Available').length;
  const critBattery  = MOCK_DRONES.filter(d => d.battery < 20).length;

  const kpiCards = [
    { label: 'Total Orders',     value: totalOrders.toLocaleString(), change: 'All time',   trend: 'up',                              icon: ClipboardList },
    { label: 'Active Jobs',      value: String(activeJobs),           change: 'In progress', trend: 'up',                             icon: Plane         },
    { label: 'Available Drones', value: String(availDrones),          change: 'Ready now',   trend: 'neutral',                        icon: Plane         },
    { label: 'Battery Alerts',   value: String(critBattery),          change: critBattery > 0 ? 'Critical' : 'All Good', trend: critBattery > 0 ? 'down' : 'up', icon: Battery },
  ];

  const alerts = [
    ...MOCK_DRONES.filter(d => d.battery < 20).map(d => ({
      id: d.id, type: 'battery', severity: 'critical',
      title: 'Critical Battery Level',
      message: `Drone ${d.id} battery at ${d.battery}%. Immediate charging required.`,
      time: 'Now',
    })),
    ...MOCK_DRONES.filter(d => d.status === 'Maintenance').map(d => ({
      id: d.id + 'M', type: 'maintenance', severity: 'warning',
      title: 'Drone in Maintenance',
      message: `${d.id} (${d.model}) is currently under maintenance.`,
      time: 'Active',
    })),
  ].slice(0, 4);

  if (alerts.length === 0) {
    alerts.push({
      id: 'ok', type: 'info', severity: 'info',
      title: 'All Systems Operational',
      message: 'No active alerts. Fleet is healthy and ready for deployment.',
      time: 'Now',
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div>
          <h1 className="text-3xl font-extrabold uppercase tracking-tight mb-1.5">Dashboard</h1>
          <p className="text-sm font-bold text-zinc-500">
            Welcome back, <span className="text-black underline underline-offset-4">Admin</span>. Tamil Nadu fleet status overview.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Link to="/admin/orders">
            <button className="dj-button-outline py-1.5 px-4 text-xs">View All Orders</button>
          </Link>
          {/* FIX: was /admin/schedule — correct route is /admin/scheduling */}
          <Link to="/admin/scheduling">
            <button className="dj-button-filled py-1.5 px-4 text-xs">Schedule Job</button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-black">
        {kpiCards.map((stat, idx) => (
          <div
            key={stat.label}
            className={cn(
              'p-6 border-black flex flex-col justify-between min-h-[180px] group transition-colors relative overflow-hidden hover:bg-black hover:text-white',
              idx !== 3 && 'lg:border-r border-b lg:border-b-0',
              idx % 2 === 1 ? 'bg-zinc-50' : 'bg-white'
            )}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-10 h-10 border border-black flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                <stat.icon size={20} />
              </div>
              <div className={cn(
                'text-[8px] font-bold uppercase tracking-[0.2em] px-2.5 py-1 border border-black',
                stat.trend === 'up'      ? 'bg-[#4a9a40] text-white' :
                stat.trend === 'down'    ? 'bg-red-500 text-white'   :
                'bg-black text-white group-hover:bg-white group-hover:text-black'
              )}>
                {stat.change}
              </div>
            </div>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-1.5 group-hover:text-zinc-500">{stat.label}</p>
              <p className="text-3xl font-extrabold tracking-tight leading-none">{stat.value}</p>
            </div>
            <motion.div
              animate={{ x: [0, 80, 0], y: [0, -15, 0], rotate: [0, 5, 0] }}
              transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
              className="absolute -right-4 top-1/2 opacity-[0.03] pointer-events-none group-hover:opacity-10 transition-opacity"
            >
              <Plane size={100} />
            </motion.div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Recent Orders */}
        <div className="lg:col-span-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-extrabold uppercase tracking-tight">
              Recent <span className="italic lowercase font-normal text-zinc-400">activity.</span>
            </h3>
            <Link to="/admin/orders" className="text-[8px] font-bold uppercase tracking-[0.3em] underline underline-offset-8 hover:text-[#4a9a40] transition-colors">
              View All
            </Link>
          </div>
          <div className="border border-black overflow-hidden bg-white">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left bg-black text-white">
                  <th className="p-5 text-[8px] font-bold uppercase tracking-[0.4em] border-r border-white/10">Order ID</th>
                  <th className="p-5 text-[8px] font-bold uppercase tracking-[0.4em] border-r border-white/10">Customer</th>
                  <th className="p-5 text-[8px] font-bold uppercase tracking-[0.4em] border-r border-white/10">Area</th>
                  <th className="p-5 text-[8px] font-bold uppercase tracking-[0.4em] border-r border-white/10">Status</th>
                  <th className="p-5 text-[8px] font-bold uppercase tracking-[0.4em] text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {MOCK_ORDERS.slice(0, 6).map((order) => (
                  <tr key={order.id} className="hover:bg-zinc-50 transition-colors cursor-pointer">
                    <td className="p-5 font-bold text-sm tracking-tight border-r border-black/5">{order.id}</td>
                    <td className="p-5 border-r border-black/5">
                      <p className="font-extrabold text-sm uppercase tracking-tight leading-none mb-0.5">{order.customerName}</p>
                      <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{(order.location || '').split(',')[0]}</p>
                    </td>
                    <td className="p-5 font-bold text-[8px] uppercase tracking-[0.2em] border-r border-black/5">{order.area}</td>
                    <td className="p-5 border-r border-black/5">
                      <span className={cn(
                        'text-[8px] font-bold uppercase tracking-widest px-2.5 py-1 border border-black',
                        order.status === 'Completed'  ? 'bg-[#4a9a40] text-white' :
                        order.status === 'In Progress' ? 'bg-black text-white'    : 'bg-white text-black'
                      )}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-5 text-right">
                      <Link to="/admin/orders">
                        <button className="w-8 h-8 border border-black flex items-center justify-center hover:bg-black hover:text-white transition-all ml-auto">
                          <ArrowUpRight size={16} />
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts Panel */}
        <div className="lg:col-span-4 space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 border border-black flex items-center justify-center text-white bg-[#4a9a40]">
                <AlertTriangle size={16} />
              </div>
              <h3 className="text-xl font-extrabold uppercase tracking-tight">
                Alerts <span className="italic lowercase font-normal text-zinc-400">center.</span>
              </h3>
            </div>
            <div className="space-y-0 border border-black bg-white">
              {alerts.map((alert, idx) => (
                <div
                  key={alert.id}
                  className={cn(
                    'p-5 border-black group cursor-pointer transition-all hover:bg-black hover:text-white',
                    idx !== alerts.length - 1 && 'border-b'
                  )}
                >
                  <div className="flex justify-between items-start mb-2.5">
                    <p className={cn(
                      'text-[8px] font-bold uppercase tracking-[0.3em]',
                      alert.severity === 'critical' ? 'text-red-500 group-hover:text-red-400' :
                      alert.severity === 'warning'  ? 'text-orange-500 group-hover:text-orange-400' :
                      'text-zinc-400 group-hover:text-zinc-300'
                    )}>
                      {alert.title}
                    </p>
                    <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">{alert.time}</span>
                  </div>
                  <p className="text-xs font-bold leading-tight">{alert.message}</p>
                </div>
              ))}
            </div>
            <Link to="/admin/battery">
              <button className="dj-button-outline w-full mt-5 py-2 text-[10px]">View Battery Status</button>
            </Link>
          </div>

          {/* Upcoming jobs */}
          <div className="bg-black text-white p-6 relative overflow-hidden border border-black">
            <div className="relative z-10">
              <h3 className="text-xl font-extrabold uppercase tracking-tight mb-5">
                Upcoming <span className="italic lowercase font-normal" style={{ color: '#4a9a40' }}>jobs.</span>
              </h3>
              <div className="space-y-5">
                {MOCK_ORDERS.filter(o => o.status === 'Scheduled').slice(0, 3).map((order) => (
                  <div key={order.id} className="flex gap-3 group cursor-pointer border-b border-white/10 pb-5 last:border-0 last:pb-0">
                    <div className="w-10 h-10 border border-white/20 flex-shrink-0 flex flex-col items-center justify-center bg-white/5 group-hover:bg-[#4a9a40] transition-all">
                      <Clock size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="font-extrabold uppercase tracking-tight text-sm leading-none mb-1 group-hover:text-[#4a9a40] transition-colors">{order.customerName}</p>
                      <div className="flex items-center gap-1.5 text-[7px] font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">
                        {order.scheduledTime || order.date} · {order.area}
                      </div>
                    </div>
                  </div>
                ))}
                {MOCK_ORDERS.filter(o => o.status === 'Scheduled').length === 0 && (
                  <p className="text-zinc-500 font-bold text-sm">No upcoming jobs scheduled.</p>
                )}
              </div>
              {/* FIX: was /admin/schedule — correct route is /admin/scheduling */}
              <Link to="/admin/scheduling">
                <button className="dj-button-filled w-full mt-8 bg-white text-black hover:bg-[#4a9a40] hover:text-white transition-all py-2 text-[10px]">
                  Open Schedule
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
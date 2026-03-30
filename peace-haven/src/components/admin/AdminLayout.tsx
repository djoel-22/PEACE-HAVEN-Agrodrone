import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  LayoutDashboard, ClipboardList, Calendar,
  Plane, Battery, CloudSun, Star,
  Users, Settings, LogOut, Bell, Search, Menu, X
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { adminLogout } from '../../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AdminUser {
  username:  string;
  full_name: string;
  role:      string;
}

// Hummingbird logo — inverted white for dark sidebar
const LogoWhite = ({ size = 28 }: { size?: number }) => (
  <img
    src="/peace-haven-logo.png"
    alt="Peace Haven"
    width={size}
    height={size}
    style={{ objectFit: 'contain', flexShrink: 0, filter: 'invert(1)', display: 'block' }}
  />
);

export const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [adminUser, setAdminUser]         = useState<AdminUser | null>(null);
  const [loggingOut, setLoggingOut]       = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const location = useLocation();

  // ── Load stored admin user info ────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem('admin_user');
      if (raw) setAdminUser(JSON.parse(raw));
    } catch {
      // ignore malformed JSON
    }
  }, []);

  // ── Derive initials for avatar ─────────────────────────────────────────────
  const initials = adminUser?.full_name
    ? adminUser.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : adminUser?.username?.slice(0, 2).toUpperCase() ?? 'AD';

  const displayName = adminUser?.full_name ?? adminUser?.username ?? 'Administrator';
  const displayRole = adminUser?.role === 'superadmin' ? 'Super Admin' : 'Admin';

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await adminLogout();
    } catch {
      // adminLogout redirects in finally block even on error
    }
  };

  const menuItems = [
    { name: 'Dashboard',       path: '/admin',             icon: LayoutDashboard },
    { name: 'Orders',          path: '/admin/orders',      icon: ClipboardList   },
    { name: 'Scheduling',      path: '/admin/scheduling',  icon: Calendar        },
    { name: 'Drones',          path: '/admin/drones',      icon: Plane           },
    { name: 'Battery Health',  path: '/admin/battery',     icon: Battery         },
    { name: 'Weather Monitor', path: '/admin/weather',     icon: CloudSun        },
    { name: 'Feedback',        path: '/admin/feedback',    icon: Star            },
    { name: 'Users',           path: '/admin/users',       icon: Users           },
    { name: 'Settings',        path: '/admin/settings',    icon: Settings        },
  ];

  const isActive = (path: string) =>
    path === '/admin'
      ? location.pathname === '/admin'
      : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-white flex bg-grid">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-black text-white transition-all duration-300 flex flex-col",
        "border-r border-white/10",
        isSidebarOpen ? "w-52" : "w-14"
      )}>

        {/* Logo */}
        <div className={cn(
          "flex items-center border-b border-white/10 transition-all duration-300",
          isSidebarOpen ? "p-4 gap-3" : "p-3 justify-center"
        )}>
          <LogoWhite size={isSidebarOpen ? 30 : 24} />
          {isSidebarOpen && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-black uppercase tracking-tight leading-none text-white truncate">
                Peace Haven
              </span>
              <span
                className="text-[7px] font-black uppercase tracking-[0.4em] leading-none mt-1"
                style={{ color: '#4a9a40' }}
              >
                Admin Portal
              </span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto scrollbar-hide">
          {menuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 transition-all group relative",
                  "border border-transparent",
                  active
                    ? "bg-white text-black"
                    : "text-zinc-500 hover:text-white hover:bg-white/5 hover:border-white/10"
                )}
              >
                <item.icon
                  size={14}
                  className={cn(
                    "flex-shrink-0 transition-transform group-hover:scale-110",
                    active ? "text-black" : "text-zinc-500 group-hover:text-white"
                  )}
                />
                {isSidebarOpen && (
                  <span className={cn(
                    "font-black uppercase tracking-[0.2em] text-[7px] truncate",
                    active ? "text-black" : "text-zinc-500 group-hover:text-white"
                  )}>
                    {item.name}
                  </span>
                )}
                {active && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute right-0 top-0 w-0.5 h-full"
                    style={{ backgroundColor: '#4a9a40' }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className={cn(
              "flex items-center gap-3 px-3 py-3 w-full transition-all",
              "text-zinc-600 hover:text-white border border-transparent",
              "hover:border-red-500/20 hover:bg-red-500/10 disabled:opacity-50",
              !isSidebarOpen && "justify-center"
            )}
          >
            {loggingOut
              ? <div className="w-4 h-4 border border-zinc-500 border-t-transparent animate-spin flex-shrink-0" />
              : <LogOut size={14} className="flex-shrink-0" />
            }
            {isSidebarOpen && (
              <span className="font-black uppercase tracking-[0.2em] text-[7px]">
                {loggingOut ? 'Signing out...' : 'Logout'}
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300 min-w-0",
        isSidebarOpen ? "ml-52" : "ml-14"
      )}>

        {/* Top header */}
        <header className="h-16 bg-white border-b border-black/10 px-6 flex items-center justify-between sticky top-0 z-40 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">

          {/* Left: toggle + search */}
          <div className="flex items-center gap-5">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-8 h-8 border border-black flex items-center justify-center text-black hover:bg-black hover:text-white transition-all flex-shrink-0"
              aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {isSidebarOpen ? <X size={14} /> : <Menu size={14} />}
            </button>
            <div className="hidden lg:flex items-center gap-3 bg-zinc-50 px-4 py-2.5 border border-black/10 w-[260px] group focus-within:border-black focus-within:bg-white transition-all">
              <Search size={13} className="text-zinc-300 group-focus-within:text-black transition-colors flex-shrink-0" />
              <input
                type="text"
                placeholder="Search operations, drones..."
                className="bg-transparent focus:outline-none text-[8px] font-bold uppercase tracking-[0.25em] w-full placeholder:text-zinc-300 text-black"
              />
            </div>
          </div>

          {/* Right: status + notifications + user */}
          <div className="flex items-center gap-5">

            {/* System status */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-black/10">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[7px] font-black uppercase tracking-widest text-zinc-500">
                System Online
              </span>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(v => !v)}
                className="relative w-8 h-8 border border-black/10 flex items-center justify-center text-zinc-500 hover:border-black hover:text-black transition-all"
              >
                <Bell size={14} />
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border border-white flex items-center justify-center text-[6px] font-black text-white">
                  3
                </span>
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 top-10 w-80 bg-white border border-black z-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-black bg-black text-white">
                      <p className="text-[8px] font-black uppercase tracking-[0.3em]">Notifications</p>
                      <button onClick={() => setShowNotifications(false)} className="text-zinc-400 hover:text-white transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                    {[
                      { title: 'New Booking Received', msg: 'Order #AGR0042 placed for Coimbatore — 3.5 acres.',  time: '2 min ago',  dot: 'bg-emerald-500' },
                      { title: 'Battery Alert',        msg: 'AGR-003 battery at 18%. Immediate charging needed.', time: '15 min ago', dot: 'bg-red-500'     },
                      { title: 'Mission Completed',    msg: 'AGR-001 completed spray at Salem — 5 acres.',        time: '1 hr ago',   dot: 'bg-blue-500'    },
                    ].map((n, i) => (
                      <div key={i} className="flex gap-3 px-5 py-4 border-b border-black/10 hover:bg-zinc-50 cursor-pointer transition-colors last:border-b-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${n.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-wide text-black mb-0.5">{n.title}</p>
                          <p className="text-[9px] font-medium text-zinc-500 leading-snug">{n.msg}</p>
                          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-300 mt-1">{n.time}</p>
                        </div>
                      </div>
                    ))}
                    <div className="px-5 py-3 border-t border-black">
                      <button className="w-full text-[8px] font-black uppercase tracking-widest text-zinc-400 hover:text-black transition-colors">
                        Mark All as Read
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User */}
            <div className="flex items-center gap-3 pl-5 border-l border-black/10">
              <div className="text-right hidden md:block">
                <p className="text-[10px] font-black uppercase tracking-tight leading-none mb-0.5 text-black">{displayName}</p>
                <p className="text-[7px] font-black uppercase tracking-widest text-zinc-400">{displayRole}</p>
              </div>
              <div
                className="w-9 h-9 bg-black text-white border border-black flex items-center justify-center font-black text-xs cursor-pointer hover:border-[#4a9a40] transition-all"
                title={displayName}
              >
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-8 relative z-10 min-h-0">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};
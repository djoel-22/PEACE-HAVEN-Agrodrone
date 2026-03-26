import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, ClipboardList, Calendar, 
  Drone as DroneIcon, Battery, CloudSun, 
  Users, Settings, LogOut, Bell, Search, Menu, X, Zap
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Orders', path: '/admin/orders', icon: ClipboardList },
    { name: 'Scheduling', path: '/admin/scheduling', icon: Calendar },
    { name: 'Drones', path: '/admin/drones', icon: DroneIcon },
    { name: 'Battery Health', path: '/admin/battery', icon: Battery },
    { name: 'Weather Monitor', path: '/admin/weather', icon: CloudSun },
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-white flex bg-grid">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-black text-white transition-all duration-500 flex flex-col border-r border-black",
        isSidebarOpen ? "w-52" : "w-14"
      )}>
        <div className="p-5 flex items-center justify-between border-b border-white/10">
          <Link to="/admin" className={cn("flex items-center gap-2.5", !isSidebarOpen && "justify-center w-full")}>
            <div className="w-8 h-8 bg-brand-accent flex items-center justify-center text-white flex-shrink-0 border border-black group-hover:bg-white group-hover:text-black transition-all">
              <DroneIcon size={20} />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col">
                <span className="text-lg font-extrabold uppercase tracking-tight leading-none">Peace</span>
                <span className="text-[7px] font-bold uppercase tracking-[0.4em] text-brand-accent leading-none mt-1">Admin</span>
              </div>
            )}
          </Link>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto scrollbar-hide">
          {menuItems.map((item) => (
            <Link 
              key={item.name} 
              to={item.path}
              className={cn(
                "flex items-center gap-3 p-3 transition-all group relative border border-transparent hover:border-white/10",
                location.pathname === item.path 
                  ? "bg-white text-black" 
                  : "text-zinc-500 hover:text-white"
              )}
            >
              <item.icon size={16} className={cn(
                "flex-shrink-0 transition-transform group-hover:scale-110",
                location.pathname === item.path ? "text-black" : "text-zinc-500"
              )} />
              {isSidebarOpen && (
                <span className="font-bold uppercase tracking-[0.2em] text-[7px]">{item.name}</span>
              )}
              {location.pathname === item.path && (
                <motion.div 
                  layoutId="activeNavIndicator"
                  className="absolute right-0 w-1 h-full bg-brand-accent"
                />
              )}
            </Link>
          ))}
        </nav>

        <div className="p-5 border-t border-white/10">
          <button
            onClick={() => {
              localStorage.removeItem('admin_token');
              window.location.href = '/login';
            }}
            className={cn(
              "flex items-center gap-3 p-3 text-zinc-500 hover:text-brand-accent transition-all w-full border border-transparent hover:border-brand-accent/20",
              !isSidebarOpen && "justify-center"
            )}
          >
            <LogOut size={16} />
            {isSidebarOpen && <span className="font-bold uppercase tracking-[0.2em] text-[7px]">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-500",
        isSidebarOpen ? "ml-52" : "ml-14"
      )}>
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-black px-6 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-8 h-8 border border-black flex items-center justify-center text-black hover:bg-black hover:text-white transition-all"
            >
              {isSidebarOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            <div className="hidden lg:flex items-center gap-3 bg-zinc-50 px-5 py-2.5 border border-black w-[320px] group focus-within:bg-white transition-all">
              <Search size={14} className="text-zinc-400 group-focus-within:text-black transition-colors" />
              <input 
                type="text" 
                placeholder="SEARCH OPERATIONS, DRONES, USERS..." 
                className="bg-transparent focus:outline-none text-[7px] font-bold uppercase tracking-[0.3em] w-full placeholder:text-zinc-300" 
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-2.5">
              <div className="w-7 h-7 border border-black flex items-center justify-center text-white bg-brand-accent">
                <Zap size={14} />
              </div>
              <span className="text-[7px] font-bold uppercase tracking-widest">System Online</span>
            </div>

            <button className="relative w-8 h-8 border border-black flex items-center justify-center text-black hover:bg-black hover:text-white transition-all">
              <Bell size={16} />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand-accent border border-black flex items-center justify-center text-[6px] font-bold text-white">3</span>
            </button>

            <div className="flex items-center gap-4 pl-6 border-l border-black">
              <div className="text-right hidden md:block">
                <p className="text-sm font-extrabold uppercase tracking-tight leading-none mb-1">Joel Gunaseelan</p>
                <p className="text-[7px] font-bold uppercase tracking-widest text-zinc-400">Super Admin</p>
              </div>
              <div className="w-10 h-10 bg-black text-white border border-black flex items-center justify-center font-bold text-base hover:bg-brand-accent hover:text-white transition-all cursor-pointer">
                JG
              </div>
            </div>
          </div>
        </header>

        <main className="p-8 relative z-10">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

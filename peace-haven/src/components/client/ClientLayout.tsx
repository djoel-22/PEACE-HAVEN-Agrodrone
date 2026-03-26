import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, X, Home, Calendar, MapPin, 
  CloudSun, ClipboardList, MessageSquare, 
  Droplets
} from 'lucide-react';
import { Button } from '../shared/UI';
import { cn } from '../../lib/utils';

export const ClientLayout = ({ children }: { children: React.ReactNode }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Book Service', path: '/book', icon: Calendar },
    { name: 'Track Order', path: '/track', icon: MapPin },
    { name: 'Weather', path: '/weather', icon: CloudSun },
    { name: 'My Orders', path: '/orders', icon: ClipboardList },
    { name: 'Support', path: '/support', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden bg-grid">
      {/* Grid Lines Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute left-[10%] top-0 bottom-0 w-px bg-black/5" />
        <div className="absolute right-[10%] top-0 bottom-0 w-px bg-black/5" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-black px-5 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-black rounded-none flex items-center justify-center text-white">
            <Droplets size={22} />
          </div>
          <span className="text-xl font-black tracking-tighter text-black uppercase">Peace Haven</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navItems.map((item) => (
            <Link 
              key={item.name} 
              to={item.path}
              className={cn(
                "px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all",
                location.pathname === item.path 
                  ? "text-black underline underline-offset-4 decoration-2" 
                  : "text-zinc-500 hover:text-black"
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/book">
            <button className="dj-button-filled py-1.5 px-4 text-[10px]">Book Now</button>
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden p-1.5 text-black"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 z-40 bg-white pt-20 px-5 md:hidden border-l border-black"
          >
            <nav className="flex flex-col gap-5">
              {navItems.map((item) => (
                <Link 
                  key={item.name} 
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 p-3 text-xl font-black uppercase tracking-tighter transition-all",
                    location.pathname === item.path 
                      ? "text-black" 
                      : "text-zinc-400"
                  )}
                >
                  <item.icon size={24} />
                  {item.name}
                </Link>
              ))}
            </nav>
            <div className="mt-10 flex flex-col gap-3">
              <a href="/book" className="block"><button className="dj-button-filled w-full py-3 text-sm">Book Service</button></a>
              <a href="/support" className="block"><button className="dj-button-outline w-full py-3 text-sm">Contact Support</button></a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Content */}
      <main className="flex-1 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="min-h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-black p-10 md:p-16 relative z-10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16">
          <div className="space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-black flex items-center justify-center text-white">
                <Droplets size={18} />
              </div>
              <span className="text-lg font-black uppercase tracking-tighter">Peace Haven</span>
            </div>
            <p className="text-zinc-500 text-base leading-tight font-medium">
              Empowering farmers in <span className="text-black">Tamil Nadu</span> with <span className="text-italics">smart drone technology</span> for precision agriculture. 
              Healthier crops, higher yields, sustainable future.
            </p>
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 text-zinc-400">Quick Links</h4>
            <ul className="space-y-3 text-xs font-black uppercase tracking-widest">
              <li><Link to="/book" className="hover:underline underline-offset-4">Book a Spray</Link></li>
              <li><Link to="/track" className="hover:underline underline-offset-4">Track your Order</Link></li>
              <li><Link to="/weather" className="hover:underline underline-offset-4">Weather Forecast</Link></li>
              <li><Link to="/support" className="hover:underline underline-offset-4">Help & Support</Link></li>
              <li className="pt-3 border-t border-black/5"><Link to="/admin" className="text-zinc-400 hover:text-black transition-all">Admin Portal</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 text-zinc-400">Contact Us</h4>
            <p className="text-lg font-black mb-6 leading-tight">
              hello@peacehaven.farm<br />
              +91 98765 43210
            </p>
            <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" className="block">
              <button className="dj-button-outline w-full py-2.5 text-xs">
                WhatsApp Support
              </button>
            </a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-16 pt-8 border-t border-black/5 text-center text-[8px] font-black uppercase tracking-[0.5em] text-zinc-400">
          © 2024 Peace Haven Agri-Tech Tamil Nadu. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

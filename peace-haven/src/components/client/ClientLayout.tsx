import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Menu, X, Home, Calendar, MapPin,
  CloudSun, ClipboardList, MessageSquare,
  LogOut, User
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { clientLogout } from '../../lib/api';
import { isClientAuthenticated } from '../../App';

interface ClientUser {
  phone_number: string;
  full_name: string;
  portal: string;
}

// Hummingbird logo — renders naturally (dark bird on transparent bg = visible on white)
const LogoDark = ({ size = 36 }: { size?: number }) => (
  <img
    src="/peace-haven-logo.png"
    alt="Peace Haven"
    width={size}
    height={size}
    style={{ objectFit: 'contain', flexShrink: 0 }}
  />
);

// Full brand lockup: bird + PEACE HAVEN + optional tagline (matches reference image)
const LogoLockup = ({ showTagline = false, size = 36 }: { showTagline?: boolean; size?: number }) => (
  <div className="flex items-center gap-2.5 flex-shrink-0">
    <LogoDark size={size} />
    <div className="flex flex-col leading-none">
      <span className="font-black uppercase tracking-tighter text-black" style={{ fontSize: size * 0.42 }}>
        Peace Haven
      </span>
      {showTagline && (
        <span className="font-medium text-zinc-400 italic" style={{ fontSize: size * 0.22, marginTop: 2 }}>
          Where Inventions Brew
        </span>
      )}
    </div>
  </div>
);

export const ClientLayout = ({ children }: { children: React.ReactNode }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [isAuthed, setIsAuthed]     = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const location = useLocation();

  // Re-check auth on every route change so header stays in sync after login
  useEffect(() => {
    const authed = isClientAuthenticated();
    setIsAuthed(authed);
    if (authed) {
      try {
        const raw = localStorage.getItem('client_user');
        if (raw) setClientUser(JSON.parse(raw));
      } catch {}
    } else {
      setClientUser(null);
    }
  }, [location.pathname]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await clientLogout(); } catch {}
  };

  // Initials for avatar
  const initials = clientUser?.full_name
    ? clientUser.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : clientUser?.phone_number?.slice(-2) ?? 'F';

  const navItems = [
    { name: 'Home',         path: '/',        icon: Home          },
    { name: 'Book Service', path: '/book',    icon: Calendar      },
    { name: 'Track Order',  path: '/track',   icon: MapPin        },
    { name: 'Weather',      path: '/weather', icon: CloudSun      },
    { name: 'My Orders',    path: '/orders',  icon: ClipboardList },
    { name: 'Support',      path: '/support', icon: MessageSquare },
  ];

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden bg-grid">

      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute left-[10%] top-0 bottom-0 w-px bg-black/5" />
        <div className="absolute right-[10%] top-0 bottom-0 w-px bg-black/5" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-black/10 px-5 py-3 flex items-center justify-between shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">

        <Link to="/" className="flex items-center flex-shrink-0">
          <LogoLockup size={38} />
        </Link>

        <nav className="hidden md:flex items-center gap-0.5">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "px-3 py-2 text-[9px] font-black uppercase tracking-widest transition-all",
                  active
                    ? "text-black underline underline-offset-4 decoration-2 decoration-black"
                    : "text-zinc-400 hover:text-black"
                )}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {isAuthed ? (
            <div className="flex items-center gap-2">
              {/* Profile icon — links to /profile */}
              <Link
                to="/profile"
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 border transition-all",
                  isActive('/profile')
                    ? "border-black bg-black text-white"
                    : "border-black/10 hover:border-black text-zinc-600 hover:text-black"
                )}
                title={clientUser?.full_name ?? 'My Profile'}
              >
                <div
                  className="w-5 h-5 flex items-center justify-center font-black text-[8px] flex-shrink-0"
                  style={{
                    backgroundColor: isActive('/profile') ? 'white' : 'black',
                    color: isActive('/profile') ? 'black' : 'white',
                  }}
                >
                  {initials}
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest max-w-[80px] truncate">
                  {clientUser?.full_name?.split(' ')[0] ?? 'Profile'}
                </span>
              </Link>

              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-black/10 text-zinc-400 hover:text-black hover:border-black transition-all disabled:opacity-50"
              >
                <LogOut size={11} />
                <span className="text-[8px] font-black uppercase tracking-widest">
                  {loggingOut ? '...' : 'Sign Out'}
                </span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/client/login">
                <button className="dj-button-outline py-1.5 px-4 text-[9px]">Sign In</button>
              </Link>
              <Link to="/book">
                <button className="dj-button-filled py-1.5 px-4 text-[9px]">Book Now</button>
              </Link>
            </div>
          )}
        </div>

        <button
          className="md:hidden p-1.5 text-black border border-black/10 hover:border-black transition-all"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 z-40 bg-white pt-[68px] px-5 md:hidden border-l border-black/10 overflow-y-auto"
          >
            <nav className="flex flex-col gap-1 mb-8">
              {navItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-4 px-4 py-4 border border-transparent transition-all",
                      "text-base font-black uppercase tracking-tight",
                      active ? "text-black border-black/10 bg-zinc-50" : "text-zinc-400 hover:text-black hover:bg-zinc-50"
                    )}
                  >
                    <item.icon size={20} className={active ? "text-black" : "text-zinc-300"} />
                    {item.name}
                  </Link>
                );
              })}
              {isAuthed && (
                <Link
                  to="/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-4 border border-transparent transition-all",
                    "text-base font-black uppercase tracking-tight",
                    isActive('/profile') ? "text-black border-black/10 bg-zinc-50" : "text-zinc-400 hover:text-black hover:bg-zinc-50"
                  )}
                >
                  <User size={20} className={isActive('/profile') ? "text-black" : "text-zinc-300"} />
                  My Profile
                </Link>
              )}
            </nav>

            <div className="flex flex-col gap-3 pb-10">
              {isAuthed ? (
                <>
                  {clientUser && (
                    <Link to="/profile" onClick={() => setIsMenuOpen(false)}>
                      <div className="flex items-center gap-3 px-4 py-3 bg-zinc-50 border border-black/10 hover:border-black transition-all">
                        <div className="w-9 h-9 bg-black text-white flex items-center justify-center font-black text-xs flex-shrink-0">
                          {initials}
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Signed in as</p>
                          <p className="text-xs font-black uppercase tracking-tight text-black truncate">
                            {clientUser.full_name ?? clientUser.phone_number}
                          </p>
                        </div>
                      </div>
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="dj-button-outline w-full py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <LogOut size={14} />
                    {loggingOut ? 'Signing out...' : 'Sign Out'}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/book" onClick={() => setIsMenuOpen(false)} className="block">
                    <button className="dj-button-filled w-full py-3 text-sm">Book Service</button>
                  </Link>
                  <Link to="/client/login" onClick={() => setIsMenuOpen(false)} className="block">
                    <button className="dj-button-outline w-full py-3 text-sm">Sign In</button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page content */}
      <main className="flex-1 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="min-h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-black/10 p-10 md:p-14 relative z-10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">

          <div className="space-y-5">
            <LogoLockup size={44} showTagline />
            <p className="text-zinc-600 text-sm leading-relaxed font-medium">
              Empowering farmers in{' '}
              <span className="text-black font-bold">Tamil Nadu</span>{' '}
              with <span className="italic">smart drone technology</span>{' '}
              for precision agriculture. Healthier crops, higher yields.
            </p>
          </div>

          <div>
            <h4 className="text-[9px] font-black uppercase tracking-[0.35em] mb-5 text-zinc-400">Quick Links</h4>
            <ul className="space-y-3">
              {[
                { label: 'Book a Spray',     path: '/book'    },
                { label: 'Track your Order', path: '/track'   },
                { label: 'Weather Forecast', path: '/weather' },
                { label: 'Help & Support',   path: '/support' },
                { label: 'My Orders',        path: '/orders'  },
              ].map(link => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-black transition-colors hover:underline underline-offset-4"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[9px] font-black uppercase tracking-[0.35em] mb-5 text-zinc-400">Contact Us</h4>
            <div className="space-y-2 mb-6">
              <p className="text-sm font-black text-black">india@peacehaven.co</p>
              <p className="text-sm font-black text-black">+91 98423 85876</p>
            </div>
            <a href="https://wa.me/919842385876" target="_blank" rel="noopener noreferrer" className="block">
              <button className="dj-button-outline w-full py-2.5 text-[9px]">WhatsApp Support</button>
            </a>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-12 pt-6 border-t border-black/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[8px] font-black uppercase tracking-[0.5em] text-zinc-400">
            © 2024 Peace Haven Agri-Tech Tamil Nadu. All rights reserved.
          </p>
          {!isAuthed && (
            <Link to="/client/login">
              <button className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-400 hover:text-black transition-colors underline underline-offset-4">
                Sign In →
              </button>
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
};
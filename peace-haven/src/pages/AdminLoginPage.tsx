import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ShieldCheck, Lock, User, Eye, EyeOff,
  AlertCircle, ArrowLeft, Zap, Activity, Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { adminLogin } from '../lib/api';

// Hummingbird logo — white version for dark backgrounds
const LogoWhite = ({ size = 36 }: { size?: number }) => (
  <img
    src="/peace-haven-logo.png"
    alt="Peace Haven"
    width={size}
    height={size}
    style={{ objectFit: 'contain', flexShrink: 0, filter: 'invert(1)', display: 'block' }}
  />
);

export const AdminLoginPage = () => {
  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [attempts, setAttempts]         = useState(0);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await adminLogin(username.trim(), password);
      localStorage.setItem('admin_token',         res.token);
      localStorage.setItem('admin_refresh_token', (res as any).refresh_token ?? '');
      localStorage.setItem('admin_user', JSON.stringify({
        username:  res.username,
        full_name: (res as any).full_name ?? res.username,
        role:      res.role,
      }));
      window.location.href = '/admin';
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Login failed';
      setAttempts(a => a + 1);
      if (msg.includes('locked') || msg.includes('429')) {
        setError('Account temporarily locked due to too many failed attempts. Please try again later.');
      } else if (msg.includes('disabled')) {
        setError('This account has been disabled. Contact your system administrator.');
      } else {
        setError('Invalid username or password. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col bg-grid-dark">

      {/* Top bar */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-white/10">
        <Link to="/login" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors group">
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[9px] font-black uppercase tracking-[0.35em]">Portal Select</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-[0.35em] text-zinc-500">System Online</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-0 border border-white/10">

          {/* Left panel */}
          <div className="hidden lg:flex flex-col justify-between p-12 border-r border-white/10 bg-white/[0.02]">
            <div>
              {/* Logo lockup */}
              <div className="flex items-center gap-3 mb-14">
                <LogoWhite size={40} />
                <div>
                  <p className="text-base font-black uppercase tracking-tight leading-none text-white">Peace Haven</p>
                  <p className="text-[8px] font-black uppercase tracking-[0.4em] mt-0.5" style={{ color: '#4a9a40' }}>Admin Portal</p>
                </div>
              </div>
              <h1 className="text-5xl font-black uppercase tracking-tighter leading-none mb-6 text-white">
                Operations<br />
                <span className="text-white/30">Command</span><br />
                Centre.
              </h1>
              <p className="text-zinc-500 text-sm font-medium leading-relaxed max-w-xs">
                Manage drone fleet, scheduling, orders, and platform operations across Tamil Nadu.
              </p>
            </div>
            <div className="space-y-0 border border-white/10">
              {[
                { icon: Activity, label: 'Live Operations',  value: 'Real-time'    },
                { icon: Zap,      label: 'Fleet Management', value: 'Full Control' },
                { icon: Users,    label: 'User Management',  value: 'Role-based'   },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-white/10 last:border-b-0">
                  <div className="w-7 h-7 border border-white/20 flex items-center justify-center flex-shrink-0" style={{ color: '#4a9a40' }}>
                    <item.icon size={14} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-500">{item.label}</p>
                  </div>
                  <p className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: '#4a9a40' }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: form */}
          <div className="p-10 md:p-12 flex flex-col justify-center bg-black">

            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-2.5 mb-10">
              <LogoWhite size={32} />
              <p className="text-sm font-black uppercase tracking-tight text-white">Peace Haven Admin</p>
            </div>

            <div className="mb-10">
              <p className="text-[9px] font-black uppercase tracking-[0.5em] text-zinc-600 mb-4">Authorized Access Only</p>
              <h2 className="text-3xl font-black uppercase tracking-tight text-white leading-none mb-3">Admin Sign In</h2>
              <p className="text-zinc-500 text-sm font-medium">Enter your credentials to access the control panel.</p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 items-start p-4 border border-red-500/30 bg-red-500/10 mb-8"
              >
                <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-red-400 leading-relaxed">{error}</p>
              </motion.div>
            )}

            {attempts >= 3 && !error?.includes('locked') && (
              <div className="flex gap-3 items-start p-4 border border-amber-500/30 bg-amber-500/10 mb-6">
                <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-amber-400 leading-relaxed">
                  {5 - attempts} attempt{5 - attempts !== 1 ? 's' : ''} remaining before account lockout.
                </p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6" autoComplete="off">
              <div className="space-y-2">
                <label className="text-[8px] font-black uppercase tracking-[0.35em] text-zinc-600 flex items-center gap-1.5">
                  <User size={10} /> Username
                </label>
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="Enter username"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError(null); }}
                  className={cn(
                    "w-full px-5 py-4 bg-white/5 border focus:outline-none focus:bg-white/10 transition-all",
                    "text-sm text-white placeholder:text-zinc-600",
                    error ? "border-red-500/50 focus:border-red-400" : "border-white/10 focus:border-white/40"
                  )}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[8px] font-black uppercase tracking-[0.35em] text-zinc-600 flex items-center gap-1.5">
                  <Lock size={10} /> Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="············"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(null); }}
                    className={cn(
                      "w-full px-5 py-4 pr-14 bg-white/5 border focus:outline-none focus:bg-white/10 transition-all",
                      "text-sm text-white placeholder:text-zinc-600",
                      error ? "border-red-500/50 focus:border-red-400" : "border-white/10 focus:border-white/40"
                    )}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading || !username || !password}
                  className={cn(
                    "w-full h-14 font-black uppercase tracking-widest text-xs transition-all",
                    "bg-white text-black hover:bg-[#4a9a40] hover:text-white",
                    "disabled:opacity-30 disabled:cursor-not-allowed",
                    "flex items-center justify-center gap-3"
                  )}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Sign In to Admin Portal</span>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-10 pt-8 border-t border-white/10">
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-700 leading-relaxed text-center">
                Restricted to authorized Peace Haven personnel only.<br />
                All login attempts are logged with IP address and timestamp.
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="px-8 py-4 border-t border-white/10 flex items-center justify-between">
        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-700">© 2024 Peace Haven Agri-Tech</p>
        <Link to="/client/login" className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-700 hover:text-zinc-400 transition-colors">
          Farmer Portal →
        </Link>
      </footer>
    </div>
  );
};
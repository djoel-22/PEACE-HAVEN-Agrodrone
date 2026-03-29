import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Leaf, Lock, Phone, Eye, EyeOff,
  AlertCircle, ArrowLeft,
  CheckCircle2, UserPlus, LogIn
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { apiFetch } from '../lib/api';

// Hummingbird logo — dark version for white backgrounds
const LogoDark = ({ size = 36 }: { size?: number }) => (
  <img
    src="/peace-haven-logo.png"
    alt="Peace Haven"
    width={size}
    height={size}
    style={{ objectFit: 'contain', flexShrink: 0, display: 'block' }}
  />
);

export const ClientLoginPage = () => {
  const [tab, setTab]                   = useState<'login' | 'register'>('login');
  const [phone, setPhone]               = useState('');
  const [fullName, setFullName]         = useState('');
  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [success, setSuccess]           = useState<string | null>(null);

  const resetForm = () => {
    setPhone(''); setFullName('');
    setPassword(''); setConfirmPassword('');
    setError(null); setSuccess(null);
    setShowPassword(false);
  };

  const switchTab = (t: 'login' | 'register') => {
    setTab(t);
    resetForm();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !password.trim()) {
      setError('Please enter your phone number and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{
        token: string;
        access_token: string;
        refresh_token: string;
        phone_number: string;
        full_name: string;
        portal: string;
      }>('/api/admin/client/login', {
        method: 'POST',
        body: JSON.stringify({ phone_number: phone.trim(), password }),
      });
      localStorage.setItem('client_token',         res.access_token ?? res.token);
      localStorage.setItem('client_refresh_token', res.refresh_token ?? '');
      localStorage.setItem('client_user',          JSON.stringify({
        phone_number: res.phone_number,
        full_name:    res.full_name,
        portal:       'client',
      }));
      window.location.href = '/';
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Login failed';
      if (msg.includes('locked') || msg.includes('429')) {
        setError('Account temporarily locked. Too many failed attempts. Try again in 15 minutes.');
      } else if (msg.includes('disabled')) {
        setError('Your account has been disabled. Please contact support.');
      } else {
        setError('Incorrect phone number or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !fullName.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    const phoneClean = phone.replace(/\s/g, '');
    if (!/^\+?[0-9]{10,15}$/.test(phoneClean)) {
      setError('Please enter a valid phone number (10–15 digits).');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await apiFetch('/api/admin/client/register', {
        method: 'POST',
        body: JSON.stringify({
          phone_number: phoneClean,
          full_name:    fullName.trim(),
          password,
        }),
      });
      setSuccess('Account created! You can now sign in with your phone number and password.');
      setTimeout(() => switchTab('login'), 2500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Registration failed';
      if (msg.includes('already registered') || msg.includes('400')) {
        setError('This phone number is already registered. Please sign in instead.');
      } else {
        setError('Registration failed. Please try again or contact support.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col bg-grid">

      {/* Header */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-black/10">
        <Link
          to="/login"
          className="flex items-center gap-2 text-zinc-400 hover:text-black transition-colors group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[9px] font-black uppercase tracking-[0.35em]">Portal Select</span>
        </Link>
        {/* Logo lockup */}
        <div className="flex items-center gap-2.5">
          <LogoDark size={34} />
          <div className="flex flex-col leading-none">
            <span className="text-sm font-black uppercase tracking-tighter text-black">Peace Haven</span>
            <span className="text-[10px] italic text-zinc-400 font-medium mt-0.5">Where Inventions Brew</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-0 border border-black">

          {/* Left panel: branding */}
          <div className="hidden lg:flex flex-col justify-between p-12 bg-[#f7faf7] border-r border-black">
            <div>
              {/* Logo lockup */}
              <div className="flex items-center gap-3 mb-14">
                <LogoDark size={44} />
                <div className="flex flex-col leading-none">
                  <p className="text-base font-black uppercase tracking-tight text-black">Peace Haven</p>
                  <p className="text-[8px] font-black uppercase tracking-[0.4em] text-[#3a7a30] mt-1">Farmer Portal</p>
                </div>
              </div>
              <h1 className="text-5xl font-black uppercase tracking-tighter leading-none mb-6 text-black">
                Smart Farming<br />
                <span className="text-black/25">Starts Here.</span>
              </h1>
              <p className="text-zinc-500 text-sm font-medium leading-relaxed max-w-xs">
                Book drone spray services, track your orders in real-time,
                and monitor weather — all in one place for Tamil Nadu farmers.
              </p>
            </div>

            {/* Feature list */}
            <div className="space-y-0 border border-black/15">
              {[
                'Book drone spray & fertiliser services',
                'Real-time order tracking',
                'Live weather monitoring',
                'WhatsApp notifications',
                'Service history & invoices',
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-black/10 last:border-b-0">
                  <CheckCircle2 size={13} className="text-[#3a7a30] flex-shrink-0" />
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wide">{feature}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: form */}
          <div className="p-10 md:p-12 bg-white flex flex-col justify-center">

            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-2.5 mb-10">
              <LogoDark size={32} />
              <div className="flex flex-col leading-none">
                <p className="text-sm font-black uppercase tracking-tight text-black">Peace Haven</p>
                <p className="text-[9px] italic text-zinc-400 font-medium mt-0.5">Where Inventions Brew</p>
              </div>
            </div>

            {/* Tab switcher */}
            <div className="flex border border-black mb-10">
              <button
                onClick={() => switchTab('login')}
                className={cn(
                  "flex-1 py-3 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all",
                  tab === 'login' ? "bg-black text-white" : "bg-white text-zinc-400 hover:text-black"
                )}
              >
                <LogIn size={11} /> Sign In
              </button>
              <button
                onClick={() => switchTab('register')}
                className={cn(
                  "flex-1 py-3 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all border-l border-black",
                  tab === 'register' ? "bg-black text-white" : "bg-white text-zinc-400 hover:text-black"
                )}
              >
                <UserPlus size={11} /> Register
              </button>
            </div>

            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <div className="mb-8">
                <h2 className="text-3xl font-black uppercase tracking-tight text-black leading-none mb-2">
                  {tab === 'login' ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="text-zinc-400 text-sm font-medium">
                  {tab === 'login'
                    ? 'Sign in with your registered phone number.'
                    : 'Register to book drone services for your farm.'}
                </p>
              </div>

              {success && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 items-start p-4 border border-emerald-500/40 bg-emerald-50 mb-6">
                  <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-emerald-700 leading-relaxed">{success}</p>
                </motion.div>
              )}

              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 items-start p-4 border border-red-200 bg-red-50 mb-6">
                  <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-red-600 leading-relaxed">{error}</p>
                </motion.div>
              )}

              {/* LOGIN FORM */}
              {tab === 'login' && (
                <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase tracking-[0.35em] text-zinc-400 flex items-center gap-1.5">
                      <Phone size={10} /> Phone Number
                    </label>
                    <input type="tel" autoComplete="tel" placeholder="+91 98765 43210"
                      value={phone} onChange={e => { setPhone(e.target.value); setError(null); }}
                      className={cn("w-full px-5 py-4 border focus:outline-none focus:bg-zinc-50 transition-all font-bold text-sm text-black placeholder:text-zinc-300",
                        error ? "border-red-300" : "border-black")} disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase tracking-[0.35em] text-zinc-400 flex items-center gap-1.5">
                      <Lock size={10} /> Password
                    </label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                        placeholder="········" value={password}
                        onChange={e => { setPassword(e.target.value); setError(null); }}
                        className={cn("w-full px-5 py-4 pr-14 border focus:outline-none focus:bg-zinc-50 transition-all font-bold text-sm text-black placeholder:text-zinc-300",
                          error ? "border-red-300" : "border-black")} disabled={loading} />
                      <button type="button" onClick={() => setShowPassword(v => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black transition-colors" tabIndex={-1}>
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className="pt-3">
                    <button type="submit" disabled={loading || !phone || !password}
                      className={cn("w-full h-14 font-black uppercase tracking-widest text-xs transition-all bg-black text-white hover:bg-[#2d5a27] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3")}>
                      {loading ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" /><span>Signing In...</span></>) : <span>Sign In to Farmer Portal</span>}
                    </button>
                  </div>
                  <p className="text-center text-[9px] font-black uppercase tracking-widest text-zinc-400 pt-2">
                    No account?{' '}
                    <button type="button" onClick={() => switchTab('register')} className="text-black underline underline-offset-4">Register here</button>
                  </p>
                </form>
              )}

              {/* REGISTER FORM */}
              {tab === 'register' && (
                <form onSubmit={handleRegister} className="space-y-5" autoComplete="off">
                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase tracking-[0.35em] text-zinc-400">Full Name</label>
                    <input type="text" autoComplete="name" placeholder="Your full name" value={fullName}
                      onChange={e => { setFullName(e.target.value); setError(null); }}
                      className="w-full px-5 py-4 border border-black focus:outline-none focus:bg-zinc-50 transition-all font-bold text-sm text-black placeholder:text-zinc-300"
                      disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase tracking-[0.35em] text-zinc-400 flex items-center gap-1.5">
                      <Phone size={10} /> Phone Number
                    </label>
                    <input type="tel" autoComplete="tel" placeholder="+91 98765 43210" value={phone}
                      onChange={e => { setPhone(e.target.value); setError(null); }}
                      className="w-full px-5 py-4 border border-black focus:outline-none focus:bg-zinc-50 transition-all font-bold text-sm text-black placeholder:text-zinc-300"
                      disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase tracking-[0.35em] text-zinc-400 flex items-center gap-1.5">
                      <Lock size={10} /> Password
                    </label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                        placeholder="Min. 8 characters" value={password}
                        onChange={e => { setPassword(e.target.value); setError(null); }}
                        className="w-full px-5 py-4 pr-14 border border-black focus:outline-none focus:bg-zinc-50 transition-all font-bold text-sm text-black placeholder:text-zinc-300"
                        disabled={loading} />
                      <button type="button" onClick={() => setShowPassword(v => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black transition-colors" tabIndex={-1}>
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase tracking-[0.35em] text-zinc-400">Confirm Password</label>
                    <input type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                      placeholder="Re-enter password" value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setError(null); }}
                      className={cn("w-full px-5 py-4 border focus:outline-none focus:bg-zinc-50 transition-all font-bold text-sm text-black placeholder:text-zinc-300",
                        confirmPassword && confirmPassword !== password ? "border-red-300" : "border-black")}
                      disabled={loading} />
                    {confirmPassword && confirmPassword !== password && (
                      <p className="text-[9px] font-bold text-red-500 uppercase tracking-wide">Passwords do not match</p>
                    )}
                  </div>
                  <div className="pt-3">
                    <button type="submit" disabled={loading || !phone || !fullName || !password || !confirmPassword}
                      className={cn("w-full h-14 font-black uppercase tracking-widest text-xs transition-all bg-black text-white hover:bg-[#2d5a27] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3")}>
                      {loading ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" /><span>Creating Account...</span></>) : <span>Create Farmer Account</span>}
                    </button>
                  </div>
                  <p className="text-center text-[9px] font-black uppercase tracking-widest text-zinc-400 pt-2">
                    Already registered?{' '}
                    <button type="button" onClick={() => switchTab('login')} className="text-black underline underline-offset-4">Sign in</button>
                  </p>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      <footer className="px-8 py-4 border-t border-black/10 flex items-center justify-between">
        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-400">© 2024 Peace Haven Agri-Tech Tamil Nadu</p>
        <Link to="/admin/login" className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-300 hover:text-zinc-600 transition-colors">
          Admin Portal →
        </Link>
      </footer>
    </div>
  );
};
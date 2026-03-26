import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Mail, Lock, ArrowRight, 
  Droplets, ShieldCheck, Zap,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { adminLogin } from '../lib/api';

export const LoginPage = () => {
  const [role, setRole] = useState<'client' | 'admin'>('client');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-5 bg-grid">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left Side: Branding & Info */}
        <div className="hidden lg:block">
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-10 h-10 bg-black flex items-center justify-center text-white">
              <Droplets size={24} />
            </div>
            <span className="text-2xl font-black uppercase tracking-tighter text-black">Peace Haven</span>
          </div>
          
          <h1 className="text-6xl font-black mb-8 leading-[0.85] uppercase tracking-tighter">
            Precision <br />
            <span className="text-italics lowercase text-zinc-400">agriculture</span> <br />
            for everyone.
          </h1>
          
          <div className="space-y-6">
            <div className="flex gap-5 items-start">
              <div className="w-10 h-10 border border-black flex items-center justify-center text-black flex-shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="font-black uppercase tracking-widest text-xs mb-1">Secure & Reliable</p>
                <p className="text-zinc-500 font-bold leading-tight text-sm">Your farm data in Tamil Nadu is encrypted and protected with enterprise-grade security.</p>
              </div>
            </div>
            <div className="flex gap-5 items-start">
              <div className="w-10 h-10 border border-black flex items-center justify-center text-black flex-shrink-0">
                <Zap size={20} />
              </div>
              <div>
                <p className="font-black uppercase tracking-widest text-xs mb-1">Real-time Monitoring</p>
                <p className="text-zinc-500 font-bold leading-tight text-sm">Track your drone spray progress and weather conditions live across Tamil Nadu.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="dj-card p-10 md:p-12">
            <div className="mb-10">
              <h2 className="text-4xl font-black uppercase tracking-tighter mb-3">Welcome Back</h2>
              <p className="text-zinc-500 font-bold text-base">Please enter your details to sign in.</p>
            </div>

            {/* Role Switcher */}
            <div className="flex border border-black mb-8">
              <button 
                onClick={() => setRole('client')}
                className={cn(
                  "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                  role === 'client' ? "bg-black text-white" : "bg-white text-zinc-400 hover:text-black"
                )}
              >
                Farmer Portal
              </button>
              <button 
                onClick={() => setRole('admin')}
                className={cn(
                  "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                  role === 'admin' ? "bg-black text-white" : "bg-white text-zinc-400 hover:text-black"
                )}
              >
                Admin Portal
              </button>
            </div>

            <form className="space-y-6">
              <div className="space-y-2.5">
                <label className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-400 flex items-center gap-1.5">
                  <Mail size={12} /> Email Address
                </label>
                <input 
                  type="email" 
                  placeholder="NAME@EXAMPLE.COM"
                  className="w-full px-5 py-4 border border-black focus:outline-none focus:bg-zinc-50 transition-all font-black uppercase text-xs tracking-widest"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-400 flex items-center gap-1.5">
                    <Lock size={12} /> Password
                  </label>
                  <button type="button" className="text-[8px] font-black uppercase tracking-widest underline underline-offset-4">Forgot?</button>
                </div>
                <input 
                  type="password" 
                  placeholder="••••••••"
                  className="w-full px-5 py-4 border border-black focus:outline-none focus:bg-zinc-50 transition-all font-black text-xs tracking-widest"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="pt-5">
                {authError && (
                  <p className="text-red-600 text-xs font-bold uppercase tracking-widest mb-3">{authError}</p>
                )}
                <button
                  type="button"
                  disabled={authLoading}
                  className="dj-button-filled w-full text-lg h-16 disabled:opacity-50"
                  onClick={async () => {
                    setAuthError(null);
                    if (role === 'admin') {
                      setAuthLoading(true);
                      try {
                        const res = await adminLogin(email, password);
                        localStorage.setItem('admin_token', res.token);
                        window.location.href = '/admin';
                      } catch (e: unknown) {
                        setAuthError(e instanceof Error ? e.message : 'Login failed');
                      } finally {
                        setAuthLoading(false);
                      }
                    } else {
                      window.location.href = '/';
                    }
                  }}
                >
                  {authLoading ? 'Signing in...' : 'Sign In'}
                </button>
              </div>
            </form>

            <div className="mt-10 text-center">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-400">
                Don't have an account? <button className="text-black underline underline-offset-4">Create one</button>
              </p>
            </div>

            {role === 'admin' && (
              <div className="mt-8 p-5 bg-brand-accent border border-black flex gap-3">
                <AlertCircle size={16} className="text-black flex-shrink-0" />
                <p className="text-[8px] font-black uppercase tracking-widest leading-tight">
                  Admin access is restricted to authorized personnel in Tamil Nadu. All login attempts are logged.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

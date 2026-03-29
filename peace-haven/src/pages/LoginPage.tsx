import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Leaf, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

// Hummingbird logo
const Logo = ({ size = 40, invert = false }: { size?: number; invert?: boolean }) => (
  <img
    src="/peace-haven-logo.png"
    alt="Peace Haven"
    width={size}
    height={size}
    style={{
      objectFit: 'contain',
      flexShrink: 0,
      filter: invert ? 'brightness(0) invert(1)' : 'none',
    }}
  />
);

/**
 * LoginPage — Portal selector / landing gateway.
 * Reached via legacy /login route (redirected from old bookmarks).
 * Directs users to the correct dedicated portal login page.
 * No credentials are collected here.
 */
export const LoginPage = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col bg-grid">

      {/* Header */}
      <header className="px-8 py-5 border-b border-black/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo size={40} />
          <div className="flex flex-col leading-none">
            <span className="text-lg font-black uppercase tracking-tighter text-black">Peace Haven</span>
            <span className="text-[11px] italic text-zinc-400 font-medium mt-0.5">Where Inventions Brew</span>
          </div>
        </div>
        <span className="text-[9px] font-black uppercase tracking-[0.35em] text-zinc-400">
          Agro-Drone Platform
        </span>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-5 py-16">
        <div className="w-full max-w-3xl">

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-16"
          >
            <p className="text-[9px] font-black uppercase tracking-[0.5em] text-zinc-400 mb-5">
              Select your portal
            </p>
            <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-6">
              Welcome to<br />
              <span className="text-zinc-300">Peace Haven</span>
            </h1>
            <p className="text-zinc-500 font-medium text-sm max-w-md mx-auto leading-relaxed">
              Precision agricultural drone services for Tamil Nadu farmers.
              Choose your portal to continue.
            </p>
          </motion.div>

          {/* Portal Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Farmer / Client Portal */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Link to="/client/login" className="block group">
                <div className="border border-black p-8 md:p-10 bg-white transition-all duration-300 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 h-full flex flex-col">

                  {/* Icon */}
                  <div className="w-12 h-12 bg-black flex items-center justify-center mb-8 group-hover:bg-[#3a7a30] transition-colors duration-300">
                    <Leaf size={22} className="text-white" />
                  </div>

                  {/* Label */}
                  <p className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-400 mb-3">
                    For Farmers
                  </p>
                  <h2 className="text-2xl font-black uppercase tracking-tight mb-4 leading-none text-black">
                    Farmer<br />Portal
                  </h2>
                  <p className="text-zinc-500 text-sm font-medium leading-relaxed flex-1">
                    Book drone spray services, track your orders, check weather conditions,
                    and manage your farm operations.
                  </p>

                  {/* CTA */}
                  <div className="mt-8 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-black group-hover:gap-4 transition-all duration-300">
                    <span>Enter Portal</span>
                    <ArrowRight size={14} />
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Admin Portal */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Link to="/admin/login" className="block group">
                <div className="border border-black p-8 md:p-10 bg-black text-white transition-all duration-300 hover:shadow-[6px_6px_0px_0px_rgba(45,90,39,1)] hover:-translate-y-1 h-full flex flex-col">

                  {/* Icon */}
                  <div className="w-12 h-12 bg-white flex items-center justify-center mb-8 group-hover:bg-[#3a7a30] transition-colors duration-300">
                    <ShieldCheck size={22} className="text-black group-hover:text-white" />
                  </div>

                  {/* Label */}
                  <p className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500 mb-3">
                    Restricted Access
                  </p>
                  <h2 className="text-2xl font-black uppercase tracking-tight mb-4 leading-none text-white">
                    Admin<br />Portal
                  </h2>
                  <p className="text-zinc-400 text-sm font-medium leading-relaxed flex-1">
                    Manage drone fleet, scheduling, orders, battery health, and
                    platform operations. Authorized personnel only.
                  </p>

                  {/* CTA */}
                  <div className="mt-8 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-white group-hover:gap-4 transition-all duration-300">
                    <span>Admin Login</span>
                    <ArrowRight size={14} />
                  </div>
                </div>
              </Link>
            </motion.div>

          </div>

          {/* Footer note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center text-[8px] font-black uppercase tracking-[0.4em] text-zinc-300 mt-12"
          >
            All access attempts are logged and monitored · Peace Haven Agri-Tech Tamil Nadu
          </motion.p>

        </div>
      </main>
    </div>
  );
};
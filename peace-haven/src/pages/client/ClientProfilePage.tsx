import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  User, Phone, Mail, MapPin, Calendar, ClipboardList,
  Edit3, Save, X, LogOut, ShieldCheck, Clock, Plane,
  CheckCircle2, AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { clientLogout } from '../../lib/api';
import { isClientAuthenticated } from '../../App';

interface ClientUser {
  phone_number: string;
  full_name: string;
  portal: string;
  email?: string;
  district?: string;
  joined?: string;
}

export const ClientProfilePage = () => {
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [isAuthed, setIsAuthed]     = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [editing, setEditing]       = useState(false);
  const [editName, setEditName]     = useState('');
  const [editEmail, setEditEmail]   = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [saveMsg, setSaveMsg]       = useState<string | null>(null);

  useEffect(() => {
    setIsAuthed(isClientAuthenticated());
    try {
      const raw = localStorage.getItem('client_user');
      if (raw) {
        const u = JSON.parse(raw);
        setClientUser(u);
        setEditName(u.full_name ?? '');
        setEditEmail(u.email ?? '');
        setEditDistrict(u.district ?? '');
      }
    } catch {}
  }, []);

  const handleSave = () => {
    if (!clientUser) return;
    const updated = {
      ...clientUser,
      full_name: editName.trim() || clientUser.full_name,
      email:     editEmail.trim(),
      district:  editDistrict.trim(),
    };
    setClientUser(updated);
    localStorage.setItem('client_user', JSON.stringify(updated));
    setEditing(false);
    setSaveMsg('Profile updated successfully.');
    setTimeout(() => setSaveMsg(null), 3000);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await clientLogout(); } catch {}
  };

  // Initials for avatar
  const initials = clientUser?.full_name
    ? clientUser.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : clientUser?.phone_number?.slice(-2) ?? 'F';

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-white bg-grid flex items-center justify-center px-5">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 border border-black flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={28} className="text-zinc-300" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-3">Sign In Required</h2>
          <p className="text-zinc-500 font-medium text-sm mb-8">
            You need to be signed in to view your profile.
          </p>
          <Link to="/client/login">
            <button className="dj-button-filled w-full h-12">Sign In</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white bg-grid">
      <div className="max-w-4xl mx-auto px-5 py-12">

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="inline-block px-2.5 py-1 bg-black text-white text-[8px] font-black uppercase tracking-[0.3em] mb-5">
            Farmer Account
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none mb-2">
            My <span className="text-italics lowercase text-zinc-400">profile.</span>
          </h1>
          <p className="text-zinc-500 font-medium text-sm">
            Manage your Peace Haven farmer account.
          </p>
        </motion.div>

        {/* Save success */}
        {saveMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 items-center p-4 border border-emerald-200 bg-emerald-50 mb-6"
          >
            <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">{saveMsg}</p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-black">

          {/* ── Left: Avatar + quick actions ── */}
          <div className="md:border-r border-black p-8 flex flex-col items-center text-center gap-6 bg-zinc-50/50">

            {/* Avatar */}
            <div
              className="w-24 h-24 bg-black text-white flex items-center justify-center font-black text-3xl border border-black"
            >
              {initials}
            </div>

            <div>
              <p className="text-xl font-black uppercase tracking-tighter text-black mb-1">
                {clientUser?.full_name ?? 'Farmer'}
              </p>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-400">
                Peace Haven Member
              </p>
            </div>

            {/* Status badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 border border-black/10 bg-white">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">
                Active Account
              </span>
            </div>

            {/* Quick links */}
            <div className="w-full space-y-2 pt-2">
              <Link to="/orders" className="block">
                <button className="w-full flex items-center gap-3 px-4 py-3 border border-black/10 hover:border-black hover:bg-zinc-50 transition-all text-left">
                  <ClipboardList size={14} className="text-zinc-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">My Orders</span>
                </button>
              </Link>
              <Link to="/book" className="block">
                <button className="w-full flex items-center gap-3 px-4 py-3 border border-black/10 hover:border-black hover:bg-zinc-50 transition-all text-left">
                  <Plane size={14} className="text-zinc-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Book Service</span>
                </button>
              </Link>
              <Link to="/track" className="block">
                <button className="w-full flex items-center gap-3 px-4 py-3 border border-black/10 hover:border-black hover:bg-zinc-50 transition-all text-left">
                  <MapPin size={14} className="text-zinc-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Track Order</span>
                </button>
              </Link>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-black/10 text-zinc-400 hover:text-red-500 hover:border-red-200 transition-all disabled:opacity-50"
            >
              <LogOut size={14} />
              <span className="text-[9px] font-black uppercase tracking-widest">
                {loggingOut ? 'Signing out...' : 'Sign Out'}
              </span>
            </button>
          </div>

          {/* ── Right: Profile details ── */}
          <div className="md:col-span-2 p-8">

            {/* Edit toggle */}
            <div className="flex items-center justify-between mb-8">
              <p className="text-[9px] font-black uppercase tracking-[0.35em] text-zinc-400">
                Account Details
              </p>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-black/10 hover:border-black transition-all"
                >
                  <Edit3 size={11} className="text-zinc-400" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Edit</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white hover:bg-[#4a9a40] transition-all"
                  >
                    <Save size={11} />
                    <span className="text-[8px] font-black uppercase tracking-widest">Save</span>
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-black/10 hover:border-black transition-all"
                  >
                    <X size={11} className="text-zinc-400" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Cancel</span>
                  </button>
                </div>
              )}
            </div>

            {/* Fields */}
            <div className="space-y-0 border border-black/10">

              {/* Full Name */}
              <div className="flex items-start gap-4 p-5 border-b border-black/8">
                <div className="w-8 h-8 border border-black/10 flex items-center justify-center flex-shrink-0 mt-0.5 bg-zinc-50">
                  <User size={13} className="text-zinc-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[8px] font-black uppercase tracking-[0.35em] text-zinc-400 mb-1.5">Full Name</p>
                  {editing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full px-3 py-2 border border-black focus:outline-none focus:bg-zinc-50 text-sm font-bold text-black"
                      placeholder="Your full name"
                    />
                  ) : (
                    <p className="text-sm font-black text-black">{clientUser?.full_name || '—'}</p>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-4 p-5 border-b border-black/8 bg-zinc-50/50">
                <div className="w-8 h-8 border border-black/10 flex items-center justify-center flex-shrink-0 mt-0.5 bg-white">
                  <Phone size={13} className="text-zinc-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[8px] font-black uppercase tracking-[0.35em] text-zinc-400 mb-1.5">Phone Number</p>
                  <p className="text-sm font-black text-black">{clientUser?.phone_number || '—'}</p>
                  <p className="text-[8px] text-zinc-400 font-medium mt-0.5">Primary identifier — cannot be changed</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4 p-5 border-b border-black/8">
                <div className="w-8 h-8 border border-black/10 flex items-center justify-center flex-shrink-0 mt-0.5 bg-zinc-50">
                  <Mail size={13} className="text-zinc-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[8px] font-black uppercase tracking-[0.35em] text-zinc-400 mb-1.5">Email Address</p>
                  {editing ? (
                    <input
                      type="email"
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-black focus:outline-none focus:bg-zinc-50 text-sm font-bold text-black"
                      placeholder="your@email.com"
                    />
                  ) : (
                    <p className="text-sm font-black text-black">{clientUser?.email || '—'}</p>
                  )}
                </div>
              </div>

              {/* District */}
              <div className="flex items-start gap-4 p-5 border-b border-black/8 bg-zinc-50/50">
                <div className="w-8 h-8 border border-black/10 flex items-center justify-center flex-shrink-0 mt-0.5 bg-white">
                  <MapPin size={13} className="text-zinc-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[8px] font-black uppercase tracking-[0.35em] text-zinc-400 mb-1.5">District</p>
                  {editing ? (
                    <input
                      type="text"
                      value={editDistrict}
                      onChange={e => setEditDistrict(e.target.value)}
                      className="w-full px-3 py-2 border border-black focus:outline-none focus:bg-zinc-50 text-sm font-bold text-black"
                      placeholder="e.g. Coimbatore"
                    />
                  ) : (
                    <p className="text-sm font-black text-black">{clientUser?.district || '—'}</p>
                  )}
                </div>
              </div>

              {/* Portal */}
              <div className="flex items-start gap-4 p-5">
                <div className="w-8 h-8 border border-black/10 flex items-center justify-center flex-shrink-0 mt-0.5 bg-zinc-50">
                  <ShieldCheck size={13} className="text-zinc-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[8px] font-black uppercase tracking-[0.35em] text-zinc-400 mb-1.5">Account Type</p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-black text-white text-[8px] font-black uppercase tracking-widest">
                      Farmer
                    </span>
                    <span className="text-[8px] font-bold text-zinc-400">Peace Haven Client Portal</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Info note */}
            <div className="mt-6 p-4 border border-black/8 bg-zinc-50/50 flex gap-3">
              <AlertCircle size={13} className="text-zinc-300 flex-shrink-0 mt-0.5" />
              <p className="text-[9px] font-medium text-zinc-400 leading-relaxed">
                Profile changes are saved locally. To update your phone number or password,
                please contact Peace Haven support at <span className="text-black font-bold">+91 98765 43210</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
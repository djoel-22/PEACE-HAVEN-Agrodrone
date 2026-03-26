import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, Bell, Shield, Database, 
  Globe, Mail, Smartphone, Save,
  User, Lock, CreditCard, Sliders,
  Cloud, Zap, Map, ChevronRight,
  ArrowRight
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const AdminSettingsPage = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const navItems = [
    { id: 'general', label: 'General', icon: <Settings size={20} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={20} /> },
    { id: 'security', label: 'Security', icon: <Shield size={20} /> },
    { id: 'fleet', label: 'Fleet Config', icon: <Zap size={20} /> },
    { id: 'billing', label: 'Billing', icon: <CreditCard size={20} /> },
    { id: 'api', label: 'API & Integrations', icon: <Database size={20} /> },
  ];

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div>
          <h1 className="text-6xl font-extrabold uppercase tracking-tight mb-3">Settings <span className="italic lowercase text-zinc-400">control.</span></h1>
          <p className="text-lg font-bold text-zinc-500">Configure global preferences, fleet parameters, and <span className="text-black underline underline-offset-8 decoration-brand-accent decoration-2">Tamil Nadu security protocols</span>.</p>
        </div>
        <button
          onClick={async () => {
            setSaving(true);
            await new Promise(r => setTimeout(r, 600));
            setSaved(true);
            setSaving(false);
            setTimeout(() => setSaved(false), 2000);
          }}
          disabled={saving}
          className="px-8 py-5 text-[8px] font-bold uppercase tracking-[0.3em] bg-black text-white hover:bg-brand-accent hover:text-black transition-all border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3 disabled:opacity-50"
        >
          <Save size={14} />
          {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save All Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-3 space-y-0 border-2 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          {navItems.map((item, i) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center justify-between px-8 py-6 text-[8px] font-bold uppercase tracking-[0.3em] transition-all duration-500 group",
                activeTab === item.id 
                  ? 'bg-black text-white' 
                  : 'text-black hover:bg-zinc-50',
                i !== navItems.length - 1 && "border-b-2 border-black"
              )}
            >
              <div className="flex items-center gap-5">
                <span className={cn(
                  "transition-colors duration-500",
                  activeTab === item.id ? "text-brand-accent" : "text-zinc-400 group-hover:text-black"
                )}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              <ArrowRight size={16} className={cn(
                "transition-all duration-500",
                activeTab === item.id ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-5"
              )} />
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-9">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-12"
          >
            {activeTab === 'general' && (
              <div className="space-y-12">
                <div className="border-2 border-black p-12 bg-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-center gap-6 mb-12">
                    <div className="w-16 h-16 border-2 border-black flex items-center justify-center text-black bg-brand-accent shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                      <Sliders size={28} />
                    </div>
                    <h3 className="text-4xl font-extrabold uppercase tracking-tight">General <span className="italic lowercase text-zinc-400">configuration.</span></h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-5">
                      <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.4em] px-1">System Name</label>
                      <div className="border-2 border-black">
                        <input 
                          type="text" 
                          defaultValue="Peace Haven Tamil Nadu Operations" 
                          className="w-full px-8 py-6 bg-white focus:outline-none font-extrabold text-xl uppercase tracking-tight"
                        />
                      </div>
                    </div>
                    <div className="space-y-5">
                      <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.4em] px-1">Support Email</label>
                      <div className="border-2 border-black">
                        <input 
                          type="email" 
                          defaultValue="ops@peacehaven.com" 
                          className="w-full px-8 py-6 bg-white focus:outline-none font-extrabold text-xl uppercase tracking-tight"
                        />
                      </div>
                    </div>
                    <div className="space-y-5">
                      <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.4em] px-1">Default Currency</label>
                      <div className="border-2 border-black">
                        <select className="w-full px-8 py-6 bg-white focus:outline-none font-bold text-xs uppercase tracking-[0.3em] appearance-none cursor-pointer">
                          <option>INR (₹) - Indian Rupee</option>
                          <option>USD ($) - US Dollar</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-5">
                      <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.4em] px-1">Timezone</label>
                      <div className="border-2 border-black">
                        <select className="w-full px-8 py-6 bg-white focus:outline-none font-bold text-xs uppercase tracking-[0.3em] appearance-none cursor-pointer">
                          <option>(GMT+05:30) Kolkata</option>
                          <option>(GMT+00:00) UTC</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-2 border-black p-12 bg-zinc-50 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-center gap-6 mb-12">
                    <div className="w-16 h-16 border-2 border-black flex items-center justify-center text-white bg-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                      <Bell size={28} />
                    </div>
                    <h3 className="text-4xl font-extrabold uppercase tracking-tight">Notification <span className="italic lowercase text-zinc-400">channels.</span></h3>
                  </div>

                  <div className="space-y-0 border-2 border-black">
                    {[
                      { label: 'WhatsApp Updates', desc: 'Send automated booking confirmations via WhatsApp Business API.', icon: <Smartphone size={20} /> },
                      { label: 'Email Reports', desc: 'Daily operational summary sent to management team.', icon: <Mail size={20} /> },
                      { label: 'System Alerts', desc: 'Push notifications for critical drone and battery events.', icon: <Bell size={20} /> },
                    ].map((item, i) => (
                      <div key={i} className={cn(
                        "flex items-center justify-between p-8 bg-white group hover:bg-zinc-50 transition-all duration-500",
                        i !== 2 && "border-b-2 border-black"
                      )}>
                        <div className="flex items-center gap-8">
                          <div className="w-12 h-12 border-2 border-black flex items-center justify-center text-zinc-400 group-hover:bg-black group-hover:text-white transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-none">
                            {item.icon}
                          </div>
                          <div>
                            <p className="text-xl font-extrabold uppercase tracking-tight text-black leading-none mb-2.5">{item.label}</p>
                            <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.3em]">{item.desc}</p>
                          </div>
                        </div>
                        <div className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked={i < 2} />
                          <div className="w-16 h-8 bg-zinc-200 border-2 border-black peer-focus:outline-none rounded-none peer peer-checked:after:translate-x-full peer-checked:after:border-black after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-2 after:border-black after:rounded-none after:h-5 after:w-7 after:transition-all peer-checked:bg-brand-accent"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'fleet' && (
              <div className="border-2 border-black p-12 bg-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-6 mb-12">
                  <div className="w-16 h-16 border-2 border-black flex items-center justify-center text-black bg-brand-accent shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <Zap size={28} />
                  </div>
                  <h3 className="text-4xl font-extrabold uppercase tracking-tight">Fleet <span className="italic lowercase text-zinc-400">parameters.</span></h3>
                </div>
                
                <div className="space-y-16">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                    <div className="space-y-6">
                      <div className="flex justify-between items-end">
                        <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.4em]">Critical Battery</label>
                        <span className="text-4xl font-extrabold uppercase tracking-tight">20%</span>
                      </div>
                      <div className="relative h-8 border-2 border-black bg-zinc-50 p-1">
                        <input type="range" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" defaultValue="20" />
                        <div className="h-full bg-black" style={{ width: '20%' }}></div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="flex justify-between items-end">
                        <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.4em]">Max Wind Speed</label>
                        <span className="text-4xl font-extrabold uppercase tracking-tight">15 km/h</span>
                      </div>
                      <div className="relative h-8 border-2 border-black bg-zinc-50 p-1">
                        <input type="range" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" defaultValue="15" max="30" />
                        <div className="h-full bg-brand-accent" style={{ width: '50%' }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="p-12 bg-black text-white border-2 border-black relative overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,255,255,0.1)]">
                    <div className="relative z-10">
                      <div className="flex items-center gap-5 mb-8">
                        <Cloud className="text-brand-accent" size={24} />
                        <h4 className="text-2xl font-extrabold uppercase tracking-tight">Weather <span className="italic lowercase text-brand-accent">safety logic.</span></h4>
                      </div>
                      <p className="text-xl font-bold text-zinc-400 leading-relaxed max-w-3xl">
                        System will automatically flag bookings in Tamil Nadu as <span className="text-white underline underline-offset-8 decoration-brand-accent decoration-2">"At Risk"</span> if forecasted wind exceeds threshold or precipitation probability is {'>'} 40%.
                      </p>
                    </div>
                    <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-brand-accent/10 rounded-full blur-3xl"></div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

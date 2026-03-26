import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, Phone, Mail, 
  HelpCircle, ChevronDown, ArrowRight, MessageCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const SupportPage = () => {
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  const faqs = [
    { q: "How fast will I receive my service?", a: "Typically within 24-48 hours of booking confirmation, depending on weather conditions in Tamil Nadu." },
    { q: "What chemicals do you use?", a: "We use standard agricultural chemicals provided by you (the farmer). Our drones are optimized for precise application of your chosen pesticides." },
    { q: "Is it safe for my livestock?", a: "Yes, our precision spraying minimizes drift, but we recommend keeping livestock away during the operation." },
    { q: "How do I pay for the service?", a: "We accept UPI, Bank Transfer, and Cash on delivery after the service is completed." },
  ];

  return (
    <div className="relative min-h-screen bg-white bg-grid">
      <div className="max-w-3xl mx-auto px-5 py-10 md:py-12 relative z-10">
        <div className="text-center mb-10">
          <div className="inline-block px-2.5 py-1 bg-black text-white text-[8px] font-black uppercase tracking-[0.3em] mb-5">
            Support Center
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-3 tracking-tighter uppercase">Help & <br /><span className="text-italics lowercase text-zinc-400">support.</span></h1>
          <p className="text-base font-bold text-zinc-500">We're here to help farmers across <span className="text-black">Tamil Nadu</span> grow better crops.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-black mb-12">
          <div className="p-6 bg-brand-accent text-black border-black md:border-r border-b md:border-b-0 flex flex-col justify-between min-h-[220px]">
            <div>
              <div className="w-10 h-10 bg-black text-white flex items-center justify-center mb-5 border border-black">
                <MessageCircle size={20} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tighter mb-1.5">WhatsApp Support</h3>
              <p className="text-sm font-bold leading-tight opacity-70 mb-5">Chat with our experts for quick booking and technical help.</p>
            </div>
            <a
              href="https://wa.me/919876543210?text=Hello%2C%20I%20need%20help%20with%20my%20Peace%20Haven%20drone%20service."
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <button className="dj-button-filled bg-black text-white border-black hover:bg-white hover:text-black w-full py-2.5 text-sm">
                Start Chat
              </button>
            </a>
          </div>

          <div className="p-6 bg-black text-white flex flex-col justify-between min-h-[220px]">
            <div>
              <div className="w-10 h-10 bg-brand-accent text-black flex items-center justify-center mb-5 border border-black">
                <Phone size={20} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tighter mb-1.5">Call Us Directly</h3>
              <p className="text-sm font-bold leading-tight opacity-70 mb-5">Available Mon-Sat, 9 AM to 6 PM for all your farm needs.</p>
            </div>
            <a href="tel:+919876543210" className="block">
              <button className="dj-button-filled bg-brand-accent text-black border-black hover:bg-white hover:text-black w-full py-2.5 text-sm">
                +91 98765 43210
              </button>
            </a>
          </div>
        </div>

        <div className="space-y-5">
          <h3 className="text-xl font-black uppercase tracking-tighter mb-6 flex items-center gap-2.5">
            <HelpCircle size={20} className="text-brand-accent" />
            Frequently Asked Questions
          </h3>
          <div className="space-y-0 border border-black divide-y divide-black">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-5 transition-all cursor-pointer group",
                  openFaq === idx ? "bg-zinc-50" : "bg-white hover:bg-zinc-50"
                )}
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              >
                <div className="flex justify-between items-center">
                  <p className="font-black uppercase tracking-tight text-base">{faq.q}</p>
                  <motion.div
                    animate={{ rotate: openFaq === idx ? 180 : 0 }}
                  >
                    <ChevronDown size={16} className={cn(
                      "transition-colors",
                      openFaq === idx ? "text-brand-accent" : "text-zinc-400 group-hover:text-black"
                    )} />
                  </motion.div>
                </div>
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 text-sm text-zinc-500 font-bold leading-relaxed pt-3 border-t border-black/10">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 p-8 bg-white border border-black text-center">
          <Mail size={28} className="mx-auto mb-5 text-zinc-300" />
          <h4 className="text-lg font-black uppercase tracking-tighter mb-1.5">Still have questions?</h4>
          <p className="text-sm text-zinc-500 font-bold mb-5">Send us an email and we'll get back to you within 24 hours.</p>
          <p className="text-base font-black text-brand-accent bg-black px-3 py-1.5 inline-block">support@peacehaven.farm</p>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, X, CheckCircle2, ThumbsUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { apiFetch } from '../../lib/api';

interface FeedbackModalProps {
  orderId: number;
  bookingId: string;
  pilotName?: string;
  onClose: () => void;
}

const StarRating = ({
  label, value, onChange
}: { label: string; value: number; onChange: (v: number) => void }) => (
  <div className="flex items-center justify-between py-3 border-b border-black/10 last:border-0">
    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            size={20}
            className={cn(
              'transition-colors',
              star <= value ? 'fill-[#4a9a40] text-[#4a9a40]' : 'text-zinc-200'
            )}
          />
        </button>
      ))}
    </div>
  </div>
);

export const FeedbackModal = ({ orderId, bookingId, pilotName, onClose }: FeedbackModalProps) => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const [overallRating,  setOverallRating]  = useState(0);
  const [sprayQuality,   setSprayQuality]   = useState(0);
  const [pilotBehavior,  setPilotBehavior]  = useState(0);
  const [timeliness,     setTimeliness]     = useState(0);
  const [comments,       setComments]       = useState('');
  const [wouldRecommend, setWouldRecommend] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (overallRating === 0) { setError('Please give an overall rating.'); return; }
    setLoading(true); setError(null);
    try {
      await apiFetch('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          service_request_id: orderId,
          overall_rating:     overallRating,
          spray_quality:      sprayQuality  || null,
          pilot_behavior:     pilotBehavior || null,
          timeliness:         timeliness    || null,
          comments:           comments      || null,
          would_recommend:    wouldRecommend,
        }),
      });
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white border border-black w-full max-w-md relative z-10 overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="p-6 border-b border-black flex items-start justify-between bg-black text-white">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-1">Rate Your Service</p>
              <h2 className="text-2xl font-black uppercase tracking-tighter">{bookingId}</h2>
              {pilotName && (
                <p className="text-[9px] font-bold text-zinc-400 mt-1">Pilot: {pilotName}</p>
              )}
            </div>
            <button onClick={onClose} className="w-8 h-8 border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition-all">
              <X size={16} />
            </button>
          </div>

          {submitted ? (
            <div className="p-10 text-center">
              <div className="w-16 h-16 bg-[#4a9a40] flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Thank You!</h3>
              <p className="text-sm font-bold text-zinc-500 mb-8">Your feedback helps us serve Tamil Nadu farmers better.</p>
              <button onClick={onClose} className="dj-button-filled px-10 py-3">Close</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-300 text-red-700 text-sm font-bold">
                  {error}
                </div>
              )}

              {/* Overall rating - prominent */}
              <div className="text-center p-6 bg-zinc-50 border border-black/10">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-4">Overall Rating *</p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setOverallRating(star)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        size={36}
                        className={cn(
                          'transition-colors',
                          star <= overallRating ? 'fill-[#4a9a40] text-[#4a9a40]' : 'text-zinc-200'
                        )}
                      />
                    </button>
                  ))}
                </div>
                {overallRating > 0 && (
                  <p className="text-sm font-black uppercase tracking-tight mt-3 text-[#4a9a40]">
                    {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][overallRating]}
                  </p>
                )}
              </div>

              {/* Detailed ratings */}
              <div className="border border-black/10 px-4">
                <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 py-3 border-b border-black/10">Detailed Ratings</p>
                <StarRating label="Spray Quality"   value={sprayQuality}  onChange={setSprayQuality}  />
                <StarRating label="Pilot Behaviour" value={pilotBehavior} onChange={setPilotBehavior} />
                <StarRating label="Timeliness"      value={timeliness}    onChange={setTimeliness}    />
              </div>

              {/* Would recommend */}
              <div className="flex items-center justify-between p-4 border border-black/10">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Would you recommend us?</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setWouldRecommend(true)}
                    className={cn('px-4 py-2 text-[8px] font-black uppercase tracking-widest border transition-all',
                      wouldRecommend ? 'bg-black text-white border-black' : 'border-black/20 text-zinc-400 hover:border-black')}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setWouldRecommend(false)}
                    className={cn('px-4 py-2 text-[8px] font-black uppercase tracking-widest border transition-all',
                      !wouldRecommend ? 'bg-black text-white border-black' : 'border-black/20 text-zinc-400 hover:border-black')}
                  >
                    No
                  </button>
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-2">
                <label className="text-[8px] font-black uppercase tracking-widest text-zinc-400">
                  Comments (Optional)
                </label>
                <textarea
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  placeholder="Tell us about your experience..."
                  rows={3}
                  className="w-full px-4 py-3 border border-black focus:outline-none focus:bg-zinc-50 text-sm font-bold text-black placeholder:text-zinc-300 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || overallRating === 0}
                className="dj-button-filled w-full h-12 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ThumbsUp size={16} />
                {loading ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
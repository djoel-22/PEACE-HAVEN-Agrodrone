import React, { useEffect, useState } from 'react';
import { Star, MessageSquare, ThumbsUp, User, X } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { cn } from '../../lib/utils';

interface FeedbackItem {
  id: number;
  order_id: number;
  overall_rating: number;
  spray_quality: number | null;
  pilot_behavior: number | null;
  timeliness: number | null;
  comments: string | null;
  pilot_name: string | null;
  would_recommend: boolean;
  submitted_at: string | null;
}

const StarRow = ({ rating }: { rating: number | null }) => {
  if (!rating) return <span className="text-zinc-300 text-[8px] font-bold">—</span>;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={10}
          className={i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-200 fill-zinc-200'} />
      ))}
    </div>
  );
};

export const AdminFeedbackPage = () => {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<FeedbackItem | null>(null);

  useEffect(() => {
    apiFetch<{ total: number; average_rating: number; feedbacks: FeedbackItem[] }>('/api/feedback/all')
      .then(d => { setFeedbacks(d.feedbacks); setAvgRating(d.average_rating); setTotal(d.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const recommendPct = total > 0
    ? Math.round((feedbacks.filter(f => f.would_recommend).length / total) * 100)
    : 0;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-extrabold uppercase tracking-tight mb-2.5">Feedback</h1>
        <p className="text-base font-bold text-zinc-500">
          Customer ratings after completed <span className="text-black underline underline-offset-4">spray services</span>.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-black">
        {[
          { label: 'Total Reviews',    value: String(total),                          icon: MessageSquare, sub: 'All time'              },
          { label: 'Average Rating',   value: total > 0 ? `${avgRating} / 5` : '—',  icon: Star,          sub: 'Overall satisfaction', stars: avgRating },
          { label: 'Would Recommend',  value: total > 0 ? `${recommendPct}%` : '—',  icon: ThumbsUp,      sub: `${feedbacks.filter(f=>f.would_recommend).length} of ${total}` },
        ].map((card, idx) => (
          <div key={card.label} className={cn('p-6 flex flex-col gap-4 bg-white border-black', idx !== 2 && 'border-r')}>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 border border-black flex items-center justify-center">
                <card.icon size={18} />
              </div>
              <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-zinc-400">{card.sub}</span>
            </div>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-1">{card.label}</p>
              <p className="text-3xl font-extrabold tracking-tight">{card.value}</p>
              {card.stars && card.stars > 0 ? (
                <div className="flex gap-1 mt-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14}
                      className={i < Math.round(card.stars!) ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-200 fill-zinc-200'} />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="border border-black bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-black bg-zinc-50">
          <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-zinc-500">{total} review{total !== 1 ? 's' : ''}</p>
        </div>
        {loading ? (
          <div className="p-16 text-center text-zinc-400 font-bold">Loading feedback...</div>
        ) : feedbacks.length === 0 ? (
          <div className="p-16 text-center">
            <Star size={32} className="mx-auto mb-4 text-zinc-200" />
            <p className="font-extrabold uppercase tracking-tight text-xl mb-1">No feedback yet</p>
            <p className="text-sm text-zinc-400 font-bold">Feedback appears here after customers rate completed orders.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black text-white">
                  {['Order', 'Overall', 'Spray Quality', 'Pilot', 'Timeliness', 'Recommend', 'Date', ''].map(h => (
                    <th key={h} className="px-6 py-4 text-[8px] font-bold uppercase tracking-[0.4em] border-r border-white/10 last:border-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {feedbacks.map(f => (
                  <tr key={f.id} className="hover:bg-zinc-50 cursor-pointer transition-colors" onClick={() => setSelected(f)}>
                    <td className="px-6 py-5 border-r border-black/5">
                      <p className="font-extrabold text-sm tracking-tight">AGR{String(f.order_id).padStart(4,'0')}</p>
                      {f.pilot_name && (
                        <p className="text-[8px] text-zinc-400 font-bold flex items-center gap-1 mt-0.5">
                          <User size={9} /> {f.pilot_name}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-5 border-r border-black/5"><StarRow rating={f.overall_rating} /></td>
                    <td className="px-6 py-5 border-r border-black/5"><StarRow rating={f.spray_quality} /></td>
                    <td className="px-6 py-5 border-r border-black/5"><StarRow rating={f.pilot_behavior} /></td>
                    <td className="px-6 py-5 border-r border-black/5"><StarRow rating={f.timeliness} /></td>
                    <td className="px-6 py-5 border-r border-black/5">
                      <span className={cn('text-[8px] font-bold uppercase tracking-widest px-2.5 py-1 border',
                        f.would_recommend ? 'border-[#4a9a40] text-[#4a9a40] bg-[#4a9a40]/5' : 'border-zinc-300 text-zinc-400')}>
                        {f.would_recommend ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-6 py-5 border-r border-black/5">
                      <p className="text-[8px] font-bold text-zinc-400">
                        {f.submitted_at ? new Date(f.submitted_at).toLocaleDateString('en-IN') : '—'}
                      </p>
                    </td>
                    <td className="px-6 py-5">{f.comments && <MessageSquare size={14} className="text-zinc-400" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <div className="bg-white border border-black w-full max-w-lg">
            <div className="p-6 border-b border-black flex justify-between items-start bg-zinc-50">
              <div>
                <h3 className="text-2xl font-extrabold uppercase tracking-tight">
                  Order AGR{String(selected.order_id).padStart(4,'0')}
                </h3>
                <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
                  {selected.submitted_at ? new Date(selected.submitted_at).toLocaleString('en-IN') : ''}
                </p>
              </div>
              <button onClick={() => setSelected(null)}
                className="w-8 h-8 border border-black flex items-center justify-center hover:bg-black hover:text-white transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: 'Overall Rating', val: selected.overall_rating },
                { label: 'Spray Quality',  val: selected.spray_quality  },
                { label: 'Pilot Behavior', val: selected.pilot_behavior },
                { label: 'Timeliness',     val: selected.timeliness     },
              ].map(({ label, val }) => (
                <div key={label} className="flex items-center justify-between">
                  <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-zinc-400">{label}</p>
                  <StarRow rating={val} />
                </div>
              ))}
              <div className="flex items-center justify-between pt-3 border-t border-black/10">
                <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-zinc-400">Would Recommend</p>
                <span className={cn('text-[8px] font-bold uppercase tracking-widest px-2.5 py-1 border',
                  selected.would_recommend ? 'border-[#4a9a40] text-[#4a9a40]' : 'border-zinc-300 text-zinc-400')}>
                  {selected.would_recommend ? 'Yes' : 'No'}
                </span>
              </div>
              {selected.pilot_name && (
                <div className="flex items-center justify-between">
                  <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-zinc-400">Pilot</p>
                  <p className="text-sm font-extrabold uppercase tracking-tight">{selected.pilot_name}</p>
                </div>
              )}
              {selected.comments && (
                <div className="p-4 bg-zinc-50 border border-black/10 mt-2">
                  <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-2">Comments</p>
                  <p className="text-sm font-bold text-zinc-700 leading-relaxed">"{selected.comments}"</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-black bg-zinc-50">
              <button onClick={() => setSelected(null)} className="dj-button-filled w-full py-3">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
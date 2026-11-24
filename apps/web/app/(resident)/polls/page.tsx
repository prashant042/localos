'use client';

import React, { useEffect, useState } from 'react';
import { PortalLayout } from '@/components/layout/PortalLayout';
import { Vote, CheckCircle2, Clock, Check, BarChart2 } from 'lucide-react';
import { formatDate } from '@localos/utils';

export default function ResidentPollsPage() {
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingPollId, setVotingPollId] = useState<string | null>(null);

  useEffect(() => {
    fetchPolls();
  }, []);

  const fetchPolls = async () => {
    try {
      const res = await fetch('/api/v1/polls');
      const json = await res.json();
      if (json.success) setPolls(json.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    setVotingPollId(pollId);
    try {
      const res = await fetch(`/api/v1/polls/${pollId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId }),
      });
      if (res.ok) {
        fetchPolls();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setVotingPollId(null);
    }
  };

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Community Polls & Voting</h1>
          <p className="text-sm text-slate-500">
            Democratic decision-making for RWA projects, amenity rules, and society budgets. 1 vote per flat.
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading polls...</div>
        ) : polls.length === 0 ? (
          <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-500">
            No active polls currently open.
          </div>
        ) : (
          <div className="space-y-6">
            {polls.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <h3 className="text-lg font-bold text-slate-900">{p.title}</h3>
                  <div className="flex items-center space-x-2 text-xs">
                    <span
                      className={`font-bold px-2.5 py-0.5 rounded-full ${
                        p.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {p.status}
                    </span>
                    <span className="text-slate-400">Ends: {formatDate(p.endsAt)}</span>
                  </div>
                </div>

                {p.description && <p className="text-sm text-slate-600 mb-5">{p.description}</p>}

                {/* Poll Options */}
                <div className="space-y-3">
                  {p.options.map((opt: any) => {
                    const isSelected = p.userVotedOptionId === opt.id;
                    const hasVoted = !!p.userVotedOptionId;

                    return (
                      <div
                        key={opt.id}
                        onClick={() => !hasVoted && handleVote(p.id, opt.id)}
                        className={`relative rounded-xl border p-4 transition-all ${
                          !hasVoted ? 'cursor-pointer hover:border-brand-500 hover:bg-slate-50' : ''
                        } ${
                          isSelected
                            ? 'border-brand-500 bg-brand-50/40 ring-1 ring-brand-500'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        {/* Progress Bar background if voted */}
                        {hasVoted && (
                          <div
                            className="absolute left-0 top-0 bottom-0 bg-brand-100/60 rounded-xl transition-all pointer-events-none"
                            style={{ width: `${opt.percentage}%` }}
                          />
                        )}

                        <div className="relative z-10 flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                isSelected
                                  ? 'border-brand-600 bg-brand-600 text-white'
                                  : 'border-slate-300'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <span className={`font-semibold ${isSelected ? 'text-brand-900' : 'text-slate-800'}`}>
                              {opt.text}
                            </span>
                          </div>

                          {hasVoted && (
                            <div className="flex items-center space-x-2 text-xs font-mono font-bold">
                              <span className="text-slate-700">{opt.voteCount} votes</span>
                              <span className="text-brand-700">({opt.percentage}%)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
                  <span>Total Participation: <strong>{p.totalVotes} votes</strong></span>
                  {p.userVotedOptionId && <span className="text-emerald-600 font-bold">✓ You have voted in this poll</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}


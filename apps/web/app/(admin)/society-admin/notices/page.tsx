'use client';

import React, { useEffect, useState } from 'react';
import { PortalLayout } from '@/components/layout/PortalLayout';
import {
  Megaphone,
  PlusCircle,
  Vote,
  Calendar,
  Users,
  CheckCircle2,
  X,
  FileText,
  Clock,
  Pin,
} from 'lucide-react';
import { formatDate } from '@localos/utils';

export default function SocietyAdminNoticesPage() {
  const [notices, setNotices] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'notices' | 'polls'>('notices');

  // New Notice Modal State
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState('ALL_RESIDENTS');
  const [category, setCategory] = useState('GENERAL');
  const [isUrgent, setIsUrgent] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // New Poll Modal State
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollDescription, setPollDescription] = useState('');
  const [pollOptions, setPollOptions] = useState(['Yes, Agree', 'No, Disagree']);
  const [creatingPoll, setCreatingPoll] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [nRes, pRes] = await Promise.all([
        fetch('/api/v1/notices'),
        fetch('/api/v1/polls'),
      ]);
      const nJson = await nRes.json();
      const pJson = await pRes.json();
      if (nJson.success) setNotices(nJson.data || []);
      if (pJson.success) setPolls(pJson.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublishing(true);
    try {
      const res = await fetch('/api/v1/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          audience,
          category,
          isUrgent,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowNoticeModal(false);
        setTitle('');
        setContent('');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPublishing(false);
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingPoll(true);
    try {
      const res = await fetch('/api/v1/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: pollQuestion,
          description: pollDescription,
          options: pollOptions.filter((o) => o.trim() !== ''),
          expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowPollModal(false);
        setPollQuestion('');
        setPollDescription('');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingPoll(false);
    }
  };

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-brand-600" />
              Notices & Community Polls
            </h1>
            <p className="text-sm text-slate-500">
              Publish society announcements, circulars, emergency alerts, and democratic resident voting polls.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNoticeModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Publish Notice
            </button>
            <button
              onClick={() => setShowPollModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
            >
              <Vote className="w-4 h-4" />
              Create Poll
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setTab('notices')}
            className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              tab === 'notices'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            Official Notices ({notices.length})
          </button>
          <button
            onClick={() => setTab('polls')}
            className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              tab === 'polls'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Vote className="w-4 h-4" />
            Active Polls ({polls.length})
          </button>
        </div>

        {/* Content */}
        {tab === 'notices' ? (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-slate-400">Loading notices...</div>
            ) : notices.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No notices published yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Click 'Publish Notice' above to send your first community circular.
                </p>
              </div>
            ) : (
              notices.map((n) => (
                <div
                  key={n.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {n.isUrgent && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[11px] font-bold rounded-md">
                          URGENT
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-md">
                        {n.category}
                      </span>
                      <span className="px-2 py-0.5 bg-brand-50 text-brand-700 text-[11px] font-semibold rounded-md">
                        Audience: {n.audience?.replace('_', ' ')}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">{n.title}</h3>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {formatDate(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{n.content}</p>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="text-center py-12 text-slate-400 col-span-2">Loading polls...</div>
            ) : polls.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 col-span-2">
                <Vote className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No active polls</p>
                <p className="text-xs text-slate-400 mt-1">
                  Create a poll to gather feedback or vote on community initiatives.
                </p>
              </div>
            ) : (
              polls.map((p) => {
                const totalVotes =
                  p.options?.reduce((acc: number, curr: any) => acc + (curr._count?.votes || 0), 0) || 0;
                return (
                  <div
                    key={p.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-base font-bold text-slate-900">{p.question}</h4>
                        <span className="text-xs font-semibold px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md">
                          {totalVotes} Votes
                        </span>
                      </div>
                      {p.description && (
                        <p className="text-xs text-slate-500 mb-4">{p.description}</p>
                      )}
                      <div className="space-y-2">
                        {(p.options || []).map((opt: any) => {
                          const votes = opt._count?.votes || 0;
                          const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                          return (
                            <div key={opt.id} className="space-y-1">
                              <div className="flex justify-between text-xs font-semibold text-slate-700">
                                <span>{opt.text}</span>
                                <span>
                                  {votes} ({pct}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-purple-600 h-2 rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100">
                      Ends: {formatDate(p.expiresAt)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Modal Notice */}
        {showNoticeModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-900">Publish Society Notice</h3>
                <button
                  onClick={() => setShowNoticeModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateNotice} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notice Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Scheduled Lift Maintenance & Power Backup Trial"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Audience
                    </label>
                    <select
                      value={audience}
                      onChange={(e) => setAudience(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="ALL_RESIDENTS">All Residents</option>
                      <option value="OWNERS">Owners Only</option>
                      <option value="TENANTS">Tenants Only</option>
                      <option value="COMMITTEE">Committee Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="GENERAL">General Notice</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="EVENT">Cultural / AGM</option>
                      <option value="EMERGENCY">Emergency / Security</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notice Content
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Provide full announcement details..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="urgent"
                    checked={isUrgent}
                    onChange={(e) => setIsUrgent(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <label htmlFor="urgent" className="text-xs font-semibold text-slate-700">
                    Mark as Urgent (Broadcast high-priority badge)
                  </label>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNoticeModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={publishing}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    {publishing ? 'Publishing...' : 'Publish'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Poll */}
        {showPollModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-900">Create Community Poll</h3>
                <button
                  onClick={() => setShowPollModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreatePoll} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Poll Question
                  </label>
                  <input
                    type="text"
                    required
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder="e.g. Approve installation of Solar Rooftop Inverter?"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Details / Context
                  </label>
                  <textarea
                    rows={2}
                    value={pollDescription}
                    onChange={(e) => setPollDescription(e.target.value)}
                    placeholder="Short description of the proposal and costs..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Options (1 per row)
                  </label>
                  {pollOptions.map((opt, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...pollOptions];
                        newOpts[idx] = e.target.value;
                        setPollOptions(newOpts);
                      }}
                      className="w-full mb-2 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setPollOptions([...pollOptions, ''])}
                    className="text-xs text-purple-600 hover:text-purple-800 font-semibold"
                  >
                    + Add Option
                  </button>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPollModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingPoll}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    {creatingPoll ? 'Creating...' : 'Create Poll'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}


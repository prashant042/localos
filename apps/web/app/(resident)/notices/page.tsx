'use client';

import React, { useEffect, useState } from 'react';
import { PortalLayout } from '@/components/layout/PortalLayout';
import { Megaphone, Pin, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { formatDate } from '@localos/utils';

export default function ResidentNoticesPage() {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const res = await fetch('/api/v1/notices');
      const json = await res.json();
      if (json.success) setNotices(json.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Society Notices & Announcements</h1>
          <p className="text-sm text-slate-500">Official circulars, maintenance schedules, and broadcast alerts from the RWA.</p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading notices...</div>
        ) : notices.length === 0 ? (
          <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-500">
            No active notices on the board.
          </div>
        ) : (
          <div className="space-y-4">
            {notices.map((n) => (
              <div
                key={n.id}
                className={`bg-white rounded-2xl border p-6 shadow-sm transition-all ${
                  n.isPinned ? 'border-brand-300 ring-1 ring-brand-100' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center space-x-2">
                    {n.isPinned && (
                      <span className="inline-flex items-center text-[10px] bg-brand-100 text-brand-800 font-bold px-2 py-0.5 rounded-full">
                        <Pin className="w-3 h-3 mr-1" />
                        PINNED
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        n.priority === 'URGENT'
                          ? 'bg-rose-100 text-rose-800'
                          : n.priority === 'IMPORTANT'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {n.priority}
                    </span>
                    <span className="text-xs text-slate-400">Audience: {n.audience.replace('_', ' ')}</span>
                  </div>

                  <span className="text-xs text-slate-400 flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1" />
                    {formatDate(n.publishedAt)}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-2">{n.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{n.content}</p>

                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
                  Published by: <span className="font-semibold text-slate-700">{n.publishedBy?.fullName}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}


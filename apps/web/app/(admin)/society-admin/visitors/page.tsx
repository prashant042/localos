'use client';

import React, { useEffect, useState } from 'react';
import { PortalLayout } from '@/components/layout/PortalLayout';
import {
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  Truck,
  Car,
  User,
  AlertCircle,
  Phone,
  DoorOpen,
} from 'lucide-react';
import { formatDate } from '@localos/utils';

export default function SocietyAdminVisitorsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/v1/visitors/logs');
      const json = await res.json();
      if (json.success && json.data) {
        setLogs(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async (logId: string) => {
    try {
      const res = await fetch('/api/v1/visitors/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorLogId: logId }),
      });
      const json = await res.json();
      if (json.success) {
        fetchLogs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = logs.filter((l) => {
    const matchesSearch =
      l.visitor?.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.visitor?.phone?.includes(search) ||
      l.flat?.flatNumber?.toLowerCase().includes(search.toLowerCase()) ||
      l.purpose?.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'ALL' || l.visitor?.visitorType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-brand-600" />
              Gate & Visitor Management
            </h1>
            <p className="text-sm text-slate-500">
              Live security gate logs, delivery partner tracking, and resident approval statuses.
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by visitor name, phone, flat, or purpose..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Types</option>
              <option value="GUEST">Guest</option>
              <option value="DELIVERY">Delivery</option>
              <option value="CAB">Cab</option>
              <option value="SERVICE">Service Staff</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Visitor</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Visiting Flat</th>
                  <th className="py-3 px-4">Check-In Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      Loading gate logs...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No visitor records found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((log) => {
                    const isInside = !log.checkOutTime;
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 text-xs">
                            {log.visitor?.name || 'Visitor'}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {log.visitor?.phone || 'N/A'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                            {log.visitor?.visitorType || 'GUEST'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-800 text-xs">
                            Flat {log.flat?.flatNumber || '—'}
                          </span>
                          <div className="text-[11px] text-slate-400">
                            {log.flat?.block?.name || ''}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {formatDate(log.checkInTime)}
                        </td>
                        <td className="py-3 px-4">
                          {isInside ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Inside Society
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                              Checked Out ({formatDate(log.checkOutTime)})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isInside && (
                            <button
                              onClick={() => handleCheckOut(log.id)}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                            >
                              Check Out
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}


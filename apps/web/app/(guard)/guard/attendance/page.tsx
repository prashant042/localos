'use client';

import React, { useEffect, useState } from 'react';
import { PortalLayout } from '@/components/layout/PortalLayout';
import {
  UserCheck,
  Search,
  CheckCircle2,
  Clock,
  Phone,
  User,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { formatDate } from '@localos/utils';

export default function GuardAttendancePage() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [punchingId, setPunchingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sRes, aRes] = await Promise.all([
        fetch('/api/v1/staff'),
        fetch('/api/v1/staff/attendance'),
      ]);
      const sJson = await sRes.json();
      const aJson = await aRes.json();
      if (sJson.success) setStaffList(sJson.data || []);
      if (aJson.success) setAttendanceLogs(aJson.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePunch = async (staffId: string, type: 'IN' | 'OUT') => {
    setPunchingId(staffId);
    try {
      const res = await fetch('/api/v1/staff/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, type }),
      });
      const json = await res.json();
      if (json.success) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPunchingId(null);
    }
  };

  const filteredStaff = staffList.filter(
    (s) =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search) ||
      s.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-brand-600" />
            Daily Staff Punch Register
          </h1>
          <p className="text-sm text-slate-500">
            One-touch security punch-in & punch-out for society staff, housemaids, cooks, and guards.
          </p>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff by name or mobile number..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Staff Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-3 text-center py-12 text-slate-400">Loading staff roster...</div>
          ) : filteredStaff.length === 0 ? (
            <div className="col-span-3 text-center py-12 bg-white rounded-2xl border border-slate-200">
              <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No staff records found</p>
            </div>
          ) : (
            filteredStaff.map((staff) => {
              const todayLog = attendanceLogs.find(
                (a) => a.staffId === staff.id && !a.punchOut
              );
              const isPunchedIn = !!todayLog;

              return (
                <div
                  key={staff.id}
                  className={`bg-white p-5 rounded-2xl border transition-all ${
                    isPunchedIn
                      ? 'border-emerald-300 ring-2 ring-emerald-500/10 shadow-sm'
                      : 'border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{staff.name}</h4>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                        {staff.role}
                      </span>
                    </div>
                    {isPunchedIn ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        ON DUTY
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        OFF DUTY
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 space-y-1 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{staff.phone}</span>
                    </div>
                    {isPunchedIn && (
                      <div className="text-emerald-700 font-medium">
                        Punched In: {formatDate(todayLog.punchIn)}
                      </div>
                    )}
                  </div>

                  <div>
                    {isPunchedIn ? (
                      <button
                        onClick={() => handlePunch(staff.id, 'OUT')}
                        disabled={punchingId === staff.id}
                        className="w-full py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition-colors disabled:opacity-50"
                      >
                        {punchingId === staff.id ? 'Recording...' : 'Punch Out (Exit Duty)'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePunch(staff.id, 'IN')}
                        disabled={punchingId === staff.id}
                        className="w-full py-2.5 px-3 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50"
                      >
                        {punchingId === staff.id ? 'Recording...' : 'Punch In (Duty Start)'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </PortalLayout>
  );
}


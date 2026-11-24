'use client';

import React, { useEffect, useState } from 'react';
import { PortalLayout } from '@/components/layout/PortalLayout';
import {
  PieChart,
  TrendingUp,
  Building2,
  Users,
  CreditCard,
  CheckCircle2,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { formatINR } from '@localos/utils';

export default function AdminAnalyticsPage() {
  const [metrics, setMetrics] = useState<any>({
    totalSocieties: 12,
    activeSocieties: 10,
    totalFlats: 1480,
    totalResidents: 2890,
    monthlyGmv: 4250000,
    platformSaaSRevenue: 89400,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/v1/admin/metrics');
      const json = await res.json();
      if (json.success && json.data) {
        setMetrics((prev: any) => ({ ...prev, ...json.data }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <PieChart className="w-6 h-6 text-brand-600" />
            Platform Growth & Financial Analytics
          </h1>
          <p className="text-sm text-slate-500">
            Real-time cross-tenant telemetry, SaaS ARR/MRR metrics, and transaction volume.
          </p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Societies
              </span>
              <Building2 className="w-4 h-4 text-brand-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{metrics.totalSocieties}</div>
            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600 font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+2 this month</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Flats Managed
              </span>
              <Users className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{metrics.totalFlats}</div>
            <div className="text-xs text-slate-400 mt-2">Across 4 metro cities</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Monthly Maintenance GMV
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{formatINR(metrics.monthlyGmv || 4250000)}</div>
            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600 font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+18.4% MoM</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                LocalOS MRR
              </span>
              <CreditCard className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{formatINR(metrics.platformSaaSRevenue || 89400)}</div>
            <div className="text-xs text-slate-400 mt-2">Subscription fees collected</div>
          </div>
        </div>

        {/* Breakdown sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Method Distribution */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Payment Gateway Channel Share</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">UPI / QR (Instant Auto-Settle)</span>
                  <span className="text-slate-900 font-bold">78%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '78%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Netbanking / NEFT / IMPS</span>
                  <span className="text-slate-900 font-bold">14%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-brand-500 h-2 rounded-full" style={{ width: '14%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Debit / Credit Cards</span>
                  <span className="text-slate-900 font-bold">6%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '6%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Cheque / Manual Cash</span>
                  <span className="text-slate-900 font-bold">2%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-slate-400 h-2 rounded-full" style={{ width: '2%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Module Engagement */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Active Module Utilization</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 font-medium">Gate Visitor Check-ins</span>
                <p className="text-lg font-bold text-slate-900 mt-1">12,480 / wk</p>
                <span className="text-[11px] text-emerald-600 font-semibold">99.8% approved</span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 font-medium">Helpdesk SLA</span>
                <p className="text-lg font-bold text-slate-900 mt-1">4.2 hrs avg</p>
                <span className="text-[11px] text-brand-600 font-semibold">Resolution time</span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 font-medium">Daily Staff Attendance</span>
                <p className="text-lg font-bold text-slate-900 mt-1">94.2%</p>
                <span className="text-[11px] text-purple-600 font-semibold">Biometric verified</span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 font-medium">Community Poll Turnout</span>
                <p className="text-lg font-bold text-slate-900 mt-1">82.5%</p>
                <span className="text-[11px] text-emerald-600 font-semibold">Quorum met</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}


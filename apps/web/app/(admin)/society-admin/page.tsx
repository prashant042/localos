'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PortalLayout } from '@/components/layout/PortalLayout';
import {
  Building2,
  Users,
  Receipt,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  Clock,
  ArrowRight,
  PlusCircle,
  CheckCircle2,
  CreditCard,
  FileSpreadsheet
} from 'lucide-react';
import { formatINR, formatDate } from '@localos/utils';

export default function SocietyAdminDashboard() {
  const [society, setSociety] = useState<any>(null);
  const [invoicesSummary, setInvoicesSummary] = useState<any>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [visitorsCount, setVisitorsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminDashboard();
  }, []);

  const fetchAdminDashboard = async () => {
    try {
      const [socRes, invRes, compRes, visRes] = await Promise.all([
        fetch('/api/v1/societies/current'),
        fetch('/api/v1/billing/invoices?limit=1'),
        fetch('/api/v1/complaints?limit=5'),
        fetch('/api/v1/visitors/logs'),
      ]);

      const [socJson, invJson, compJson, visJson] = await Promise.all([
        socRes.json(),
        invRes.json(),
        compRes.json(),
        visRes.json(),
      ]);

      if (socJson.success) setSociety(socJson.data);
      if (invJson.success && invJson.meta?.summary) setInvoicesSummary(invJson.meta.summary);
      if (compJson.success) setComplaints(compJson.data || []);
      if (visJson.success) setVisitorsCount(visJson.data?.length || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const totalBilled = invoicesSummary?.totalBilled || 245000;
  const totalCollected = invoicesSummary?.totalCollected || 185000;
  const totalPending = invoicesSummary?.totalPending || 60000;
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                RWA Committee Console
              </span>
              <span className="text-xs font-mono text-slate-400">{society?.code}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {society?.name || 'Greenwood Heights RWA'}
            </h1>
            <p className="text-xs text-slate-500">
              {society?.address}, {society?.city} &bull; Reg: {society?.registrationNumber || 'DRB-3/SOR/1042'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/society-admin/flats"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              Import CSV
            </Link>
            <Link
              href="/society-admin/billing"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-600/20 transition-all flex items-center"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Generate Bills
            </Link>
          </div>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
              <span>TOTAL BILLED (NOV 2026)</span>
              <Receipt className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900">{formatINR(totalBilled)}</div>
            <div className="mt-2 text-[11px] text-slate-500">Across {society?._count?.flats || 100} flats</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
              <span>COLLECTED (UPI / RAZORPAY)</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600">{formatINR(totalCollected)}</div>
            <div className="mt-2 text-[11px] text-emerald-700 font-bold">{collectionRate}% collection rate</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
              <span>PENDING / OVERDUE</span>
              <AlertCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-rose-600">{formatINR(totalPending)}</div>
            <Link href="/society-admin/defaulters" className="mt-2 text-[11px] text-rose-700 font-bold hover:underline block">
              View Defaulters Report &rarr;
            </Link>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
              <span>GATE ACTIVITY TODAY</span>
              <ShieldCheck className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">{visitorsCount}</div>
            <div className="mt-2 text-[11px] text-slate-500">Check-ins & Deliveries logged</div>
          </div>
        </div>

        {/* Middle Section: Collection Progress & Complaints */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Collection Progress & Defaulter Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">Maintenance Collection Progress</h3>
                <p className="text-xs text-slate-500">FY2026-27 Monthly Recovery Status</p>
              </div>
              <Link href="/society-admin/billing" className="text-xs font-bold text-brand-600 hover:text-brand-700">
                Billing Engine &rarr;
              </Link>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-2 my-4">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600">Collected: {formatINR(totalCollected)}</span>
                <span className="text-rose-600">Pending: {formatINR(totalPending)}</span>
              </div>
              <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 transition-all duration-500"
                  style={{ width: `${collectionRate}%` }}
                />
                <div
                  className="bg-rose-400 transition-all duration-500"
                  style={{ width: `${100 - collectionRate}%` }}
                />
              </div>
            </div>

            {/* Collection Summary Pills */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-center">
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Flats Occupied</span>
                <span className="font-bold text-sm text-slate-800">{society?._count?.flats || 4} Flats</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Active Residents</span>
                <span className="font-bold text-sm text-slate-800">{society?._count?.members || 6} Members</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Billing Cycle</span>
                <span className="font-bold text-sm text-slate-800">Monthly</span>
              </div>
            </div>
          </div>

          {/* Open Complaints Snapshot */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-base text-slate-900">Recent Complaints</h3>
                <Link href="/society-admin/complaints" className="text-xs font-bold text-brand-600 hover:text-brand-700">
                  Manage &rarr;
                </Link>
              </div>

              {complaints.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">No active complaints.</div>
              ) : (
                <div className="space-y-3">
                  {complaints.slice(0, 3).map((tkt) => (
                    <div key={tkt.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span className="truncate max-w-[160px]">{tkt.title}</span>
                        <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                          {tkt.priority}
                        </span>
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Flat: {tkt.flat?.flatNumber || 'Common Area'} &bull; {tkt.category?.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/society-admin/complaints"
              className="mt-4 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs text-center transition-colors block"
            >
              Assign Technicians
            </Link>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}


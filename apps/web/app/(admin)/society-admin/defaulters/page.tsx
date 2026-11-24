'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PortalLayout } from '@/components/layout/PortalLayout';
import { AlertTriangle, Send, Phone, Download, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { formatINR, formatDate } from '@localos/utils';

export default function SocietyAdminDefaultersPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [remindingId, setRemindingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDefaulters();
  }, []);

  const fetchDefaulters = async () => {
    try {
      const res = await fetch('/api/v1/billing/reports/defaulters');
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (invoiceId: string) => {
    setRemindingId(invoiceId);
    try {
      await fetch(`/api/v1/billing/invoices/${invoiceId}/remind`, { method: 'POST' });
      alert('Payment reminder dispatched via Email, SMS & WhatsApp!');
    } catch (e) {
      console.error(e);
    } finally {
      setRemindingId(null);
    }
  };

  const defaulters = data?.defaulters || [];
  const summary = data?.summary;

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link href="/society-admin/billing" className="inline-flex items-center text-xs font-semibold text-brand-600 hover:underline mb-1">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back to Billing Overview
            </Link>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Maintenance Defaulters Report</h1>
            <p className="text-sm text-slate-500">Overview of flats with overdue balances and pending collections.</p>
          </div>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center self-start sm:self-auto"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Print / Export PDF
          </button>
        </div>

        {/* Top Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-sm">
              <span className="text-xs font-semibold text-rose-500 uppercase tracking-wider">Total Overdue Dues</span>
              <div className="text-2xl font-black text-rose-600 mt-1">{formatINR(summary.totalOverdueAmount)}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Pending Dues</span>
              <div className="text-2xl font-black text-slate-800 mt-1">{formatINR(summary.totalPendingAmount)}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Defaulter Flats</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{summary.defaulterFlatsCount} Flats</div>
            </div>
          </div>
        )}

        {/* Defaulters Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-3.5 pl-5">Flat Number</th>
                  <th className="p-3.5">Tower / Block</th>
                  <th className="p-3.5">Resident Contact</th>
                  <th className="p-3.5">Pending Invoices</th>
                  <th className="p-3.5">Total Overdue</th>
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">Loading defaulters report...</td>
                  </tr>
                ) : defaulters.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      🎉 Excellent! Zero overdue defaulters in your society.
                    </td>
                  </tr>
                ) : (
                  defaulters.map((d: any) => (
                    <tr key={d.flatId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 pl-5 font-mono font-bold text-slate-900 text-sm">
                        {d.flatNumber}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-700">{d.block}</td>
                      <td className="p-3.5">
                        {d.primaryResident ? (
                          <div>
                            <span className="font-bold text-slate-800">{d.primaryResident.fullName}</span>
                            <div className="text-[10px] text-slate-400 font-mono flex items-center mt-0.5">
                              <Phone className="w-3 h-3 mr-1" />
                              +91 {d.primaryResident.phone}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No resident contact</span>
                        )}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-700">
                        {d.pendingInvoicesCount} invoice(s)
                      </td>
                      <td className="p-3.5 font-mono font-black text-rose-600 text-sm">
                        {formatINR(d.totalPending)}
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        {d.invoices?.[0] && (
                          <button
                            onClick={() => handleSendReminder(d.invoices[0].id)}
                            disabled={remindingId === d.invoices[0].id}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-200 transition-colors text-[11px] inline-flex items-center"
                          >
                            <Send className="w-3.5 h-3.5 mr-1" />
                            {remindingId === d.invoices[0].id ? 'Sending...' : 'Send Reminder'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}


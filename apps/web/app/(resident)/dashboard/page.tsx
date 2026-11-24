'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PortalLayout } from '@/components/layout/PortalLayout';
import {
  Receipt,
  AlertCircle,
  ShieldCheck,
  Megaphone,
  CreditCard,
  PlusCircle,
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Building,
  Check,
  X
} from 'lucide-react';
import { formatINR, formatDate } from '@localos/utils';

export default function ResidentDashboard() {
  const [data, setData] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [waitingVisitors, setWaitingVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingInvoice, setPayingInvoice] = useState<any | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<any | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [meRes, invRes, compRes, notRes, visRes] = await Promise.all([
        fetch('/api/v1/auth/me'),
        fetch('/api/v1/billing/invoices?limit=5'),
        fetch('/api/v1/complaints?limit=5'),
        fetch('/api/v1/notices'),
        fetch('/api/v1/visitors/logs?status=WAITING_APPROVAL'),
      ]);

      const [meJson, invJson, compJson, notJson, visJson] = await Promise.all([
        meRes.json(),
        invRes.json(),
        compRes.json(),
        notRes.json(),
        visRes.json(),
      ]);

      if (meJson.success) setData(meJson.data);
      if (invJson.success) setInvoices(invJson.data || []);
      if (compJson.success) setComplaints(compJson.data || []);
      if (notJson.success) setNotices(notJson.data || []);
      if (visJson.success) setWaitingVisitors(visJson.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleVisitorAction = async (logId: string, action: 'APPROVE' | 'DENY') => {
    try {
      const res = await fetch('/api/v1/visitors/action', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId, action }),
      });
      if (res.ok) {
        setWaitingVisitors((prev) => prev.filter((v) => v.id !== logId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSimulateRazorpayPay = async () => {
    if (!payingInvoice) return;
    try {
      const res = await fetch('/api/v1/payments/razorpay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: payingInvoice.id,
          razorpayOrderId: `order_demo_${Date.now()}`,
          razorpayPaymentId: `pay_rzp_mock_${Date.now()}`,
          amountINR: payingInvoice.balanceAmount,
          paymentMethod: 'UPI',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setPaymentSuccess(json.data);
        setPayingInvoice(null);
        fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Find latest pending invoice
  const pendingInvoice = invoices.find((inv) => inv.balanceAmount > 0);

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Top Flat Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-semibold mb-2">
                <Building className="w-3.5 h-3.5 mr-1.5" />
                {data?.user?.societyName || 'Greenwood Heights RWA'}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Namaste, {data?.user?.fullName} 👋
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                Flat: <span className="font-bold text-white">{data?.flat?.flatNumber || 'A-402'}</span> &bull; {data?.flat?.areaSqFt ? `${data.flat.areaSqFt} sq.ft` : '1750 sq.ft'} ({data?.user?.role === 'TENANT' ? 'Tenant' : 'Owner'})
              </p>
            </div>

            {pendingInvoice && (
              <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 flex items-center justify-between sm:space-x-6">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold block">
                    Total Dues
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                    {formatINR(pendingInvoice.balanceAmount)}
                  </span>
                </div>
                <button
                  onClick={() => setPayingInvoice(pendingInvoice)}
                  className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-brand-500/30 transition-all flex items-center"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay Now
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live Gate Approval Banner */}
        {waitingVisitors.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 shadow-sm animate-pulse">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-amber-500 rounded-full animate-ping"></span>
                <h3 className="font-bold text-amber-900 text-sm sm:text-base">
                  🔔 Gate Visitor Waiting for Approval ({waitingVisitors.length})
                </h3>
              </div>
            </div>
            <div className="space-y-3">
              {waitingVisitors.map((v) => (
                <div key={v.id} className="bg-white p-3 sm:p-4 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-slate-900">{v.visitor?.name}</span>
                    <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">
                      {v.visitor?.visitorType}
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Phone: +91 {v.visitor?.phone} &bull; Purpose: {v.purpose || 'Visit'} &bull; Vehicle: {v.visitor?.vehicleNumber || 'None'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleVisitorAction(v.id, 'APPROVE')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all flex items-center"
                    >
                      <Check className="w-4 h-4 mr-1.5" />
                      Allow Entry
                    </button>
                    <button
                      onClick={() => handleVisitorAction(v.id, 'DENY')}
                      className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs rounded-lg transition-all flex items-center"
                    >
                      <X className="w-4 h-4 mr-1.5" />
                      Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/dues"
            className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-brand-500 hover:shadow-md transition-all group text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-brand-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="font-bold text-sm text-slate-900">Maintenance</div>
            <div className="text-[11px] text-slate-500">Invoices & Receipts</div>
          </Link>

          <Link
            href="/complaints"
            className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-amber-500 hover:shadow-md transition-all group text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="font-bold text-sm text-slate-900">Complaints</div>
            <div className="text-[11px] text-slate-500">Raise & Track Ticket</div>
          </Link>

          <Link
            href="/visitors"
            className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all group text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="font-bold text-sm text-slate-900">Gate Pass</div>
            <div className="text-[11px] text-slate-500">Pre-approve Guests</div>
          </Link>

          <Link
            href="/polls"
            className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-purple-500 hover:shadow-md transition-all group text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Megaphone className="w-5 h-5" />
            </div>
            <div className="font-bold text-sm text-slate-900">Polls & Notices</div>
            <div className="text-[11px] text-slate-500">Vote on RWA Agenda</div>
          </Link>
        </div>

        {/* Two-Column Content: Invoices & Notices */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Maintenance Invoices */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-slate-900 text-base flex items-center">
                <Receipt className="w-4 h-4 mr-2 text-brand-600" />
                Recent Maintenance Invoices
              </h2>
              <Link href="/dues" className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center">
                View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>

            {invoices.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">No maintenance invoices issued yet.</div>
            ) : (
              <div className="space-y-3">
                {invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-900">{inv.invoiceNumber}</div>
                      <div className="text-xs text-slate-500">
                        Due: {formatDate(inv.dueDate)} &bull; {inv.notes || 'Monthly Maintenance'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-sm text-slate-900">{formatINR(inv.totalAmount)}</div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Broadcast Notices */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-slate-900 text-base flex items-center">
                <Megaphone className="w-4 h-4 mr-2 text-brand-600" />
                Society Notices
              </h2>
              <Link href="/notices" className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center">
                View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>

            {notices.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">No active notices.</div>
            ) : (
              <div className="space-y-3">
                {notices.slice(0, 3).map((notice) => (
                  <div key={notice.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-slate-900">{notice.title}</span>
                      <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full">
                        {notice.priority}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">{notice.content}</p>
                    <div className="mt-2 text-[10px] text-slate-400 font-medium">
                      Posted on {formatDate(notice.publishedAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Razorpay UPI Simulator Modal */}
        {payingInvoice && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    ₹
                  </div>
                  <span className="font-bold text-base text-slate-900">Razorpay UPI Checkout</span>
                </div>
                <button
                  onClick={() => setPayingInvoice(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-4 text-center">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">
                  Amount Payable
                </span>
                <span className="text-3xl font-black text-slate-900 my-1 block">
                  {formatINR(payingInvoice.balanceAmount)}
                </span>
                <span className="text-xs text-slate-600">
                  Invoice: {payingInvoice.invoiceNumber}
                </span>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-xs text-slate-600 py-1 border-b border-slate-100">
                  <span>Payee</span>
                  <span className="font-semibold text-slate-800">{data?.user?.societyName}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600 py-1 border-b border-slate-100">
                  <span>Payment Gateway</span>
                  <span className="font-semibold text-blue-600">Razorpay (UPI / Google Pay / PhonePe)</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600 py-1">
                  <span>Convenience Fee</span>
                  <span className="font-semibold text-emerald-600">₹0 (Free)</span>
                </div>
              </div>

              <button
                onClick={handleSimulateRazorpayPay}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all text-sm flex items-center justify-center"
              >
                Simulate Successful UPI Payment
              </button>
            </div>
          </div>
        )}

        {/* Payment Success Dialog */}
        {paymentSuccess && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl border border-slate-200">
              <div className="w-16 h-16 bg-emerald-100 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">Payment Successful!</h3>
              <p className="text-xs text-slate-600 mt-1 mb-4">
                Your maintenance payment has been received and confirmed.
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-1 mb-5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt No:</span>
                  <span className="font-mono font-bold text-slate-900">{paymentSuccess.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Ref:</span>
                  <span className="font-mono text-slate-700">{paymentSuccess.payment?.gatewayPaymentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold text-emerald-600">CONFIRMED</span>
                </div>
              </div>

              <button
                onClick={() => setPaymentSuccess(null)}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-sm transition-all"
              >
                Close & View Receipt
              </button>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}


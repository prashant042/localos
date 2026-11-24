'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PortalLayout } from '@/components/layout/PortalLayout';
import {
  Receipt,
  PlusCircle,
  FileSpreadsheet,
  Search,
  Filter,
  CreditCard,
  Send,
  AlertTriangle,
  Download,
  X,
  CheckCircle2,
  Calendar,
  Settings,
  ArrowRight,
  Wallet,
  History,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { formatINR, formatDate } from '@localos/utils';
import { PaymentMethod } from '@prisma/client';

export default function SocietyAdminBillingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Wallets State
  const [walletData, setWalletData] = useState<{
    flats: any[];
    summary: { totalAdvanceCorpus: number; flatsWithAdvanceCount: number; totalFlats: number };
    recentTransactions: any[];
  } | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);

  // Top-Up Form State
  const [topUpFlatId, setTopUpFlatId] = useState('');
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpMethod, setTopUpMethod] = useState<PaymentMethod>(PaymentMethod.CHEQUE);
  const [topUpReference, setTopUpReference] = useState('');
  const [topUpBank, setTopUpBank] = useState('');
  const [topUpAutoSettle, setTopUpAutoSettle] = useState(true);
  const [topUpNotes, setTopUpNotes] = useState('');
  const [submittingTopUp, setSubmittingTopUp] = useState(false);

  // Bulk Gen State
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [billingPeriodStart, setBillingPeriodStart] = useState('2026-11-01');
  const [billingPeriodEnd, setBillingPeriodEnd] = useState('2026-11-30');
  const [dueDate, setDueDate] = useState('2026-11-16');
  const [notes, setNotes] = useState('Regular monthly maintenance');
  const [generating, setGenerating] = useState(false);

  // Manual Pay State
  const [showManualPayModal, setShowManualPayModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.UPI);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    fetchInvoices();
    fetchWallets();
  }, [statusFilter, search]);

  const fetchInvoices = async () => {
    try {
      const url = new URL('/api/v1/billing/invoices', window.location.origin);
      if (statusFilter) url.searchParams.set('status', statusFilter);
      if (search) url.searchParams.set('search', search);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success) {
        setInvoices(json.data || []);
        if (json.meta?.summary) setSummary(json.meta.summary);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchWallets = async () => {
    try {
      const res = await fetch('/api/v1/billing/wallets');
      const json = await res.json();
      if (json.success && json.data) {
        setWalletData(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateBulkInvoices = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await fetch('/api/v1/billing/invoices/generate-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billingPeriodStart,
          billingPeriodEnd,
          dueDate,
          notes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowGenerateModal(false);
        fetchInvoices();
        fetchWallets();
        alert(json.data?.message || 'Invoices generated successfully!');
      } else {
        alert(json.error || 'Failed to generate bulk invoices');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleRecordManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setRecording(true);
    try {
      const res = await fetch('/api/v1/payments/manual-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          amount: parseFloat(amount),
          paymentMethod,
          referenceNumber,
          bankName,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowManualPayModal(false);
        setSelectedInvoice(null);
        fetchInvoices();
        fetchWallets();
        alert(json.data?.message || 'Payment recorded successfully!');
      } else {
        alert(json.error || 'Failed to record payment');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRecording(false);
    }
  };

  const handleTopUpWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topUpFlatId || !topUpAmount) return;
    setSubmittingTopUp(true);

    try {
      const res = await fetch('/api/v1/billing/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flatId: topUpFlatId,
          amount: parseFloat(topUpAmount),
          paymentMethod: topUpMethod,
          referenceNumber: topUpReference,
          bankName: topUpBank,
          autoSettleInvoices: topUpAutoSettle,
          notes: topUpNotes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowTopUpModal(false);
        setTopUpAmount('');
        setTopUpReference('');
        setTopUpNotes('');
        fetchWallets();
        fetchInvoices();
        alert(json.data?.message || 'Advance deposit successfully processed!');
      } else {
        alert(json.error || 'Failed to process advance deposit');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingTopUp(false);
    }
  };

  const handleSendReminder = async (invoiceId: string) => {
    try {
      await fetch(`/api/v1/billing/invoices/${invoiceId}/remind`, { method: 'POST' });
      alert('Payment reminder dispatched via Email, SMS and WhatsApp channels!');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Receipt className="w-6 h-6 text-brand-600" />
              Billing & Maintenance Engine
            </h1>
            <p className="text-sm text-slate-500">
              Bulk invoicing, advance resident wallets, instant receipts, and defaulter tracking.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/society-admin/settings"
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5"
              title="Configure calculation rates in Settings"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              Rate Policy (Settings)
            </Link>

            <Link
              href="/society-admin/defaulters"
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5"
            >
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Defaulters
            </Link>

            <button
              onClick={() => setShowWalletModal(true)}
              className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-colors flex items-center gap-1.5"
            >
              <Wallet className="w-4 h-4 text-indigo-600" />
              Advance Wallets
            </button>

            <button
              onClick={() => setShowGenerateModal(true)}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              Generate Bulk Invoices
            </button>
          </div>
        </div>

        {/* Financial Summary Cards (Now including Advance Wallet Pool) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Total Billed
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {summary ? formatINR(summary.totalBilled) : '₹0'}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Active billing cycles</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Collected Amount
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {summary ? formatINR(summary.totalCollected) : '₹0'}
            </div>
            <span className="text-[11px] text-emerald-600 font-medium mt-1 block">Reconciled to society</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Outstanding Dues
            </span>
            <div className="text-2xl font-black text-rose-600 mt-1">
              {summary ? formatINR(summary.totalPending) : '₹0'}
            </div>
            <span className="text-[11px] text-rose-500 font-medium mt-1 block">Pending from residents</span>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-2xl border border-indigo-100 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider block">
                Advance Wallet Pool
              </span>
              <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                <Coins className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-indigo-900 mt-1">
              {walletData ? formatINR(walletData.summary.totalAdvanceCorpus) : '₹0'}
            </div>
            <span className="text-[11px] text-indigo-600 font-medium mt-1 block">
              {walletData?.summary.flatsWithAdvanceCount || 0} flats with prepaid credit
            </span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice number or flat..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500 font-medium"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500 font-medium text-slate-700"
          >
            <option value="">All Invoice Statuses</option>
            <option value="ISSUED">ISSUED / PENDING</option>
            <option value="PAID">PAID</option>
            <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
            <option value="OVERDUE">OVERDUE</option>
          </select>
        </div>

        {/* Invoices List Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-3.5 pl-5">Invoice No</th>
                  <th className="p-3.5">Flat & Wallet</th>
                  <th className="p-3.5">Resident</th>
                  <th className="p-3.5">Due Date</th>
                  <th className="p-3.5">Total Amount</th>
                  <th className="p-3.5">Balance</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Loading invoices...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No invoices found. Click 'Generate Bulk Invoices' to create the billing cycle.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const resident = inv.flat?.residents?.[0]?.user;
                    const advanceBal = inv.flat?.advanceBalance || 0;
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 pl-5 font-mono font-bold text-slate-900">
                          {inv.invoiceNumber}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{inv.flat?.flatNumber}</span>
                            {advanceBal > 0 && (
                              <span
                                className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-semibold text-[10px]"
                                title={`Flat has ${formatINR(advanceBal)} prepaid in Advance Wallet`}
                              >
                                {formatINR(advanceBal)} Wallet
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-600">{resident?.fullName || 'Resident'}</td>
                        <td className="p-3.5 text-slate-600">{formatDate(inv.dueDate)}</td>
                        <td className="p-3.5 font-black text-slate-900">
                          {formatINR(inv.totalAmount)}
                        </td>
                        <td className="p-3.5 font-bold text-rose-600 font-mono">
                          {formatINR(inv.balanceAmount)}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inv.status === 'PARTIALLY_PAID'
                                ? 'bg-blue-100 text-blue-800'
                                : inv.status === 'OVERDUE'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="p-3.5 pr-5 text-right space-x-1.5 whitespace-nowrap">
                          {inv.balanceAmount > 0 && (
                            <>
                              <button
                                onClick={() => handleSendReminder(inv.id)}
                                className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Send WhatsApp / SMS Reminder"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedInvoice(inv);
                                  setAmount(inv.balanceAmount.toString());
                                  setShowManualPayModal(true);
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors text-[11px]"
                              >
                                Record Pay
                              </button>
                            </>
                          )}
                          {inv.status === 'PAID' && (
                            <span className="text-[11px] text-emerald-700 font-bold flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled
                            </span>
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

        {/* Modal 1: Advance Wallets & Credit Ledger Overview */}
        {showWalletModal && walletData && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      Resident Advance Wallets & Prepaid Corpus
                    </h3>
                    <p className="text-xs text-slate-500">
                      Prepaid balances auto-offset against future monthly maintenance bills.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowWalletModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Wallet Header Banner */}
              <div className="py-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                  <span className="text-[11px] font-bold text-indigo-600 uppercase">
                    Total Advance Pool
                  </span>
                  <div className="text-xl font-black text-indigo-950 mt-0.5">
                    {formatINR(walletData.summary.totalAdvanceCorpus)}
                  </div>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    Flats with Prepaid Balance
                  </span>
                  <div className="text-xl font-black text-slate-900 mt-0.5">
                    {walletData.summary.flatsWithAdvanceCount} of {walletData.summary.totalFlats} Flats
                  </div>
                </div>
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => setShowTopUpModal(true)}
                    className="w-full sm:w-auto px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-xs"
                  >
                    <PlusCircle className="w-4 h-4" />
                    + Record Advance Deposit
                  </button>
                </div>
              </div>

              {/* Flats Wallet Balances List */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Flats With Active Advance Balance
                  </h4>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-3 pl-4">Flat</th>
                          <th className="p-3">Primary Resident</th>
                          <th className="p-3 text-right">Advance Balance</th>
                          <th className="p-3 pr-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {walletData.flats.filter((f) => f.advanceBalance > 0).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-4 text-center text-slate-400">
                              No flats currently hold an advance balance. Use '+ Record Advance Deposit' to add annual/prepaid funds.
                            </td>
                          </tr>
                        ) : (
                          walletData.flats
                            .filter((f) => f.advanceBalance > 0)
                            .map((f) => (
                              <tr key={f.id} className="hover:bg-slate-50/60">
                                <td className="p-3 pl-4 font-bold text-slate-900">
                                  {f.flatNumber}{' '}
                                  <span className="text-[11px] font-normal text-slate-400">
                                    ({f.block?.name || 'Block'})
                                  </span>
                                </td>
                                <td className="p-3 text-slate-600">
                                  {f.residents?.[0]?.user?.fullName || 'Resident'}
                                </td>
                                <td className="p-3 text-right font-black text-indigo-700 font-mono text-sm">
                                  {formatINR(f.advanceBalance)}
                                </td>
                                <td className="p-3 pr-4 text-right">
                                  <button
                                    onClick={() => {
                                      setTopUpFlatId(f.id);
                                      setShowTopUpModal(true);
                                    }}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[11px]"
                                  >
                                    + Add More
                                  </button>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Wallet Transactions */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    Recent Wallet Credit & Debit Activity
                  </h4>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-3 pl-4">Date</th>
                          <th className="p-3">Flat</th>
                          <th className="p-3">Type & Reason</th>
                          <th className="p-3 text-right">Amount</th>
                          <th className="p-3 pr-4 text-right">Balance After</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {walletData.recentTransactions.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-4 text-center text-slate-400">
                              No wallet transactions recorded yet.
                            </td>
                          </tr>
                        ) : (
                          walletData.recentTransactions.map((tx: any) => (
                            <tr key={tx.id} className="hover:bg-slate-50/60">
                              <td className="p-3 pl-4 text-slate-500">{formatDate(tx.createdAt)}</td>
                              <td className="p-3 font-bold text-slate-800">{tx.flat?.flatNumber}</td>
                              <td className="p-3">
                                <div className="flex items-center gap-1.5">
                                  {tx.type === 'CREDIT' ? (
                                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-bold text-[10px] flex items-center gap-0.5">
                                      <ArrowDownLeft className="w-3 h-3" /> CREDIT
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-bold text-[10px] flex items-center gap-0.5">
                                      <ArrowUpRight className="w-3 h-3" /> DEBIT
                                    </span>
                                  )}
                                  <span className="text-slate-600 text-[11px]">{tx.notes || tx.reason}</span>
                                </div>
                              </td>
                              <td
                                className={`p-3 text-right font-black font-mono ${
                                  tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-slate-900'
                                }`}
                              >
                                {tx.type === 'CREDIT' ? '+' : '-'}
                                {formatINR(tx.amount)}
                              </td>
                              <td className="p-3 pr-4 text-right font-bold text-slate-600 font-mono">
                                {formatINR(tx.balanceAfter)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal 2: Record Advance Deposit / Top-up */}
        {showTopUpModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Record Advance Deposit</h3>
                  <p className="text-xs text-slate-500">
                    Deposit advance funds (e.g. 6-12 months prepaid maintenance).
                  </p>
                </div>
                <button
                  onClick={() => setShowTopUpModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleTopUpWallet} className="py-4 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Select Flat
                  </label>
                  <select
                    required
                    value={topUpFlatId}
                    onChange={(e) => setTopUpFlatId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="">-- Choose Flat --</option>
                    {walletData?.flats.map((f) => (
                      <option key={f.id} value={f.id}>
                        Flat {f.flatNumber} ({f.block?.name || 'Block'}) &bull; Curr: {formatINR(f.advanceBalance)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Deposit Amount (INR)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 50000"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Payment Method
                  </label>
                  <select
                    value={topUpMethod}
                    onChange={(e) => setTopUpMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="CHEQUE">Bank Cheque</option>
                    <option value="NEFT_RTGS">NEFT / RTGS / IMPS</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CASH">Cash Deposit</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Cheque No. / UTR / Reference ID
                  </label>
                  <input
                    type="text"
                    value={topUpReference}
                    onChange={(e) => setTopUpReference(e.target.value)}
                    placeholder="e.g. CHQ-882910 or UTR99887766"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Bank Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={topUpBank}
                    onChange={(e) => setTopUpBank(e.target.value)}
                    placeholder="e.g. HDFC Bank, ICICI Bank"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={topUpAutoSettle}
                      onChange={(e) => setTopUpAutoSettle(e.target.checked)}
                      className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                    />
                    <span className="text-slate-700 font-medium">
                      Auto-settle oldest unpaid invoices first
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-1 pl-6">
                    If this flat has pending dues, they will be cleared and the remainder deposited into the wallet.
                  </p>
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowTopUpModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingTopUp}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                  >
                    {submittingTopUp ? 'Recording...' : 'Deposit to Wallet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 3: Bulk Invoice Generation */}
        {showGenerateModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Generate Monthly Invoices</h3>
                  <p className="text-xs text-slate-500">
                    Calculates bills for all registered society flats & auto-offsets advance wallets.
                  </p>
                </div>
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleGenerateBulkInvoices} className="py-4 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Cycle Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={billingPeriodStart}
                    onChange={(e) => setBillingPeriodStart(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Cycle End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={billingPeriodEnd}
                    onChange={(e) => setBillingPeriodEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Payment Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Billing Notes
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Regular monthly maintenance"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-[11px] text-indigo-700 font-medium">
                  💡 <strong>Smart Auto-Offset:</strong> Flats with active Advance Wallet balances will automatically have their bills settled on creation.
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowGenerateModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generating}
                    className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                  >
                    {generating ? 'Generating...' : 'Run Generation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 4: Record Manual Payment with Surplus Rollover */}
        {showManualPayModal && selectedInvoice && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Record Offline Payment</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {selectedInvoice.invoiceNumber} &bull; Flat {selectedInvoice.flat?.flatNumber}
                  </p>
                </div>
                <button
                  onClick={() => setShowManualPayModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRecordManualPayment} className="py-4 space-y-3 text-xs">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-700 uppercase tracking-wider">
                      Amount Received (INR)
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Balance Due: <strong className="text-rose-600">{formatINR(selectedInvoice.balanceAmount)}</strong>
                    </span>
                  </div>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-bold"
                  />
                  {parseFloat(amount) > selectedInvoice.balanceAmount && (
                    <p className="text-[11px] text-emerald-700 font-medium mt-1 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                      ✨ Surplus of{' '}
                      <strong>
                        {formatINR(parseFloat(amount) - selectedInvoice.balanceAmount)}
                      </strong>{' '}
                      will automatically rollover into Flat {selectedInvoice.flat?.flatNumber}'s Advance Wallet!
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="UPI">Direct UPI / QR Code</option>
                    <option value="CHEQUE">Bank Cheque</option>
                    <option value="NEFT_RTGS">NEFT / RTGS / IMPS</option>
                    <option value="CASH">Cash Deposit</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Cheque No. / UTR / Reference ID
                  </label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="e.g. CHQ-492102 or UTR12345678"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Bank Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. HDFC Bank, SBI"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowManualPayModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={recording}
                    className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                  >
                    {recording ? 'Recording...' : 'Record Payment & Issue Receipt'}
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

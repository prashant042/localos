'use client';

import React, { useEffect, useState } from 'react';
import { PortalLayout } from '@/components/layout/PortalLayout';
import {
  Receipt,
  Download,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  X,
  ShieldCheck,
  QrCode,
  Building,
  Printer,
  Sparkles,
  ArrowRight,
  Lock,
  Wallet,
} from 'lucide-react';
import { formatINR, formatDate } from '@localos/utils';

export default function ResidentDuesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<any | null>(null);
  const [receiptInvoice, setReceiptInvoice] = useState<any | null>(null);

  // Payment Checkout State
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [upiId, setUpiId] = useState('amitpatel@okaxis');
  const [selectedBank, setSelectedBank] = useState('HDFC');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<any | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await fetch('/api/v1/billing/invoices');
      const json = await res.json();
      if (json.success) setInvoices(json.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorizePayment = async () => {
    if (!payingInvoice) return;
    setIsProcessing(true);

    try {
      // Step 1: Simulate bank gateway handshake
      await new Promise((r) => setTimeout(r, 1200));

      // Step 2: Post verification to backend
      const res = await fetch('/api/v1/payments/razorpay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: payingInvoice.id,
          razorpayOrderId: `order_ghrwa_${Date.now()}`,
          razorpayPaymentId: `pay_rzp_${Date.now()}`,
          amountINR: payingInvoice.balanceAmount,
          paymentMethod,
        }),
      });

      const json = await res.json();

      if (json.success && json.data) {
        setPaymentSuccess({
          payment: json.data.payment,
          invoice: json.data.invoice,
          receiptNumber: json.data.receiptNumber,
        });
        fetchInvoices();
      } else {
        alert(json.error || 'Payment verification failed. Please try again.');
      }
    } catch (e) {
      console.error(e);
      alert('Unable to process payment gateway connection.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClosePaymentModal = () => {
    setPayingInvoice(null);
    setPaymentSuccess(null);
    setIsProcessing(false);
  };

  const handlePayWithWallet = async () => {
    if (!payingInvoice) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/v1/billing/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flatId: payingInvoice.flat.id,
          amount: Math.min(payingInvoice.balanceAmount, payingInvoice.flat.advanceBalance || 0),
          paymentMethod: 'ADVANCE_WALLET',
          autoSettleInvoices: true,
          notes: `Settled from resident advance wallet for ${payingInvoice.invoiceNumber}`,
        }),
      });
      const json = await res.json();
      if (json.success) {
        alert(json.data?.message || 'Invoice successfully settled from Advance Wallet!');
        handleClosePaymentModal();
        fetchInvoices();
      } else {
        alert(json.error || 'Failed to settle from wallet');
      }
    } catch (e) {
      console.error(e);
      alert('Wallet transaction failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const openReceiptModal = (inv: any) => {
    setReceiptInvoice(inv);
  };

  const flatAdvanceBalance = invoices[0]?.flat?.advanceBalance || 0;

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Maintenance Invoices & Receipts
          </h1>
          <p className="text-sm text-slate-500">
            View your monthly maintenance history, breakdown, and official RWA receipts.
          </p>
        </div>

        {/* Advance Wallet Card */}
        {invoices.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-white/10 rounded-2xl backdrop-blur-sm">
                <Wallet className="w-7 h-7 text-indigo-300" />
              </div>
              <div>
                <span className="text-xs uppercase font-bold text-indigo-200 tracking-wider">
                  Flat {invoices[0]?.flat?.flatNumber} Advance Wallet Balance
                </span>
                <div className="text-2xl font-black mt-0.5">
                  {formatINR(flatAdvanceBalance)}
                </div>
                <p className="text-xs text-indigo-200/80 mt-1">
                  {flatAdvanceBalance > 0
                    ? '✨ Active prepaid balance automatically settles upcoming maintenance invoices.'
                    : 'Pay multiple months in advance to enable 100% automated bill clearance.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-500">
            No invoices found for your flat.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-sm bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-md">
                      {inv.invoiceNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Flat: <span className="font-semibold text-slate-700">{inv.flat?.flatNumber}</span>{' '}
                    &bull; Due Date:{' '}
                    <span className="font-semibold text-slate-700">{formatDate(inv.dueDate)}</span>
                  </div>
                  <div className="text-xs text-slate-600 font-medium">
                    {inv.notes || 'Monthly Society Maintenance'}
                  </div>
                </div>

                {/* Amount & Actions */}
                <div className="flex items-center justify-between md:justify-end md:space-x-4 border-t md:border-t-0 pt-3 md:pt-0">
                  <div className="text-left md:text-right">
                    <div className="text-xs text-slate-400 uppercase font-semibold">Total Amount</div>
                    <div className="text-lg font-black text-slate-900">{formatINR(inv.totalAmount)}</div>
                    {inv.balanceAmount > 0 && (
                      <div className="text-xs text-rose-600 font-bold">
                        Pending: {formatINR(inv.balanceAmount)}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center"
                    >
                      <FileText className="w-4 h-4 mr-1.5" />
                      View Bill
                    </button>

                    {inv.balanceAmount > 0 ? (
                      <button
                        onClick={() => {
                          setPayingInvoice(inv);
                          setPaymentSuccess(null);
                        }}
                        className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-600/20 transition-all flex items-center gap-1.5"
                      >
                        <CreditCard className="w-4 h-4" />
                        Pay Now
                      </button>
                    ) : (
                      <button
                        onClick={() => openReceiptModal(inv)}
                        className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5"
                      >
                        <Receipt className="w-4 h-4 text-emerald-600" />
                        Receipt
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Itemized Bill Modal */}
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Maintenance Invoice Details</h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedInvoice.invoiceNumber}</p>
                </div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Bill Details */}
              <div className="py-4 space-y-4">
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100/80 rounded-xl text-[10px] text-slate-600 border border-slate-200">
                  <span>SAC Code: <strong className="font-mono text-slate-800">999598</strong> (Housing Society Services)</span>
                  <span>GSTIN: <strong className="font-mono text-slate-800">29AABTG1234D1Z2</strong></span>
                </div>

                <div className="grid grid-cols-2 text-xs gap-2 bg-slate-50 p-3 rounded-xl">
                  <div>
                    <span className="text-slate-400 block">Flat Number</span>
                    <span className="font-bold text-slate-800">{selectedInvoice.flat?.flatNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Due Date</span>
                    <span className="font-bold text-slate-800">{formatDate(selectedInvoice.dueDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Billing Period</span>
                    <span className="font-semibold text-slate-800">
                      {formatDate(selectedInvoice.billingPeriodStart)} -{' '}
                      {formatDate(selectedInvoice.billingPeriodEnd)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Payment Status</span>
                    <span className="font-bold text-emerald-600">{selectedInvoice.status}</span>
                  </div>
                </div>

                {/* Line Items Table */}
                <div>
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Itemized Charges
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                    {selectedInvoice.lineItems?.map((item: any) => (
                      <div key={item.id} className="p-2.5 flex justify-between items-center">
                        <span className="text-slate-700">{item.title}</span>
                        <span className="font-mono font-bold text-slate-900">
                          {formatINR(item.totalAmount)}
                        </span>
                      </div>
                    ))}
                    <div className="p-2.5 bg-slate-50 flex justify-between items-center font-bold text-sm">
                      <span>Total Invoice Amount</span>
                      <span className="text-brand-700">{formatINR(selectedInvoice.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-200"
                >
                  Close
                </button>
                {selectedInvoice.balanceAmount > 0 && (
                  <button
                    onClick={() => {
                      setPayingInvoice(selectedInvoice);
                      setSelectedInvoice(null);
                    }}
                    className="px-4 py-2 bg-brand-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-brand-700"
                  >
                    Pay Now ({formatINR(selectedInvoice.balanceAmount)})
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Razorpay Interactive Checkout Modal */}
        {payingInvoice && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              {/* Header with Razorpay trust badge */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                      Razorpay Gateway
                      <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-normal flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> 256-bit SSL
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">Greenwood Heights Society RWA</p>
                  </div>
                </div>
                <button
                  onClick={handleClosePaymentModal}
                  className="text-slate-400 hover:text-white p-1 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!paymentSuccess ? (
                <div className="p-6 space-y-5">
                  {/* Amount Card */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="text-xs text-slate-500 block">Total Maintenance Due</span>
                      <span className="text-2xl font-black text-slate-900">
                        {formatINR(payingInvoice.balanceAmount)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded block">
                        {payingInvoice.invoiceNumber}
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        Flat {payingInvoice.flat?.flatNumber}
                      </span>
                    </div>
                  </div>

                  {/* Advance Wallet Auto-Settle Offer */}
                  {(payingInvoice.flat?.advanceBalance || 0) > 0 && (
                    <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                          <Wallet className="w-4 h-4 text-indigo-600" />
                          Advance Wallet Balance Available
                        </span>
                        <p className="text-[11px] text-indigo-700 mt-0.5">
                          Flat has <strong>{formatINR(payingInvoice.flat.advanceBalance)}</strong> in prepaid credit.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handlePayWithWallet}
                        disabled={isProcessing}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all whitespace-nowrap disabled:opacity-50"
                      >
                        {isProcessing ? 'Settling...' : 'Settle with Wallet'}
                      </button>
                    </div>
                  )}

                  {/* Payment Methods Tab */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Choose Payment Option
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('UPI')}
                        className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                          paymentMethod === 'UPI'
                            ? 'border-brand-500 bg-brand-50/50 text-brand-700 ring-2 ring-brand-500/20 shadow-sm'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <QrCode className="w-5 h-5 text-brand-600" />
                        UPI & QR
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('CARD')}
                        className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                          paymentMethod === 'CARD'
                            ? 'border-brand-500 bg-brand-50/50 text-brand-700 ring-2 ring-brand-500/20 shadow-sm'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <CreditCard className="w-5 h-5 text-brand-600" />
                        Cards
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('NETBANKING')}
                        className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                          paymentMethod === 'NETBANKING'
                            ? 'border-brand-500 bg-brand-50/50 text-brand-700 ring-2 ring-brand-500/20 shadow-sm'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Building className="w-5 h-5 text-brand-600" />
                        Net Banking
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Tab Body */}
                  {paymentMethod === 'UPI' && (
                    <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          Instant UPI Autopay / VPA
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Zero Convenience Fee
                        </span>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          UPI ID / VPA
                        </label>
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="yourname@upi or mobile@paytm"
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                        />
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                        <span className="font-semibold text-slate-700">Supported Apps:</span>
                        <span>Google Pay &bull; PhonePe &bull; Paytm &bull; BHIM &bull; CRED</span>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'CARD' && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Card Number
                        </label>
                        <input
                          type="text"
                          defaultValue="4532 •••• •••• 8910"
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Expiry
                          </label>
                          <input
                            type="text"
                            defaultValue="12/28"
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            CVV
                          </label>
                          <input
                            type="password"
                            defaultValue="•••"
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'NETBANKING' && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Select Your Bank
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {['HDFC', 'ICICI', 'SBI', 'Axis', 'Kotak', 'PNB'].map((bank) => (
                          <button
                            key={bank}
                            type="button"
                            onClick={() => setSelectedBank(bank)}
                            className={`py-2 px-2 text-xs font-bold rounded-xl border transition-colors ${
                              selectedBank === bank
                                ? 'border-brand-500 bg-brand-50 text-brand-700'
                                : 'border-slate-200 bg-white text-slate-700'
                            }`}
                          >
                            {bank} Bank
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleClosePaymentModal}
                      disabled={isProcessing}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAuthorizePayment}
                      disabled={isProcessing}
                      className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Securing Payment...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>Pay {formatINR(payingInvoice.balanceAmount)}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* Payment Success Celebration Screen */
                <div className="p-8 text-center space-y-5 animate-in fade-in zoom-in-95">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-slate-900">Payment Successful!</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Maintenance dues of {formatINR(paymentSuccess.payment?.amount)} have been
                      settled.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Official Receipt No:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {paymentSuccess.receiptNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Transaction ID:</span>
                      <span className="font-mono text-slate-700">
                        {paymentSuccess.payment?.gatewayPaymentId}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment Channel:</span>
                      <span className="font-bold text-emerald-700">UPI Instant Auto-Reconciled</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        const paidInv = invoices.find((i) => i.id === payingInvoice?.id) || payingInvoice;
                        handleClosePaymentModal();
                        openReceiptModal(paidInv);
                      }}
                      className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      <Receipt className="w-4 h-4" />
                      View Official Receipt
                    </button>
                    <button
                      onClick={handleClosePaymentModal}
                      className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Printable Official Society Receipt Modal */}
        {receiptInvoice && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-8 shadow-2xl border border-slate-200 text-slate-900 max-h-[90vh] overflow-y-auto">
              {/* Receipt Header */}
              <div className="border-b-2 border-slate-900 pb-5 mb-5 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold text-sm">
                      <Shield className="w-4 h-4" />
                    </div>
                    <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                      Greenwood Heights RWA
                    </h2>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Reg No: REG/BLR/2022/4819 &bull; GSTIN: 29AABTG1234D1Z2 &bull; SAC: 999598
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Sarjapur Road, Bengaluru, Karnataka - 560100 &bull; accounts@greenwoodheights.in
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    Official Receipt
                  </span>
                  <span className="font-mono font-bold text-sm text-brand-700 block">
                    {receiptInvoice.payments?.[0]?.paymentNumber ||
                      `RCPT-${receiptInvoice.invoiceNumber?.replace('INV-', '')}`}
                  </span>
                </div>
              </div>

              {/* Receipt Meta */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl mb-5 border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Received From
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {receiptInvoice.flat?.residents?.[0]?.user?.fullName || 'Amit Patel'}
                  </span>
                  <span className="text-slate-500 block">
                    Flat No: <strong className="text-slate-800">{receiptInvoice.flat?.flatNumber}</strong>{' '}
                    ({receiptInvoice.flat?.block?.name || 'Block A'})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Payment Details
                  </span>
                  <span className="text-slate-700 block">
                    Date:{' '}
                    <strong>
                      {formatDate(receiptInvoice.payments?.[0]?.paidAt || receiptInvoice.updatedAt)}
                    </strong>
                  </span>
                  <span className="text-slate-700 block">
                    Invoice Ref: <strong className="font-mono">{receiptInvoice.invoiceNumber}</strong>
                  </span>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden mb-5">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 font-bold text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Description / Particulars</th>
                      <th className="py-2.5 px-4 text-right">Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receiptInvoice.lineItems && receiptInvoice.lineItems.length > 0 ? (
                      receiptInvoice.lineItems.map((item: any) => (
                        <tr key={item.id}>
                          <td className="py-2.5 px-4 text-slate-700">{item.title}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-semibold">
                            {formatINR(item.totalAmount)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-2.5 px-4 text-slate-700">
                          Monthly Maintenance Charges ({formatDate(receiptInvoice.billingPeriodStart)} -{' '}
                          {formatDate(receiptInvoice.billingPeriodEnd)})
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold">
                          {formatINR(receiptInvoice.totalAmount)}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-slate-50 font-bold text-sm">
                      <td className="py-3 px-4 text-slate-900">Total Amount Paid</td>
                      <td className="py-3 px-4 text-right text-brand-700 font-mono">
                        {formatINR(receiptInvoice.totalAmount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Paid Stamp & Footer Notes */}
              <div className="flex justify-between items-center pt-2 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 bg-emerald-50 text-emerald-800 border-2 border-emerald-400 font-black text-xs uppercase tracking-wider rounded-lg rotate-[-2deg]">
                    ✓ PAID & RECONCILED
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Mode: <strong>UPI (Razorpay Instant Auto-Settle)</strong>
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  <span className="block font-semibold text-slate-700">Greenwood Heights RWA</span>
                  <span>Authorized Digital Seal</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-5 flex justify-end gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  Print Receipt
                </button>
                <button
                  onClick={() => setReceiptInvoice(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}

function Shield(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  );
}

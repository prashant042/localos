'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PortalLayout } from '@/components/layout/PortalLayout';
import {
  Receipt,
  PlusCircle,
  Search,
  Filter,
  DollarSign,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Building,
  Wrench,
  CheckCircle2,
  X,
  CreditCard,
  FileText,
  Calendar,
  Trash2,
  ArrowRight,
  Shield,
  Zap,
  Droplet,
  Fuel,
} from 'lucide-react';
import { formatINR, formatDate } from '@localos/utils';
import { ExpenseCategory, ExpenseStatus, PaymentMethod } from '@prisma/client';

export default function SocietyAdminExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);

  // Add Form State
  const [title, setTitle] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.SECURITY_SERVICES);
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<ExpenseStatus>(ExpenseStatus.PAID);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.NEFT_RTGS);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Mark Paid State
  const [payMethod, setPayMethod] = useState<PaymentMethod>(PaymentMethod.NEFT_RTGS);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNotes, setPayNotes] = useState('');
  const [markingPaid, setMarkingPaid] = useState(false);

  useEffect(() => {
    fetchExpenses();
    fetchVendors();
  }, [categoryFilter, statusFilter, search]);

  const fetchExpenses = async () => {
    try {
      const url = new URL('/api/v1/expenses', window.location.origin);
      if (categoryFilter) url.searchParams.set('category', categoryFilter);
      if (statusFilter) url.searchParams.set('status', statusFilter);
      if (search) url.searchParams.set('search', search);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success) {
        setExpenses(json.data.expenses || []);
        setSummary(json.data.summary || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await fetch('/api/v1/vendors');
      const json = await res.json();
      if (json.success) setVendors(json.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          vendorId: vendorId || undefined,
          category,
          amount: parseFloat(amount),
          status,
          paymentMethod: status === ExpenseStatus.PAID ? paymentMethod : undefined,
          invoiceNumber: invoiceNumber || undefined,
          billDate,
          dueDate: dueDate || undefined,
          notes: notes || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowAddModal(false);
        setTitle('');
        setAmount('');
        setInvoiceNumber('');
        setNotes('');
        fetchExpenses();
      } else {
        alert(json.error || 'Failed to save expense');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;
    setMarkingPaid(true);
    try {
      const res = await fetch('/api/v1/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId: selectedExpense.id,
          status: ExpenseStatus.PAID,
          paymentMethod: payMethod,
          paidAt: payDate,
          notes: payNotes || selectedExpense.notes,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowMarkPaidModal(false);
        setSelectedExpense(null);
        fetchExpenses();
      } else {
        alert(json.error || 'Failed to mark as paid');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMarkingPaid(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense entry?')) return;
    try {
      const res = await fetch(`/api/v1/expenses?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchExpenses();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getCategoryBadge = (cat: ExpenseCategory) => {
    switch (cat) {
      case ExpenseCategory.SECURITY_SERVICES:
        return { label: 'Security Guards', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case ExpenseCategory.LIFT_AMC:
        return { label: 'Lift AMC', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      case ExpenseCategory.ELECTRICITY_POWER:
        return { label: 'Electricity / Power', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case ExpenseCategory.WATER_TANKER:
        return { label: 'Water Tanker', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
      case ExpenseCategory.GENERATOR_DIESEL:
        return { label: 'DG Diesel', color: 'bg-orange-50 text-orange-700 border-orange-200' };
      case ExpenseCategory.HOUSEKEEPING_CLEANING:
        return { label: 'Housekeeping', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case ExpenseCategory.GARDENING_LANDSCAPE:
        return { label: 'Gardening', color: 'bg-lime-50 text-lime-700 border-lime-200' };
      default:
        return { label: cat.replace('_', ' '), color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingDown className="w-6 h-6 text-rose-600" />
              Society Expenses & Accounts Payable
            </h1>
            <p className="text-sm text-slate-500">
              Track vendor invoices, lift AMCs, power bills, security agency outgoings, and net financial balance.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/society-admin/billing"
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5"
            >
              <Receipt className="w-4 h-4 text-slate-500" />
              Collections / Inflows
            </Link>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              + Record Expense / Vendor Bill
            </button>
          </div>
        </div>

        {/* Financial KPI Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Total Collections (Income)
              </span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {formatINR(summary.totalCollections)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Maintenance & prepaid funds</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Total Expenses Paid (Outgoings)
              </span>
              <div className="text-2xl font-black text-rose-600 mt-1">
                {formatINR(summary.totalPaid)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Cleared vendor payments</span>
            </div>

            <div
              className={`p-5 rounded-2xl border shadow-sm ${
                summary.netSocietyReserve >= 0
                  ? 'bg-gradient-to-br from-emerald-50 to-white border-emerald-200'
                  : 'bg-gradient-to-br from-rose-50 to-white border-rose-200'
              }`}
            >
              <span className="text-xs font-bold uppercase tracking-wider block text-slate-600">
                Net Society Reserve
              </span>
              <div
                className={`text-2xl font-black mt-1 ${
                  summary.netSocietyReserve >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {formatINR(summary.netSocietyReserve)}
              </div>
              <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                {summary.netSocietyReserve >= 0 ? 'Surplus in bank account' : 'Deficit / Shortfall'}
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Pending Vendor Bills
              </span>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {formatINR(summary.totalPending)}
              </div>
              <span className="text-[11px] text-amber-700 font-medium mt-1 block">Due for disbursement</span>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search expenses by title, invoice # or vendor..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500 font-medium"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-700"
          >
            <option value="">All Expense Categories</option>
            <option value="SECURITY_SERVICES">Security Services</option>
            <option value="LIFT_AMC">Lift AMC</option>
            <option value="ELECTRICITY_POWER">Electricity / Power</option>
            <option value="WATER_TANKER">Water Tankers</option>
            <option value="HOUSEKEEPING_CLEANING">Housekeeping</option>
            <option value="GENERATOR_DIESEL">DG Diesel</option>
            <option value="GARDENING_LANDSCAPE">Gardening</option>
            <option value="REPAIRS_MAINTENANCE">Repairs & Maintenance</option>
            <option value="OTHER">Other Operational</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-700"
          >
            <option value="">All Payment Statuses</option>
            <option value="PAID">PAID</option>
            <option value="PENDING">PENDING</option>
            <option value="OVERDUE">OVERDUE</option>
          </select>
        </div>

        {/* Expenses Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-3.5 pl-5">Date</th>
                  <th className="p-3.5">Expense Title & Category</th>
                  <th className="p-3.5">Vendor / Payee</th>
                  <th className="p-3.5">Invoice / Ref #</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Loading expenses...
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No expenses recorded yet. Click '+ Record Expense' to track vendor bills.
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => {
                    const badge = getCategoryBadge(exp.category);
                    return (
                      <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 pl-5 text-slate-600 font-medium">
                          {formatDate(exp.billDate)}
                        </td>
                        <td className="p-3.5">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-900 block">{exp.title}</span>
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${badge.color}`}
                            >
                              {badge.label}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-700 font-medium">
                          {exp.vendor?.companyName || 'Direct Expense / Utility'}
                        </td>
                        <td className="p-3.5 font-mono text-slate-500">
                          {exp.invoiceNumber || '—'}
                        </td>
                        <td className="p-3.5 font-black text-rose-600 font-mono text-sm">
                          {formatINR(exp.amount)}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              exp.status === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : exp.status === 'OVERDUE'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {exp.status}
                          </span>
                        </td>
                        <td className="p-3.5 pr-5 text-right space-x-1.5 whitespace-nowrap">
                          {exp.status !== 'PAID' && (
                            <button
                              onClick={() => {
                                setSelectedExpense(exp);
                                setShowMarkPaidModal(true);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors text-[11px]"
                            >
                              Mark Paid
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal 1: Record New Expense */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Record Expense / Vendor Bill</h3>
                  <p className="text-xs text-slate-500">Log an operational outgoing or agency payment.</p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateExpense} className="py-4 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Expense Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. November 2026 Security Guard Billing"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Expense Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                    >
                      <option value="SECURITY_SERVICES">Security Services</option>
                      <option value="LIFT_AMC">Lift Maintenance (AMC)</option>
                      <option value="ELECTRICITY_POWER">Electricity / Power</option>
                      <option value="WATER_TANKER">Water Tankers</option>
                      <option value="HOUSEKEEPING_CLEANING">Housekeeping / Cleaning</option>
                      <option value="GENERATOR_DIESEL">DG Generator Diesel</option>
                      <option value="GARDENING_LANDSCAPE">Gardening & Plants</option>
                      <option value="REPAIRS_MAINTENANCE">General Repairs</option>
                      <option value="OTHER">Other Operational</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Linked Vendor (Optional)
                    </label>
                    <select
                      value={vendorId}
                      onChange={(e) => setVendorId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                    >
                      <option value="">-- No Vendor / Utility Direct --</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.companyName} ({v.category})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Amount (INR)
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 45000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Invoice / Bill Ref No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. INV-SEC-2026-11"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Bill / Invoice Date
                    </label>
                    <input
                      type="date"
                      required
                      value={billDate}
                      onChange={(e) => setBillDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Payment Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                    >
                      <option value="PAID">Already Paid</option>
                      <option value="PENDING">Pending Payment</option>
                    </select>
                  </div>
                </div>

                {status === 'PAID' && (
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                    >
                      <option value="NEFT_RTGS">NEFT / RTGS / IMPS</option>
                      <option value="CHEQUE">Bank Cheque</option>
                      <option value="UPI">UPI / QR</option>
                      <option value="CASH">Cash</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Notes / Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Paid for 4 daytime and 3 nighttime guards"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Record Expense'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 2: Mark Paid */}
        {showMarkPaidModal && selectedExpense && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Mark Vendor Bill Paid</h3>
                  <p className="text-xs text-slate-500">{selectedExpense.title}</p>
                </div>
                <button
                  onClick={() => setShowMarkPaidModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleMarkPaid} className="py-4 space-y-3 text-xs">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Amount Due</span>
                    <div className="text-xl font-black text-slate-900">{formatINR(selectedExpense.amount)}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-700 block">
                      {selectedExpense.vendor?.companyName || 'Direct'}
                    </span>
                    <span className="text-[11px] text-slate-400">{selectedExpense.invoiceNumber || 'No Ref'}</span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Payment Method
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="NEFT_RTGS">NEFT / RTGS / IMPS</option>
                    <option value="CHEQUE">Bank Cheque</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Disbursement Date
                  </label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Payment Reference / UTR No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-9988776655 or Cheque #4928"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowMarkPaidModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={markingPaid}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                  >
                    {markingPaid ? 'Recording...' : 'Confirm Payment'}
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

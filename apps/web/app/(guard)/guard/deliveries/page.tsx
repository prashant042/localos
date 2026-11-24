'use client';

import React, { useEffect, useState } from 'react';
import { PortalLayout } from '@/components/layout/PortalLayout';
import {
  Truck,
  PlusCircle,
  Search,
  PackageCheck,
  CheckCircle2,
  Clock,
  Phone,
  Building,
  X,
  Package,
} from 'lucide-react';
import { formatDate } from '@localos/utils';

export default function GuardDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [flats, setFlats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form
  const [flatId, setFlatId] = useState('');
  const [company, setCompany] = useState('Swiggy');
  const [deliveryPersonName, setDeliveryPersonName] = useState('');
  const [deliveryPersonPhone, setDeliveryPersonPhone] = useState('');
  const [leaveAtGate, setLeaveAtGate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dRes, fRes] = await Promise.all([
        fetch('/api/v1/visitors/logs?type=DELIVERY'),
        fetch('/api/v1/flats'),
      ]);
      const dJson = await dRes.json();
      const fJson = await fRes.json();
      if (dJson.success) setDeliveries(dJson.data || []);
      if (fJson.success) {
        setFlats(fJson.data || []);
        if (fJson.data?.length > 0) setFlatId(fJson.data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/visitors/delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flatId,
          company,
          deliveryPersonName,
          deliveryPersonPhone,
          leaveAtGate,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowAddModal(false);
        setDeliveryPersonName('');
        setDeliveryPersonPhone('');
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-6 h-6 text-brand-600" />
              Gate Delivery Desk
            </h1>
            <p className="text-sm text-slate-500">
              Log incoming courier, grocery, food delivery personnel and gate parcel handovers.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Quick Delivery Entry
          </button>
        </div>

        {/* Deliveries list */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Courier / Company</th>
                  <th className="py-3 px-4">Delivery Executive</th>
                  <th className="py-3 px-4">Recipient Flat</th>
                  <th className="py-3 px-4">Gate Status</th>
                  <th className="py-3 px-4">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      Loading deliveries...
                    </td>
                  </tr>
                ) : deliveries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      No delivery entries logged today.
                    </td>
                  </tr>
                ) : (
                  deliveries.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 text-xs px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg">
                          {d.visitor?.purpose || 'Delivery'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 text-xs">
                          {d.visitor?.name || 'Courier Partner'}
                        </div>
                        <div className="text-[11px] text-slate-400">{d.visitor?.phone || '—'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 text-xs">
                          Flat {d.flat?.flatNumber}
                        </span>
                        <div className="text-[11px] text-slate-400">{d.flat?.block?.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Passed at Gate
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {formatDate(d.checkInTime)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-900">Log Delivery Entry</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleLogDelivery} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company</label>
                  <select
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Swiggy">Swiggy / Instamart</option>
                    <option value="Zomato">Zomato / Blinkit</option>
                    <option value="Amazon">Amazon</option>
                    <option value="Flipkart">Flipkart</option>
                    <option value="Zepto">Zepto</option>
                    <option value="BlueDart">Blue Dart / Courier</option>
                    <option value="Other">Other Delivery</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Destination Flat
                  </label>
                  <select
                    value={flatId}
                    onChange={(e) => setFlatId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {flats.map((f) => (
                      <option key={f.id} value={f.id}>
                        Flat {f.flatNumber} ({f.block?.name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Delivery Boy Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={deliveryPersonName}
                    onChange={(e) => setDeliveryPersonName(e.target.value)}
                    placeholder="e.g. Suresh"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={deliveryPersonPhone}
                    onChange={(e) => setDeliveryPersonPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="leaveAtGate"
                    checked={leaveAtGate}
                    onChange={(e) => setLeaveAtGate(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <label htmlFor="leaveAtGate" className="text-xs font-semibold text-slate-700">
                    Keep Parcel at Security Gate (Resident notified)
                  </label>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    {submitting ? 'Logging...' : 'Grant Entry'}
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


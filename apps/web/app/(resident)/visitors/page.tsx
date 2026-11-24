'use client';

import React, { useEffect, useState } from 'react';
import { PortalLayout } from '@/components/layout/PortalLayout';
import {
  ShieldCheck,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Key,
  X,
  Share2,
  Package,
  Check,
  Truck,
  Phone,
  ArrowRight,
} from 'lucide-react';
import { formatDateTime } from '@localos/utils';

export default function ResidentVisitorsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPreApproveModal, setShowPreApproveModal] = useState(false);
  const [guestPass, setGuestPass] = useState<any | null>(null);
  const [actioningLogId, setActioningLogId] = useState<string | null>(null);
  const [collectingDeliveryId, setCollectingDeliveryId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [purpose, setPurpose] = useState('Family / Friend Visit');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchVisitorLogs();
    fetchDeliveries();
  }, []);

  const fetchVisitorLogs = async () => {
    try {
      const res = await fetch('/api/v1/visitors/logs');
      const json = await res.json();
      if (json.success) setLogs(json.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveries = async () => {
    try {
      const res = await fetch('/api/v1/visitors/delivery');
      const json = await res.json();
      if (json.success && json.data) {
        setDeliveries(json.data.deliveries || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleVisitorAction = async (logId: string, action: 'APPROVE' | 'DENY') => {
    setActioningLogId(logId);
    try {
      const res = await fetch('/api/v1/visitors/action', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId, action }),
      });
      const json = await res.json();
      if (json.success) {
        fetchVisitorLogs();
      } else {
        alert(json.error || 'Failed to update visitor status');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActioningLogId(null);
    }
  };

  const handleMarkCollected = async (deliveryId: string) => {
    setCollectingDeliveryId(deliveryId);
    try {
      const res = await fetch('/api/v1/visitors/delivery', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryId, status: 'COLLECTED' }),
      });
      const json = await res.json();
      if (json.success) {
        fetchDeliveries();
      } else {
        alert(json.error || 'Failed to update delivery');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCollectingDeliveryId(null);
    }
  };

  const handlePreApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/visitors/pre-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, vehicleNumber, purpose }),
      });
      const json = await res.json();
      if (json.success) {
        setGuestPass(json.data.pass);
        setShowPreApproveModal(false);
        setName('');
        setPhone('');
        setVehicleNumber('');
        fetchVisitorLogs();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const pendingApprovals = logs.filter((l) => l.status === 'WAITING_APPROVAL');
  const packagesAtGate = deliveries.filter((d) => d.status === 'LEFT_AT_GATE');

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gate & Visitor Management</h1>
            <p className="text-sm text-slate-500">
              Pre-approve visitors, approve gate entry requests in real-time, and track parcel deliveries.
            </p>
          </div>
          <button
            onClick={() => setShowPreApproveModal(true)}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl shadow-md shadow-brand-600/20 transition-all flex items-center self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Pre-Approve Guest Pass
          </button>
        </div>

        {/* Real-time Gate Arrival Action Cards */}
        {pendingApprovals.length > 0 && (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white border-2 border-amber-300 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              Security Alert: {pendingApprovals.length} Visitor(s) Waiting at Gate for Approval
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pendingApprovals.map((v) => (
                <div key={v.id} className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">{v.visitor?.name}</h4>
                    <p className="text-xs text-slate-500">
                      {v.visitor?.visitorType} &bull; +91 {v.visitor?.phone}
                    </p>
                    <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                      Purpose: {v.purpose || 'Visit'} {v.visitor?.vehicleNumber && `(Vehicle: ${v.visitor.vehicleNumber})`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleVisitorAction(v.id, 'APPROVE')}
                      disabled={actioningLogId === v.id}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => handleVisitorAction(v.id, 'DENY')}
                      disabled={actioningLogId === v.id}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <X className="w-4 h-4" /> Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Packages / Deliveries Waiting at Gate */}
        {packagesAtGate.length > 0 && (
          <div className="bg-indigo-50/60 border border-indigo-200 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm">
              <Package className="w-5 h-5 text-indigo-600" />
              Parcels Received at Security Cabin ({packagesAtGate.length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {packagesAtGate.map((pkg) => (
                <div key={pkg.id} className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm flex flex-col justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-900 text-xs px-2.5 py-0.5 bg-indigo-50 rounded-md">
                        {pkg.company}
                      </span>
                      <span className="text-[10px] text-indigo-500 font-medium">
                        {formatDateTime(pkg.loggedAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">
                      Rider: <strong>{pkg.deliveryPersonName || 'Courier'}</strong>{' '}
                      {pkg.phone && `(+91 ${pkg.phone})`}
                    </p>
                    <p className="text-[11px] text-slate-500">Waiting for collection at Gate 1</p>
                  </div>
                  <button
                    onClick={() => handleMarkCollected(pkg.id)}
                    disabled={collectingDeliveryId === pkg.id}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {collectingDeliveryId === pkg.id ? 'Updating...' : 'Mark Collected'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Guest Pass Generated Card */}
        {guestPass && (
          <div className="bg-gradient-to-tr from-brand-600 to-emerald-500 text-white p-6 rounded-3xl shadow-xl max-w-md mx-auto relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] font-bold tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded-full">
                  Official Guest Entry Pass
                </span>
                <h3 className="text-xl font-black mt-1">{guestPass.visitorName}</h3>
              </div>
              <button onClick={() => setGuestPass(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 my-3 text-center border border-white/20">
              <span className="text-xs uppercase tracking-wider text-slate-200 font-semibold block">
                Security Gate Entry Code (OTP)
              </span>
              <span className="font-mono text-4xl font-black tracking-widest text-white my-1 block">
                {guestPass.checkInOtp}
              </span>
              <span className="text-[11px] text-slate-200">
                Show or speak this 4-digit code to guard at Gate 1
              </span>
            </div>

            <div className="text-xs text-slate-200 space-y-1">
              <div>Flat: <strong>{guestPass.flatNumber}</strong></div>
              <div>Phone: <strong>+91 {guestPass.visitorPhone}</strong></div>
              <div>Validity: <strong>24 Hours</strong></div>
            </div>
          </div>
        )}

        {/* Visitor History */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <h2 className="font-bold text-sm text-slate-900">Recent Visitors for Your Flat</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading visitor logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No visitor logs recorded yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {logs.map((log) => (
                <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-900">{log.visitor?.name}</span>
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {log.visitor?.visitorType}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Phone: +91 {log.visitor?.phone} &bull; Purpose: {log.purpose || 'Visit'} &bull; Vehicle: {log.visitor?.vehicleNumber || 'None'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Entry: {formatDateTime(log.entryTime)} {log.exitTime && `| Exit: ${formatDateTime(log.exitTime)}`}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {log.status === 'WAITING_APPROVAL' ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleVisitorAction(log.id, 'APPROVE')}
                          disabled={actioningLogId === log.id}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => handleVisitorAction(log.id, 'DENY')}
                          disabled={actioningLogId === log.id}
                          className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Deny
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${
                          log.status === 'APPROVED' || log.status === 'CHECKED_IN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {log.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pre-Approve Modal */}
        {showPreApproveModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <h3 className="font-bold text-base text-slate-900">Pre-Approve Guest</h3>
                <button
                  onClick={() => setShowPreApproveModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handlePreApprove} className="py-4 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Visitor Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Mobile Phone
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Vehicle Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MH 02 AB 1234"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Purpose of Visit
                  </label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="Family / Friend Visit">Family / Friend Visit</option>
                    <option value="Home Delivery">Home Delivery</option>
                    <option value="Home Maintenance / Repair">Home Maintenance / Repair</option>
                    <option value="Cab / Driver Pickup">Cab / Driver Pickup</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowPreApproveModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                  >
                    {submitting ? 'Generating...' : 'Issue Guest Pass'}
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

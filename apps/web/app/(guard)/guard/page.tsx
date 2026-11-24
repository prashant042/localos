'use client';

import React, { useEffect, useState } from 'react';
import { PortalLayout } from '@/components/layout/PortalLayout';
import {
  ShieldCheck,
  Search,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Clock,
  KeyRound,
  LogOut,
  Phone,
  Truck,
  Car,
  User,
  X
} from 'lucide-react';
import { formatDateTime } from '@localos/utils';

export default function GuardGateConsole() {
  const [logs, setLogs] = useState<any[]>([]);
  const [flats, setFlats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFlat, setSearchFlat] = useState('');

  // Check-In State
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedFlatId, setSelectedFlatId] = useState('');
  const [visitorType, setVisitorType] = useState('GUEST');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [purpose, setPurpose] = useState('');
  const [checkInOtp, setCheckInOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLogs();
    fetchFlats();
  }, []);

  const fetchLogs = async () => {
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

  const fetchFlats = async () => {
    try {
      const res = await fetch('/api/v1/flats');
      const json = await res.json();
      if (json.success) {
        setFlats(json.data || []);
        if (json.data?.length > 0 && !selectedFlatId) setSelectedFlatId(json.data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/visitors/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          flatId: selectedFlatId,
          visitorType,
          vehicleNumber,
          purpose,
          checkInOtp,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowCheckInModal(false);
        setName('');
        setPhone('');
        setVehicleNumber('');
        setPurpose('');
        setCheckInOtp('');
        fetchLogs();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async (logId: string) => {
    try {
      const res = await fetch('/api/v1/visitors/check-out', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId }),
      });
      if (res.ok) {
        fetchLogs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Guard Station Banner */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white p-6 rounded-3xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold mb-1">
              Main Gate 1 Terminal
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Security Gate Console</h1>
            <p className="text-xs text-amber-100 mt-1">Greenwood Heights RWA &bull; Guard Duty Tablet Mode</p>
          </div>

          <button
            onClick={() => setShowCheckInModal(true)}
            className="px-6 py-3.5 bg-white text-amber-900 font-extrabold text-sm sm:text-base rounded-2xl shadow-xl hover:bg-amber-50 active:scale-95 transition-all flex items-center justify-center"
          >
            <PlusCircle className="w-5 h-5 mr-2 text-amber-700" />
            New Visitor Entry
          </button>
        </div>

        {/* Quick Type Selection Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => {
              setVisitorType('GUEST');
              setShowCheckInModal(true);
            }}
            className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-brand-500 shadow-sm flex items-center space-x-3 text-left transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900">Guest</div>
              <div className="text-[10px] text-slate-400">Visitor / Friend</div>
            </div>
          </button>

          <button
            onClick={() => {
              setVisitorType('DELIVERY');
              setPurpose('Food / Parcel Delivery');
              setShowCheckInModal(true);
            }}
            className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-brand-500 shadow-sm flex items-center space-x-3 text-left transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900">Delivery</div>
              <div className="text-[10px] text-slate-400">Swiggy / Amazon</div>
            </div>
          </button>

          <button
            onClick={() => {
              setVisitorType('CAB');
              setPurpose('Cab Pickup / Drop');
              setShowCheckInModal(true);
            }}
            className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-brand-500 shadow-sm flex items-center space-x-3 text-left transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900">Cab / Taxi</div>
              <div className="text-[10px] text-slate-400">Uber / Ola</div>
            </div>
          </button>

          <button
            onClick={() => {
              setVisitorType('SERVICE');
              setPurpose('Technician / Service');
              setShowCheckInModal(true);
            }}
            className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-brand-500 shadow-sm flex items-center space-x-3 text-left transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900">Technician</div>
              <div className="text-[10px] text-slate-400">Plumber / Electrician</div>
            </div>
          </button>
        </div>

        {/* Visitor Activity Log */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-bold text-sm text-slate-900">Gate Entry Log & Exit Tracker</h2>
            <span className="text-xs text-slate-400 font-semibold">{logs.length} Total Logs</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading gate logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No visitors logged yet today.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {logs.map((log) => {
                const isStillInside = log.status !== 'CHECKED_OUT' && log.status !== 'REJECTED';
                return (
                  <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-sm text-slate-900">{log.visitor?.name}</span>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {log.visitor?.visitorType}
                        </span>
                        <span className="font-mono font-bold text-xs bg-brand-50 text-brand-800 px-2 py-0.5 rounded">
                          Flat: {log.flat?.flatNumber}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Phone: +91 {log.visitor?.phone} &bull; Purpose: {log.purpose || 'Visit'} &bull; Vehicle: {log.visitor?.vehicleNumber || 'None'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Entered: {formatDateTime(log.entryTime)} {log.exitTime && `| Exited: ${formatDateTime(log.exitTime)}`}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${
                          log.status === 'APPROVED' || log.status === 'CHECKED_IN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.status === 'CHECKED_OUT'
                            ? 'bg-slate-100 text-slate-600'
                            : log.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {log.status.replace('_', ' ')}
                      </span>

                      {isStillInside && (
                        <button
                          onClick={() => handleCheckOut(log.id)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors flex items-center"
                        >
                          <LogOut className="w-3.5 h-3.5 mr-1" />
                          Mark Exit
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Check-In Modal */}
        {showCheckInModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <h3 className="font-bold text-base text-slate-900">New Gate Visitor Check-In</h3>
                <button
                  onClick={() => setShowCheckInModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCheckIn} className="py-4 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Destination Flat
                  </label>
                  <select
                    value={selectedFlatId}
                    onChange={(e) => setSelectedFlatId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-sm text-slate-900"
                  >
                    {flats.map((f) => (
                      <option key={f.id} value={f.id}>
                        Flat {f.flatNumber} ({f.block?.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Visitor Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Anand V"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Visitor Type
                    </label>
                    <select
                      value={visitorType}
                      onChange={(e) => setVisitorType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    >
                      <option value="GUEST">Guest / Family</option>
                      <option value="DELIVERY">Delivery Partner</option>
                      <option value="CAB">Cab / Taxi</option>
                      <option value="SERVICE">Service Technician</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Vehicle Number
                    </label>
                    <input
                      type="text"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      placeholder="e.g. KA-01-AB-1234"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Pre-Approval OTP (If Guest has code)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={checkInOtp}
                    onChange={(e) => setCheckInOtp(e.target.value)}
                    placeholder="e.g. 4821 (Leave blank if unannounced)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-center tracking-widest font-bold"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowCheckInModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                  >
                    {submitting ? 'Checking In...' : 'Verify & Allow Entry'}
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


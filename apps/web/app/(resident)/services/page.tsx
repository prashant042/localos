'use client';

import React, { useEffect, useState } from 'react';
import { PortalLayout } from '@/components/layout/PortalLayout';
import { Wrench, Phone, Star, PlusCircle, CheckCircle2, Clock, X, Calendar } from 'lucide-react';
import { formatINR, formatDate } from '@localos/utils';

export default function ResidentServicesPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingVendor, setBookingVendor] = useState<any | null>(null);

  // Form State
  const [serviceName, setServiceName] = useState('');
  const [description, setDescription] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchVendors();
    fetchMyRequests();
  }, []);

  const fetchVendors = async () => {
    try {
      const res = await fetch('/api/v1/vendors');
      const json = await res.json();
      if (json.success) setVendors(json.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRequests = async () => {
    try {
      const res = await fetch('/api/v1/service-requests');
      const json = await res.json();
      if (json.success) setMyRequests(json.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBookService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingVendor) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/service-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: bookingVendor.id,
          serviceName: serviceName || bookingVendor.services[0]?.serviceName || 'General Service',
          description,
          preferredDate,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBookingVendor(null);
        setDescription('');
        setPreferredDate('');
        fetchMyRequests();
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
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Verified Society Services & Vendors</h1>
          <p className="text-sm text-slate-500">
            Pre-vetted electricians, plumbers, appliance technicians, and carpenters approved by your RWA committee.
          </p>
        </div>

        {/* My Booked Requests */}
        {myRequests.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="font-bold text-sm text-slate-900 mb-3 flex items-center">
              <Clock className="w-4 h-4 mr-2 text-brand-600" />
              Your Service Requests ({myRequests.length})
            </h2>
            <div className="space-y-2">
              {myRequests.map((req) => (
                <div key={req.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{req.serviceName}</span>
                    <span className="text-slate-500 ml-2">by {req.vendor?.companyName}</span>
                    <p className="text-slate-500 mt-0.5">{req.description}</p>
                  </div>
                  <span className="font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vendors Directory */}
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading verified vendors...</div>
        ) : vendors.length === 0 ? (
          <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-500">
            No vendors listed currently.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vendors.map((vendor) => (
              <div
                key={vendor.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-brand-500 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full">
                      {vendor.category}
                    </span>
                    <div className="flex items-center text-amber-500 text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 mr-1" />
                      {vendor.rating.toFixed(1)} / 5.0
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-slate-900">{vendor.companyName}</h3>
                  <div className="text-xs text-slate-500 mt-1 flex items-center">
                    <Phone className="w-3 h-3 mr-1 text-slate-400" />
                    Contact: {vendor.contactPerson} (+91 {vendor.phone})
                  </div>

                  {/* Services Offered */}
                  {vendor.services?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Popular Services
                      </span>
                      {vendor.services.map((svc: any) => (
                        <div key={svc.id} className="flex justify-between text-xs text-slate-700">
                          <span>{svc.serviceName}</span>
                          {svc.basePrice && (
                            <span className="font-mono font-bold text-brand-700">from {formatINR(svc.basePrice)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <a
                    href={`tel:${vendor.phone}`}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center"
                  >
                    <Phone className="w-3.5 h-3.5 mr-1" />
                    Call Direct
                  </a>
                  <button
                    onClick={() => {
                      setBookingVendor(vendor);
                      setServiceName(vendor.services[0]?.serviceName || '');
                    }}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center"
                  >
                    Book Service
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Book Service Modal */}
        {bookingVendor && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Book {bookingVendor.companyName}</h3>
                  <p className="text-xs text-slate-500">{bookingVendor.category}</p>
                </div>
                <button
                  onClick={() => setBookingVendor(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleBookService} className="py-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Select Service
                  </label>
                  <select
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {bookingVendor.services?.map((s: any) => (
                      <option key={s.id} value={s.serviceName}>
                        {s.serviceName} {s.basePrice ? `(${formatINR(s.basePrice)})` : ''}
                      </option>
                    ))}
                    <option value="Other Service">Other / Custom Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    required
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Job Description / Special Notes
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what needs repair or servicing in your flat..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setBookingVendor(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50"
                  >
                    {submitting ? 'Confirming...' : 'Confirm Booking'}
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


'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PortalLayout } from '@/components/layout/PortalLayout';
import {
  Building2,
  PlusCircle,
  Search,
  Filter,
  Eye,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  X,
  Phone,
  Mail,
  ArrowRight
} from 'lucide-react';
import { formatINR, formatDate } from '@localos/utils';

export default function SuperAdminSocietiesPage() {
  const router = useRouter();
  const [societies, setSocieties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Impersonate State
  const [showImpersonateModal, setShowImpersonateModal] = useState(false);
  const [targetSociety, setTargetSociety] = useState<any | null>(null);
  const [reason, setReason] = useState('Resolving customer billing inquiry via support ticket');
  const [impersonating, setImpersonating] = useState(false);

  // New Society Modal
  const [showAddSocietyModal, setShowAddSocietyModal] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [slug, setSlug] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [state, setState] = useState('Karnataka');
  const [pincode, setPincode] = useState('560100');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [addingSociety, setAddingSociety] = useState(false);

  useEffect(() => {
    fetchSocieties();
  }, []);

  const fetchSocieties = async () => {
    try {
      const res = await fetch('/api/v1/admin/societies');
      const json = await res.json();
      if (json.success) setSocieties(json.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSociety) return;
    setImpersonating(true);
    try {
      const res = await fetch('/api/v1/auth/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetSocietyId: targetSociety.id,
          reason,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowImpersonateModal(false);
        router.push('/society-admin');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setImpersonating(false);
    }
  };

  const handleAddSociety = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingSociety(true);
    try {
      const res = await fetch('/api/v1/admin/societies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          code,
          slug,
          address,
          city,
          state,
          pincode,
          contactEmail,
          contactPhone,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowAddSocietyModal(false);
        fetchSocieties();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddingSociety(false);
    }
  };

  const filteredSocieties = societies.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q)
    );
  });

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Societies & Communities Directory</h1>
            <p className="text-sm text-slate-500">Manage all customer residential complexes, subscription plans, and tenant access.</p>
          </div>

          <button
            onClick={() => setShowAddSocietyModal(true)}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Onboard New Society
          </button>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by society name, code, or city..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 font-medium"
            />
          </div>
        </div>

        {/* Societies Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-3.5 pl-5">Society Name</th>
                  <th className="p-3.5">Short Code</th>
                  <th className="p-3.5">City & State</th>
                  <th className="p-3.5">Subscription Plan</th>
                  <th className="p-3.5">Flats</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">Loading societies...</td>
                  </tr>
                ) : filteredSocieties.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">No societies found.</td>
                  </tr>
                ) : (
                  filteredSocieties.map((soc) => {
                    const plan = soc.subscriptions?.[0]?.plan;
                    return (
                      <tr key={soc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 pl-5">
                          <span className="font-bold text-slate-900 text-sm block">{soc.name}</span>
                          <span className="text-[10px] text-slate-400">{soc.contactEmail}</span>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-slate-700">{soc.code}</td>
                        <td className="p-3.5 text-slate-600">{soc.city}, {soc.state}</td>
                        <td className="p-3.5 font-semibold text-purple-700">
                          {plan?.name || 'Growth Society'} ({formatINR(plan?.priceMonthly || 4999)}/mo)
                        </td>
                        <td className="p-3.5 font-bold text-slate-800">{soc._count?.flats || 0}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">
                            {soc.status}
                          </span>
                        </td>
                        <td className="p-3.5 pr-5 text-right">
                          <button
                            onClick={() => {
                              setTargetSociety(soc);
                              setShowImpersonateModal(true);
                            }}
                            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg border border-purple-200 transition-colors text-[11px] inline-flex items-center"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Impersonate (Audit Logged)
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

        {/* Impersonation Modal */}
        {showImpersonateModal && targetSociety && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-5 h-5 text-purple-600" />
                  <h3 className="font-bold text-base text-slate-900">Explicit Impersonation Access</h3>
                </div>
                <button
                  onClick={() => setShowImpersonateModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleImpersonate} className="py-4 space-y-3 text-xs">
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-900">
                  You are entering <strong>{targetSociety.name}</strong> ({targetSociety.code}) with full administrative privileges. An immutable audit record will be logged with your user ID and IP address.
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Audit Reason (Required)
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter audit reason for support/compliance inspection..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowImpersonateModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={impersonating}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                  >
                    {impersonating ? 'Authorizing...' : 'Confirm & Switch Tenant'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Onboard New Society Modal */}
        {showAddSocietyModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <h3 className="font-bold text-base text-slate-900">Onboard New Housing Society</h3>
                <button
                  onClick={() => setShowAddSocietyModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddSociety} className="py-4 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Society / RWA Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!code) setCode(e.target.value.split(' ').map((w) => w[0]).join('').slice(0, 5).toUpperCase());
                      if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                    }}
                    placeholder="e.g. Palm Meadows Owners Association"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Society Short Code
                    </label>
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="e.g. PMOA"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      URL Slug
                    </label>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="e.g. palm-meadows"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Ramagondanahalli, Varthur Road"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">City</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">State</label>
                    <input
                      type="text"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">PIN</label>
                    <input
                      type="text"
                      required
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="committee@palmmeadows.in"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">Phone</label>
                    <input
                      type="tel"
                      required
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddSocietyModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingSociety}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                  >
                    {addingSociety ? 'Provisioning...' : 'Provision Society'}
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


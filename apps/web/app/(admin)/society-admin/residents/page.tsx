'use client';

import React, { useEffect, useState } from 'react';
import { PortalLayout } from '@/components/layout/PortalLayout';
import { Users, PlusCircle, Search, Filter, Phone, Mail, Building, X } from 'lucide-react';
import { formatDate } from '@localos/utils';
import { ResidentType } from '@prisma/client';

export default function SocietyAdminResidentsPage() {
  const [residents, setResidents] = useState<any[]>([]);
  const [flats, setFlats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [flatId, setFlatId] = useState('');
  const [residentType, setResidentType] = useState<ResidentType>(ResidentType.OWNER);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchResidents();
    fetchFlats();
  }, [search, typeFilter]);

  const fetchResidents = async () => {
    try {
      const url = new URL('/api/v1/residents', window.location.origin);
      if (search) url.searchParams.set('search', search);
      if (typeFilter) url.searchParams.set('type', typeFilter);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success) setResidents(json.data || []);
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
        if (json.data?.length > 0 && !flatId) setFlatId(json.data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddResident = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/residents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          phone,
          email,
          flatId,
          residentType,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowAddModal(false);
        setFullName('');
        setPhone('');
        setEmail('');
        fetchResidents();
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Society Residents & Tenants</h1>
            <p className="text-sm text-slate-500">Manage owner and tenant profiles, flat occupancy, and contacts.</p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Add Resident to Flat
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search resident name, phone, or flat..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500 font-medium"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500 font-medium"
          >
            <option value="">All Resident Types</option>
            <option value="OWNER">Owners Only</option>
            <option value="TENANT">Tenants Only</option>
            <option value="FAMILY_MEMBER">Family Members</option>
          </select>
        </div>

        {/* Residents Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-3.5 pl-5">Resident Name</th>
                  <th className="p-3.5">Flat Number</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Mobile Number</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Move-in Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">Loading residents...</td>
                  </tr>
                ) : residents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">No residents found.</td>
                  </tr>
                ) : (
                  residents.map((prof) => (
                    <tr key={prof.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 pl-5">
                        <div className="font-bold text-slate-900 text-sm">{prof.user?.fullName}</div>
                        {prof.isPrimaryResident && (
                          <span className="text-[10px] text-brand-700 font-bold">Primary Contact</span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-800">
                        {prof.flat?.flatNumber} ({prof.flat?.block?.name})
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            prof.residentType === 'OWNER'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {prof.residentType}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono font-semibold text-slate-700">
                        +91 {prof.user?.phone}
                      </td>
                      <td className="p-3.5 text-slate-600">{prof.user?.email || '-'}</td>
                      <td className="p-3.5 text-slate-500">{formatDate(prof.moveInDate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Resident Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <h3 className="font-bold text-base text-slate-900">Add Resident to Flat</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddResident} className="py-4 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Select Flat
                  </label>
                  <select
                    value={flatId}
                    onChange={(e) => setFlatId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    {flats.map((f) => (
                      <option key={f.id} value={f.id}>
                        Flat {f.flatNumber} ({f.block?.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Resident Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sumanth Deshmukh"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
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
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Resident Type
                    </label>
                    <select
                      value={residentType}
                      onChange={(e) => setResidentType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    >
                      <option value="OWNER">Owner</option>
                      <option value="TENANT">Tenant</option>
                      <option value="FAMILY_MEMBER">Family Member</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sumanth@example.com"
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
                    className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                  >
                    {submitting ? 'Adding...' : 'Save & Link Flat'}
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


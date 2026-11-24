'use client';

import React, { useEffect, useState } from 'react';
import { PortalLayout } from '@/components/layout/PortalLayout';
import { AlertCircle, Wrench, CheckCircle2, Clock, UserCheck, Search, Filter, X, Send } from 'lucide-react';
import { formatDate, formatDateTime } from '@localos/utils';

export default function SocietyAdminComplaintsPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  // Assignment Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTargetUserId, setAssignTargetUserId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');

  // Status Modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('IN_PROGRESS');
  const [resolutionNote, setResolutionNote] = useState('');

  useEffect(() => {
    fetchComplaints();
    fetchStaffAndVendors();
  }, [statusFilter]);

  const fetchComplaints = async () => {
    try {
      const url = new URL('/api/v1/complaints', window.location.origin);
      if (statusFilter) url.searchParams.set('status', statusFilter);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success) setComplaints(json.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffAndVendors = async () => {
    try {
      const [stRes, venRes] = await Promise.all([
        fetch('/api/v1/staff'),
        fetch('/api/v1/vendors'),
      ]);
      const [stJson, venJson] = await Promise.all([stRes.json(), venRes.json()]);
      if (stJson.success) setStaffList(stJson.data || []);
      if (venJson.success) setVendors(venJson.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !assignTargetUserId) return;
    try {
      const res = await fetch(`/api/v1/complaints/${selectedTicket.id}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: assignTargetUserId, notes: assignNotes }),
      });
      if (res.ok) {
        setShowAssignModal(false);
        setAssignNotes('');
        fetchComplaints();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/v1/complaints/${selectedTicket.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, resolutionNote }),
      });
      if (res.ok) {
        setShowStatusModal(false);
        setResolutionNote('');
        fetchComplaints();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Society Helpdesk & Complaints</h1>
            <p className="text-sm text-slate-500">Assign maintenance issues, monitor SLA countdowns, and close tickets.</p>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold self-start sm:self-auto"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>

        {/* Complaints Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-3.5 pl-5">Ticket ID</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Title & Location</th>
                  <th className="p-3.5">Flat & Resident</th>
                  <th className="p-3.5">Assigned To</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">Loading complaints...</td>
                  </tr>
                ) : complaints.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">No complaints matching filter.</td>
                  </tr>
                ) : (
                  complaints.map((tkt) => {
                    const assignedPerson = tkt.assignments?.[0]?.assignedTo?.fullName;
                    return (
                      <tr key={tkt.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 pl-5 font-mono font-bold text-slate-900">{tkt.ticketNumber}</td>
                        <td className="p-3.5 font-semibold text-slate-700">{tkt.category?.name}</td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 max-w-xs truncate">{tkt.title}</div>
                          <div className="text-[10px] text-slate-400">{tkt.locationDetails || 'Flat'}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-slate-800">{tkt.flat?.flatNumber || 'Common Area'}</span>
                          <div className="text-[10px] text-slate-400">{tkt.creator?.fullName}</div>
                        </td>
                        <td className="p-3.5 font-medium text-slate-700">
                          {assignedPerson ? (
                            <span className="inline-flex items-center text-emerald-700 font-semibold">
                              <UserCheck className="w-3.5 h-3.5 mr-1" />
                              {assignedPerson}
                            </span>
                          ) : (
                            <span className="text-amber-600 font-semibold italic">Unassigned</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              tkt.priority === 'HIGH' || tkt.priority === 'URGENT'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {tkt.priority}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              tkt.status === 'RESOLVED' || tkt.status === 'CLOSED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : tkt.status === 'IN_PROGRESS'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {tkt.status}
                          </span>
                        </td>
                        <td className="p-3.5 pr-5 text-right space-x-1.5">
                          <button
                            onClick={() => {
                              setSelectedTicket(tkt);
                              setShowAssignModal(true);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px]"
                          >
                            Assign
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTicket(tkt);
                              setNewStatus(tkt.status);
                              setShowStatusModal(true);
                            }}
                            className="px-2.5 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold text-[11px]"
                          >
                            Status
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

        {/* Assign Modal */}
        {showAssignModal && selectedTicket && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Assign Ticket</h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedTicket.ticketNumber}</p>
                </div>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAssign} className="py-4 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Select Staff or Technician
                  </label>
                  <select
                    value={assignTargetUserId}
                    onChange={(e) => setAssignTargetUserId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="">Choose Staff / Vendor...</option>
                    {staffList.filter(s => s.userId).map((s) => (
                      <option key={s.userId} value={s.userId}>
                        Staff: {s.name} ({s.role})
                      </option>
                    ))}
                    {/* Add committee members as options */}
                    <option value="9876543214">Security Guard Ramesh Bahadur</option>
                    <option value="9876543210">President Rajesh Sharma</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Assignment Instructions
                  </label>
                  <textarea
                    rows={3}
                    value={assignNotes}
                    onChange={(e) => setAssignNotes(e.target.value)}
                    placeholder="e.g. Inspect before 2 PM and check pipeline valve in basement"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md"
                  >
                    Confirm Assignment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Update Status Modal */}
        {showStatusModal && selectedTicket && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Update Complaint Status</h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedTicket.ticketNumber}</p>
                </div>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateStatus} className="py-4 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    New Ticket Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="ASSIGNED">ASSIGNED</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="ON_HOLD">ON_HOLD</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Resolution Note
                  </label>
                  <textarea
                    rows={3}
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="e.g. Pipe valve replaced and verified no further seepage."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowStatusModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md"
                  >
                    Update & Notify Resident
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


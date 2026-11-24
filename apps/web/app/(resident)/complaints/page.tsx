'use client';

import React, { useEffect, useState } from 'react';
import { PortalLayout } from '@/components/layout/PortalLayout';
import { AlertCircle, PlusCircle, Clock, CheckCircle2, MessageSquare, Wrench, Shield, X, Send } from 'lucide-react';
import { formatDate, formatDateTime } from '@localos/utils';

export default function ResidentComplaintsPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [newComment, setNewComment] = useState('');

  // Form State
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [locationDetails, setLocationDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComplaints();
    fetchCategories();
  }, []);

  const fetchComplaints = async () => {
    try {
      const res = await fetch('/api/v1/complaints');
      const json = await res.json();
      if (json.success) setComplaints(json.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/v1/complaints/categories');
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setCategories(json.data);
        setCategoryId(json.data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          title,
          description,
          priority,
          locationDetails,
          photos: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=600'], // demo photo proof
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        setTitle('');
        setDescription('');
        setLocationDetails('');
        fetchComplaints();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedTicket) return;
    try {
      const res = await fetch(`/api/v1/complaints/${selectedTicket.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment }),
      });
      const json = await res.json();
      if (json.success) {
        setNewComment('');
        // Refresh ticket
        const updatedRes = await fetch('/api/v1/complaints');
        const updatedJson = await updatedRes.json();
        if (updatedJson.success) {
          setComplaints(updatedJson.data);
          const found = updatedJson.data.find((c: any) => c.id === selectedTicket.id);
          if (found) setSelectedTicket(found);
        }
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
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Helpdesk & Maintenance Complaints</h1>
            <p className="text-sm text-slate-500">Report society issues, track SLA resolution time, and communicate with technicians.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl shadow-md shadow-brand-600/20 transition-all flex items-center self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Raise New Complaint
          </button>
        </div>

        {/* Complaints List */}
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading complaints...</div>
        ) : complaints.length === 0 ? (
          <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-500">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="font-bold text-base text-slate-900">No Open Complaints</h3>
            <p className="text-xs text-slate-400 mt-1">Everything looks smooth in your society!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {complaints.map((tkt) => (
              <div
                key={tkt.id}
                onClick={() => setSelectedTicket(tkt)}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-brand-500 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                      {tkt.ticketNumber}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">{tkt.category?.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        tkt.priority === 'HIGH' || tkt.priority === 'URGENT'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {tkt.priority} PRIORITY
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        tkt.status === 'RESOLVED' || tkt.status === 'CLOSED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : tkt.status === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {tkt.status}
                    </span>
                  </div>
                </div>

                <h3 className="font-bold text-base text-slate-900 mb-1">{tkt.title}</h3>
                <p className="text-xs text-slate-600 line-clamp-2">{tkt.description}</p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                  <div>Reported on {formatDate(tkt.createdAt)} &bull; Location: {tkt.locationDetails || 'Flat'}</div>
                  <div className="flex items-center text-brand-600 font-semibold">
                    <MessageSquare className="w-3.5 h-3.5 mr-1" />
                    {tkt.comments?.length || 0} Comments
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Raise New Complaint Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <h3 className="font-bold text-base text-slate-900">Raise Helpdesk Complaint</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateComplaint} className="py-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (SLA: {c.slaHours} hrs)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setPriority(p)}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                          priority === p
                            ? 'border-brand-600 bg-brand-50 text-brand-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Complaint Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Water leakage from master bathroom pipe"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Location in Flat / Block
                  </label>
                  <input
                    type="text"
                    value={locationDetails}
                    onChange={(e) => setLocationDetails(e.target.value)}
                    placeholder="e.g. Kitchen sink, Balcony, Tower A parking"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Detailed Description
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the issue in detail so technician arrives prepared..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Ticket'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Ticket Details & Comments Drawer */}
        {selectedTicket && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-end">
            <div className="bg-white max-w-lg w-full h-full p-6 shadow-2xl overflow-y-auto flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                  <div>
                    <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {selectedTicket.ticketNumber}
                    </span>
                    <h3 className="font-bold text-lg text-slate-900 mt-1">{selectedTicket.title}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="py-4 space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <div className="flex justify-between text-slate-500">
                      <span>Status:</span>
                      <span className="font-bold text-brand-600">{selectedTicket.status}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Priority:</span>
                      <span className="font-bold text-slate-800">{selectedTicket.priority}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>SLA Due Date:</span>
                      <span className="font-semibold text-slate-700">{formatDateTime(selectedTicket.dueAt)}</span>
                    </div>
                  </div>

                  <p className="text-slate-700 text-sm">{selectedTicket.description}</p>
                </div>

                {/* Conversation Thread */}
                <div className="border-t border-slate-200 pt-4">
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-3">
                    Ticket Activity & Comments
                  </h4>
                  <div className="space-y-3">
                    {selectedTicket.comments?.map((c: any) => (
                      <div key={c.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
                        <div className="flex justify-between font-semibold text-slate-800">
                          <span>{c.author?.fullName || 'Committee'}</span>
                          <span className="text-[10px] text-slate-400 font-normal">{formatDateTime(c.createdAt)}</span>
                        </div>
                        <p className="text-slate-600">{c.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Add Comment Input */}
              <form onSubmit={handleAddComment} className="pt-4 border-t border-slate-200 flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Type a message or response..."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 text-white rounded-xl font-bold text-xs flex items-center shadow-md hover:bg-brand-700"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}


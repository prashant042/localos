'use client';

import React, { useEffect, useState } from 'react';
import { PortalLayout } from '@/components/layout/PortalLayout';
import {
  FolderArchive,
  PlusCircle,
  Search,
  Filter,
  FileText,
  Download,
  Trash2,
  X,
  ExternalLink,
  Shield,
  Calendar,
  Lock,
  Globe,
  Users,
} from 'lucide-react';
import { formatDate } from '@localos/utils';
import { DocumentCategory, DocumentVisibility } from '@prisma/client';

export default function SocietyAdminDocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>(DocumentCategory.BYE_LAWS);
  const [fileUrl, setFileUrl] = useState('');
  const [visibility, setVisibility] = useState<DocumentVisibility>(DocumentVisibility.RESIDENTS_ONLY);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [categoryFilter, search]);

  const fetchDocuments = async () => {
    try {
      const url = new URL('/api/v1/documents', window.location.origin);
      if (categoryFilter) url.searchParams.set('category', categoryFilter);
      if (search) url.searchParams.set('search', search);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success) setDocuments(json.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          fileUrl: fileUrl || `https://documents.localos.in/docs/${Date.now()}.pdf`,
          fileType: 'application/pdf',
          fileSize: 1024 * 750, // 750 KB mock size
          visibility,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowUploadModal(false);
        setTitle('');
        setFileUrl('');
        fetchDocuments();
      } else {
        alert(json.error || 'Failed to upload document');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      const res = await fetch(`/api/v1/documents?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchDocuments();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'PDF';
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <FolderArchive className="w-6 h-6 text-brand-600" />
              Society Documents & Bye-Laws Vault
            </h1>
            <p className="text-sm text-slate-500">
              Official records repository: Bye-Laws, AGM Minutes, Fire NOCs, Audited Financials, and Circulars.
            </p>
          </div>

          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            + Upload Official Document
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
              placeholder="Search documents by title or keyword..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500 font-medium"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500 font-medium text-slate-700"
          >
            <option value="">All Document Categories</option>
            <option value="BYE_LAWS">Society Bye-Laws & Rules</option>
            <option value="MEETING_MINUTES">AGM / EGM Minutes</option>
            <option value="FINANCIALS">Audited Balance Sheets</option>
            <option value="AUDIT_REPORT">Statutory Audit Reports</option>
            <option value="CIRCULAR">Official Circulars</option>
            <option value="AGREEMENT">Vendor & AMC Contracts</option>
            <option value="OTHER">Other Documents</option>
          </select>
        </div>

        {/* Documents Grid */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading documents vault...</div>
        ) : documents.length === 0 ? (
          <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-500">
            No documents uploaded in this category yet. Click '+ Upload Official Document' to publish records.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded-md tracking-wider uppercase">
                      {doc.category.replace('_', ' ')}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                      {doc.visibility === 'PUBLIC' && <Globe className="w-3 h-3 text-emerald-500" />}
                      {doc.visibility === 'RESIDENTS_ONLY' && <Users className="w-3 h-3 text-brand-500" />}
                      {doc.visibility === 'COMMITTEE_ONLY' && <Lock className="w-3 h-3 text-amber-500" />}
                      {doc.visibility}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 leading-snug">{doc.title}</h3>

                  <div className="text-[11px] text-slate-400 flex items-center gap-3">
                    <span>{formatDate(doc.createdAt)}</span>
                    <span>&bull;</span>
                    <span>{formatFileSize(doc.fileSize)}</span>
                    <span>&bull;</span>
                    <span>By: {doc.uploadedBy?.fullName || 'Admin'}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download / View
                  </a>

                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Upload Society Document</h3>
                  <p className="text-xs text-slate-500">Publish official legal records or circulars.</p>
                </div>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUploadDocument} className="py-4 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Document Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Registered Bye-Laws of Greenwood Heights"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Document Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="BYE_LAWS">Society Bye-Laws & Code of Conduct</option>
                    <option value="MEETING_MINUTES">AGM / EGM General Meeting Minutes</option>
                    <option value="FINANCIALS">Audited Balance Sheet & Financials</option>
                    <option value="AUDIT_REPORT">Statutory Audit Report</option>
                    <option value="CIRCULAR">Official Notice / Circular</option>
                    <option value="AGREEMENT">Vendor / AMC Service Contract</option>
                    <option value="OTHER">Other Official Document</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Document Cloud Link / File URL
                  </label>
                  <input
                    type="url"
                    placeholder="e.g. https://storage.google.com/society-docs/byelaws.pdf"
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Leave blank to use default cloud secure storage link.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Access Visibility
                  </label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="RESIDENTS_ONLY">All Verified Residents & Tenants</option>
                    <option value="PUBLIC">Public Access</option>
                    <option value="COMMITTEE_ONLY">Management Committee Only</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                  >
                    {submitting ? 'Uploading...' : 'Publish Document'}
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

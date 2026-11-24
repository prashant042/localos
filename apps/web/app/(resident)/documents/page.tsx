'use client';

import React, { useEffect, useState } from 'react';
import { PortalLayout } from '@/components/layout/PortalLayout';
import {
  FolderArchive,
  Search,
  FileText,
  Download,
  Calendar,
  Building,
  Shield,
  FileCheck,
} from 'lucide-react';
import { formatDate } from '@localos/utils';

export default function ResidentDocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

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

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'PDF';
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FolderArchive className="w-6 h-6 text-brand-600" />
            Society Documents & Records
          </h1>
          <p className="text-sm text-slate-500">
            Official RWA documentation, registered society bye-laws, AGM minutes, and circulars.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search society documents..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500 font-medium"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500 font-medium text-slate-700"
          >
            <option value="">All Categories</option>
            <option value="BYE_LAWS">Society Bye-Laws</option>
            <option value="MEETING_MINUTES">AGM Minutes</option>
            <option value="FINANCIALS">Audited Financials</option>
            <option value="CIRCULAR">Circulars & Notices</option>
            <option value="OTHER">Other Documents</option>
          </select>
        </div>

        {/* Documents Grid */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading society documents...</div>
        ) : documents.length === 0 ? (
          <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-500">
            No official documents published under this category.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <span className="px-2.5 py-0.5 bg-brand-50 text-brand-700 font-bold text-[10px] rounded-md tracking-wider uppercase inline-block">
                    {doc.category.replace('_', ' ')}
                  </span>

                  <h3 className="font-bold text-sm text-slate-900 leading-snug">{doc.title}</h3>

                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(doc.createdAt)}</span>
                    <span>&bull;</span>
                    <span>{formatFileSize(doc.fileSize)}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Verified RWA Record
                  </span>

                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    View / Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}

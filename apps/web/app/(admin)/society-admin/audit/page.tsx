'use client';

import React, { useEffect, useState } from 'react';
import { PortalLayout } from '@/components/layout/PortalLayout';
import { History, ShieldAlert, User, Clock, Search, Filter } from 'lucide-react';
import { formatDateTime } from '@localos/utils';

export default function SocietyAdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAuditLogs();
  }, [search]);

  const fetchAuditLogs = async () => {
    try {
      const url = new URL('/api/v1/admin/audit-logs', window.location.origin);
      if (search) url.searchParams.set('action', search);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success) setLogs(json.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Society Security & Audit Trail</h1>
          <p className="text-sm text-slate-500">Immutable ledger of administrative actions, billing generations, and access events.</p>
        </div>

        {/* Audit Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-3.5 pl-5">Timestamp</th>
                  <th className="p-3.5">Action Event</th>
                  <th className="p-3.5">Actor</th>
                  <th className="p-3.5">Entity</th>
                  <th className="p-3.5">IP & User Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 font-sans">Loading audit records...</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 font-sans">No audit logs recorded yet.</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 pl-5 text-slate-500 whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 font-sans">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-800 font-mono text-[11px]">
                          {log.action}
                        </span>
                        {log.impersonator && (
                          <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-bold">
                            IMPERSONATED BY SUPER ADMIN
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-sans">
                        <span className="font-semibold text-slate-800">{log.actor?.fullName || 'System'}</span>
                        {log.actor?.phone && <div className="text-[10px] text-slate-400">+91 {log.actor.phone}</div>}
                      </td>
                      <td className="p-3.5 text-slate-600">
                        {log.entity} {log.entityId && `(#${log.entityId.slice(0, 8)})`}
                      </td>
                      <td className="p-3.5 text-slate-400 text-[10px] truncate max-w-xs">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}


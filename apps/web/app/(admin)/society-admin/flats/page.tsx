'use client';

import React, { useEffect, useState } from 'react';
import { PortalLayout } from '@/components/layout/PortalLayout';
import { Building2, PlusCircle, FileSpreadsheet, Search, Filter, Download, X, CheckCircle2 } from 'lucide-react';
import { FlatType, OccupancyStatus } from '@prisma/client';

export default function SocietyAdminFlatsPage() {
  const [flats, setFlats] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [showAddFlatModal, setShowAddFlatModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [importResult, setImportResult] = useState<any | null>(null);

  // New Flat State
  const [flatNumber, setFlatNumber] = useState('');
  const [blockId, setBlockId] = useState('');
  const [flatType, setFlatType] = useState('BHK_2');
  const [areaSqFt, setAreaSqFt] = useState('1250');
  const [parkingSlots, setParkingSlots] = useState('');

  useEffect(() => {
    fetchFlats();
    fetchBlocks();
  }, [search, selectedBlockId]);

  const fetchFlats = async () => {
    try {
      const url = new URL('/api/v1/flats', window.location.origin);
      if (search) url.searchParams.set('search', search);
      if (selectedBlockId) url.searchParams.set('blockId', selectedBlockId);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success) setFlats(json.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchBlocks = async () => {
    try {
      const res = await fetch('/api/v1/societies/blocks');
      const json = await res.json();
      if (json.success) {
        setBlocks(json.data || []);
        if (json.data?.length > 0 && !blockId) setBlockId(json.data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateFlat = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/flats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockId,
          flatNumber,
          flatType,
          areaSqFt: parseFloat(areaSqFt),
          parkingSlots,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowAddFlatModal(false);
        setFlatNumber('');
        setParkingSlots('');
        fetchFlats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkImport = async () => {
    try {
      // Parse CSV rows
      const lines = csvContent.trim().split('\n');
      const rows = [];
      // If header row, skip first line
      const startIndex = lines[0].toLowerCase().includes('flat') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim());
        if (parts.length >= 3) {
          rows.push({
            blockCode: parts[0] || 'A',
            flatNumber: parts[1],
            areaSqFt: parseFloat(parts[2]) || 1200,
            flatType: parts[3] || 'BHK_2',
            ownerName: parts[4] || undefined,
            ownerPhone: parts[5] || undefined,
            ownerEmail: parts[6] || undefined,
          });
        }
      }

      const res = await fetch('/api/v1/flats/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const json = await res.json();
      if (json.success) {
        setImportResult(json.data);
        fetchFlats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadSampleCsv = () => {
    setCsvContent(`blockCode,flatNumber,areaSqFt,flatType,ownerName,ownerPhone,ownerEmail
A,A-201,1350,BHK_2,Vikram Malhotra,9871100001,vikram@example.com
A,A-202,1750,BHK_3,Deepa Nair,9871100002,deepa@example.com
B,B-101,1200,BHK_2,Kiran Kulkarni,9871100003,kiran@example.com
B,B-102,1850,BHK_3,Arun Sengupta,9871100004,arun@example.com`);
  };

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Society Flats & Directory</h1>
            <p className="text-sm text-slate-500">Manage blocks, towers, flat configurations, and residents.</p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setShowImportModal(true);
                loadSampleCsv();
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              Bulk CSV Import
            </button>
            <button
              onClick={() => setShowAddFlatModal(true)}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Add Flat
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by flat number or parking slot..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500 font-medium"
            />
          </div>

          <select
            value={selectedBlockId}
            onChange={(e) => setSelectedBlockId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500 font-medium"
          >
            <option value="">All Towers & Blocks</option>
            {blocks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </div>

        {/* Flats Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-3.5 pl-5">Flat Number</th>
                  <th className="p-3.5">Tower / Block</th>
                  <th className="p-3.5">Type & Area</th>
                  <th className="p-3.5">Occupancy</th>
                  <th className="p-3.5">Primary Resident</th>
                  <th className="p-3.5">Parking</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">Loading flats...</td>
                  </tr>
                ) : flats.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">No flats found matching criteria.</td>
                  </tr>
                ) : (
                  flats.map((flat) => {
                    const resident = flat.residents?.[0]?.user;
                    return (
                      <tr key={flat.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 pl-5 font-bold font-mono text-slate-900 text-sm">
                          {flat.flatNumber}
                        </td>
                        <td className="p-3.5 text-slate-700 font-medium">{flat.block?.name}</td>
                        <td className="p-3.5 text-slate-600">
                          <span className="font-semibold text-slate-800">{flat.flatType}</span> &bull; {flat.areaSqFt} sq.ft
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              flat.occupancyStatus === 'OWNER_OCCUPIED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : flat.occupancyStatus === 'TENANT_OCCUPIED'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {flat.occupancyStatus.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3.5">
                          {resident ? (
                            <div>
                              <span className="font-bold text-slate-800">{resident.fullName}</span>
                              <div className="text-[10px] text-slate-400 font-mono">+91 {resident.phone}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-600 font-mono text-[11px]">
                          {flat.parkingSlots || 'None'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Flat Modal */}
        {showAddFlatModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <h3 className="font-bold text-base text-slate-900">Add Flat to Society</h3>
                <button
                  onClick={() => setShowAddFlatModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateFlat} className="py-4 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Tower / Block
                  </label>
                  <select
                    value={blockId}
                    onChange={(e) => setBlockId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  >
                    {blocks.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Flat Number
                  </label>
                  <input
                    type="text"
                    required
                    value={flatNumber}
                    onChange={(e) => setFlatNumber(e.target.value)}
                    placeholder="e.g. A-302, 401"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Flat Type
                    </label>
                    <select
                      value={flatType}
                      onChange={(e) => setFlatType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                    >
                      <option value="BHK_1">1 BHK</option>
                      <option value="BHK_2">2 BHK</option>
                      <option value="BHK_3">3 BHK</option>
                      <option value="BHK_4">4 BHK</option>
                      <option value="PENTHOUSE">Penthouse</option>
                      <option value="VILLA">Villa</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Area (Sq. Ft.)
                    </label>
                    <input
                      type="number"
                      required
                      value={areaSqFt}
                      onChange={(e) => setAreaSqFt(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Parking Slot(s)
                  </label>
                  <input
                    type="text"
                    value={parkingSlots}
                    onChange={(e) => setParkingSlots(e.target.value)}
                    placeholder="e.g. P-12, P-13"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                  />
                </div>

                <div className="pt-3 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddFlatModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md"
                  >
                    Save Flat
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bulk CSV Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Bulk Import Flats & Residents via CSV</h3>
                  <p className="text-xs text-slate-500">Paste or edit CSV rows to import flats and assign residents</p>
                </div>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportResult(null);
                  }}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {importResult ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-100 text-brand-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-slate-900">Import Completed!</h4>
                  <p className="text-xs text-slate-600">
                    Imported <strong>{importResult.importedFlatsCount} flats</strong> and{' '}
                    <strong>{importResult.importedResidentsCount} residents</strong>.
                  </p>
                  <button
                    onClick={() => {
                      setShowImportModal(false);
                      setImportResult(null);
                    }}
                    className="px-5 py-2 bg-brand-600 text-white font-bold text-xs rounded-xl shadow-md"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="py-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600 font-semibold">CSV Content (Comma-separated)</span>
                    <button
                      type="button"
                      onClick={loadSampleCsv}
                      className="text-xs text-brand-600 font-bold hover:underline"
                    >
                      Reset to Sample
                    </button>
                  </div>

                  <textarea
                    rows={8}
                    value={csvContent}
                    onChange={(e) => setCsvContent(e.target.value)}
                    className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  />

                  <div className="text-[11px] text-slate-400">
                    Columns: <code>blockCode, flatNumber, areaSqFt, flatType, ownerName, ownerPhone, ownerEmail</code>
                  </div>

                  <div className="pt-2 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowImportModal(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkImport}
                      className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md"
                    >
                      Run Import
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}


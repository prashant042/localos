'use client';

import React, { useEffect, useState } from 'react';
import { PortalLayout } from '@/components/layout/PortalLayout';
import {
  Receipt,
  PlusCircle,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Star,
  Users,
  Building,
  Check,
  X,
} from 'lucide-react';
import { formatINR } from '@localos/utils';

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [priceMonthly, setPriceMonthly] = useState(2499);
  const [priceYearly, setPriceYearly] = useState(24990);
  const [maxFlats, setMaxFlats] = useState(150);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/v1/admin/plans');
      const json = await res.json();
      if (json.success && json.data) {
        setPlans(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          code: code.toUpperCase(),
          priceMonthly: Number(priceMonthly),
          priceYearly: Number(priceYearly),
          maxFlats: Number(maxFlats),
          features: ['billing', 'complaints', 'gatekeeper', 'notices', 'polls'],
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowAddModal(false);
        fetchPlans();
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-6 h-6 text-brand-600" />
              SaaS Subscription Plans
            </h1>
            <p className="text-sm text-slate-500">
              Configure subscription tiers, recurring billing intervals, and feature entitlements.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Add New Plan
          </button>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const activeCount = p.activeSocietiesCount ?? (p._count?.subscriptions || 0);
            const hasSubscribers = activeCount > 0;
            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl border transition-all p-6 flex flex-col justify-between ${
                  p.isPopular
                    ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-lg relative'
                    : 'border-slate-200 shadow-sm hover:shadow-md'
                }`}
              >
                {p.isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <Star className="w-3 h-3 fill-white" /> Most Popular
                  </span>
                )}

                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded uppercase">
                        {p.code || p.tier}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                        hasSubscribers
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold ring-2 ring-emerald-500/10'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}
                    >
                      {activeCount} Active
                    </span>
                  </div>

                  {/* Show active society names if any */}
                  {p.activeSocieties && p.activeSocieties.length > 0 && (
                    <div className="mb-4 text-[11px] text-emerald-800 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200 space-y-1">
                      <div className="font-bold text-emerald-900 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Active Subscriber:
                      </div>
                      {p.activeSocieties.map((s: any) => (
                        <div key={s.id} className="font-medium text-emerald-800 pl-4 truncate">
                          • {s.name} ({s.city})
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-slate-900">
                        {formatINR(p.priceMonthly)}
                      </span>
                      <span className="text-xs text-slate-500">/ month</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      or {formatINR(p.priceYearly)} billed annually
                    </p>
                  </div>

                  <div className="space-y-3 mb-6 pt-4 border-t border-slate-100">
                    <div className="flex items-center text-xs font-medium text-slate-700 gap-2">
                      <Building className="w-4 h-4 text-brand-600" />
                      Up to <span className="font-bold">{p.maxFlats} Flats / Units</span>
                    </div>
                    {(p.features || []).map((feat: string, i: number) => (
                      <div key={i} className="flex items-start text-xs text-slate-600 gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        <span className="capitalize">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 transition-colors">
                    Edit Plan & Limits
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-900">Create Subscription Plan</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreatePlan} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Standard Apartment Tier"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Code</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. STANDARD"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Price / Mo (INR)</label>
                    <input
                      type="number"
                      required
                      value={priceMonthly}
                      onChange={(e) => setPriceMonthly(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Price / Yr (INR)</label>
                    <input
                      type="number"
                      required
                      value={priceYearly}
                      onChange={(e) => setPriceYearly(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Max Flats Allowed</label>
                  <input
                    type="number"
                    required
                    value={maxFlats}
                    onChange={(e) => setMaxFlats(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create Plan'}
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

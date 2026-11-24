'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, ArrowRight, Building, CheckCircle, Users, Receipt, AlertCircle, Sparkles } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/v1/auth/me');
        const json = await res.json();
        if (json.success && json.data?.user) {
          const role = json.data.user.role;
          if (role === 'SUPER_ADMIN') router.push('/admin');
          else if (role === 'SOCIETY_ADMIN' || role === 'COMMITTEE_MEMBER') router.push('/society-admin');
          else if (role === 'GUARD') router.push('/guard');
          else router.push('/dashboard');
        }
      } catch (e) {
        // Not authenticated, stay on landing
      }
    }
    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Navbar */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">
              Local<span className="text-brand-600">OS</span>
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-brand-600/20 transition-all flex items-center"
            >
              Sign In to Society
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1 flex flex-col justify-center items-center text-center">
        <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5 mr-1.5 text-brand-600" />
          The Operating System for Indian Housing Societies & RWAs
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight max-w-4xl leading-tight">
          Modern Society Governance. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-emerald-500">
            Automated, Transparent, Mobile-First.
          </span>
        </h1>

        <p className="mt-6 text-lg text-slate-600 max-w-2xl font-medium">
          Say goodbye to delayed maintenance collections, chaotic WhatsApp complaints, and manual paper registers. LocalOS unites residents, RWA committees, guards, and local vendors in one unified platform.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            href="/login"
            className="px-8 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl shadow-xl shadow-brand-600/30 transition-all text-base flex items-center justify-center"
          >
            Launch Demo Society (Greenwood Heights)
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-5xl w-full">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-brand-600 mb-4">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Automated Maintenance & UPI</h3>
            <p className="text-sm text-slate-600">
              Bulk invoice generation by sq.ft or flat rate, Razorpay 1-click UPI payments, digital receipts, and automated defaulter reminders.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Touch Guard Console & Gatekeeper</h3>
            <p className="text-sm text-slate-600">
              High-contrast tablet gate console, visitor entry approvals, guest OTP verification, and delivery parcel tracking for Swiggy, Amazon & Blinkit.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Helpdesk, Notices & Polls</h3>
            <p className="text-sm text-slate-600">
              Complaint ticketing with photo proofs, technician assignments, SLA timers, society broadcast notices, and democratic polling.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500 font-medium">
          LocalOS Multi-Tenant Society Operating System &bull; Production Ready for Indian Communities
        </div>
      </footer>
    </div>
  );
}


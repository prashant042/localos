'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Phone, KeyRound, ArrowRight, UserCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'otp' | 'password'>('password');
  const [phone, setPhone] = useState('9876543212'); // Default to resident Amit Patel
  const [password, setPassword] = useState('Resident@123');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: phone, password }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Login failed');
      }

      redirectBasedOnRole(data.data.user.role);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    if (!phone || phone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Failed to send OTP');
      setOtpSent(true);
      setOtp('123456'); // Pre-fill test OTP for demo convenience
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'OTP verification failed');

      redirectBasedOnRole(data.data.user.role);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const redirectBasedOnRole = (role: string) => {
    if (role === 'SUPER_ADMIN') {
      router.push('/admin');
    } else if (role === 'SOCIETY_ADMIN' || role === 'COMMITTEE_MEMBER' || role === 'ACCOUNTANT') {
      router.push('/society-admin');
    } else if (role === 'GUARD') {
      router.push('/guard');
    } else {
      router.push('/dashboard');
    }
  };

  const quickLoginAs = (quickPhone: string, quickPass: string) => {
    setTab('password');
    setPhone(quickPhone);
    setPassword(quickPass);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-400 text-white shadow-xl shadow-brand-500/25 mb-4">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Welcome to <span className="text-brand-600">LocalOS</span>
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          The Society Operating System for Indian Residential Communities
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-300/50 sm:rounded-2xl sm:px-10 border border-slate-200/80">
          {/* Login Tabs */}
          <div className="flex border-b border-slate-200 mb-6">
            <button
              onClick={() => { setTab('password'); setError(null); }}
              className={`flex-1 pb-3 text-center text-sm font-semibold border-b-2 transition-colors ${
                tab === 'password'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Password Login
            </button>
            <button
              onClick={() => { setTab('otp'); setError(null); }}
              className={`flex-1 pb-3 text-center text-sm font-semibold border-b-2 transition-colors ${
                tab === 'otp'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Phone OTP Login
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center text-rose-700 text-sm">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {tab === 'password' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Mobile Number or Email
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543212"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all outline-none font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center text-sm disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
                {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Indian Mobile Number
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-300 bg-slate-100 text-slate-600 text-sm font-semibold">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543212"
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-r-xl text-slate-900 text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all outline-none font-medium"
                  />
                </div>
              </div>

              {!otpSent ? (
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center text-sm disabled:opacity-50"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
                    ✓ OTP code sent. Use test code: <strong>123456</strong>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Enter 6-Digit OTP
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="123456"
                      className="w-full px-4 py-2.5 text-center tracking-widest font-mono text-lg font-bold bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center text-sm disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Verify OTP & Enter'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Quick Demo Persona Switcher */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider text-center mb-3">
              ⚡ 1-Click Demo Persona Login
            </span>
            <div className="grid grid-cols-2 gap-2 text-left">
              <button
                type="button"
                onClick={() => quickLoginAs('9876543212', 'Resident@123')}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 transition-all text-xs group"
              >
                <div className="font-semibold text-slate-800 group-hover:text-brand-700">🏡 Resident Owner</div>
                <div className="text-[10px] text-slate-500">Amit Patel (Flat A-402)</div>
              </button>

              <button
                type="button"
                onClick={() => quickLoginAs('9876543210', 'Admin@123')}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 transition-all text-xs group"
              >
                <div className="font-semibold text-slate-800 group-hover:text-brand-700">🏢 Society Admin</div>
                <div className="text-[10px] text-slate-500">Rajesh Sharma (President)</div>
              </button>

              <button
                type="button"
                onClick={() => quickLoginAs('9876543214', 'Guard@123')}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 transition-all text-xs group"
              >
                <div className="font-semibold text-slate-800 group-hover:text-amber-700">🛡️ Gate Guard</div>
                <div className="text-[10px] text-slate-500">Ramesh Bahadur (Gate 1)</div>
              </button>

              <button
                type="button"
                onClick={() => quickLoginAs('9999900000', 'Admin@123')}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50/50 transition-all text-xs group"
              >
                <div className="font-semibold text-slate-800 group-hover:text-purple-700">👑 Super Admin</div>
                <div className="text-[10px] text-slate-500">Platform SaaS Owner</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


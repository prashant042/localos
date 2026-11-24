'use client';

import React, { useEffect, useState } from 'react';
import { PortalLayout } from '@/components/layout/PortalLayout';
import {
  Settings,
  Building,
  Receipt,
  Shield,
  CheckCircle2,
  AlertCircle,
  Save,
  Sliders,
  Sparkles,
  Calculator,
  ChevronRight,
  Info,
  Clock,
} from 'lucide-react';
import { MODULE_CATALOG } from '@localos/config';
import { CalculationMethod } from '@prisma/client';
import { formatINR } from '@localos/utils';

export default function SocietyAdminSettingsPage() {
  const [society, setSociety] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  // Internal Settings Sidebar Tab
  const [settingsTab, setSettingsTab] = useState<'identity' | 'billing' | 'modules'>('identity');

  // Society Identity Form Fields
  const [name, setName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  // Maintenance Calculation Rules State
  const [configName, setConfigName] = useState('Standard FY2026-27 Rate Structure');
  const [calcMethod, setCalcMethod] = useState<CalculationMethod>(CalculationMethod.PER_SQFT_AREA);
  const [ratePerSqFt, setRatePerSqFt] = useState('3.50');
  const [fixedAmount, setFixedAmount] = useState('5000');
  const [sinkingFund, setSinkingFund] = useState('500');
  const [parkingFee, setParkingFee] = useState('250');
  const [dueDays, setDueDays] = useState('15');
  const [graceDays, setGraceDays] = useState('5');
  const [lateFeePct, setLateFeePct] = useState('5.0');
  const [gstApplicable, setGstApplicable] = useState(false);
  const [autoBillingEnabled, setAutoBillingEnabled] = useState(true);
  const [autoBillingDay, setAutoBillingDay] = useState(1);
  const [runningCron, setRunningCron] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [socRes, cfgRes] = await Promise.all([
        fetch('/api/v1/societies/current'),
        fetch('/api/v1/billing/configs'),
      ]);

      const socJson = await socRes.json();
      if (socJson.success && socJson.data) {
        const s = socJson.data;
        setSociety(s);
        setName(s.name);
        setGstNumber(s.gstNumber || '');
        setRegistrationNumber(s.registrationNumber || '');
        setContactEmail(s.contactEmail);
        setContactPhone(s.contactPhone);
        setAddress(s.address);
        setCity(s.city);
        setState(s.state);
        setPincode(s.pincode);
      }

      const cfgJson = await cfgRes.json();
      if (cfgJson.success && cfgJson.data?.length > 0) {
        const active = cfgJson.data.find((c: any) => c.isActive) || cfgJson.data[0];
        setConfigName(active.name);
        setCalcMethod(active.calculationMethod);
        if (active.ratePerSqFt) setRatePerSqFt(active.ratePerSqFt.toString());
        if (active.fixedAmount) setFixedAmount(active.fixedAmount.toString());
        setSinkingFund(active.sinkingFundAmount?.toString() || '500');
        setParkingFee(active.parkingChargePerSlot?.toString() || '250');
        setDueDays(active.dueDaysFromIssue?.toString() || '15');
        setGraceDays(active.gracePeriodDays?.toString() || '5');
        setLateFeePct(active.lateFeeValue?.toString() || '5.0');
        setGstApplicable(!!active.gstApplicable);
        if (active.autoBillingEnabled !== undefined) setAutoBillingEnabled(!!active.autoBillingEnabled);
        if (active.autoBillingDay) setAutoBillingDay(active.autoBillingDay);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerCron = async () => {
    setRunningCron(true);
    try {
      const res = await fetch('/api/v1/billing/cron/monthly-cycle', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        alert(json.data?.message || 'Automated billing cycle completed successfully!');
      } else {
        alert(json.error || 'Failed to trigger automated billing.');
      }
    } catch (e) {
      console.error(e);
      alert('Error triggering scheduler.');
    } finally {
      setRunningCron(false);
    }
  };

  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(null);

    try {
      const res = await fetch('/api/v1/societies/current', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          gstNumber,
          registrationNumber,
          contactEmail,
          contactPhone,
          address,
          city,
          state,
          pincode,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSavedSuccess('Society Identity details updated successfully!');
        setTimeout(() => setSavedSuccess(null), 3500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(null);

    try {
      const res = await fetch('/api/v1/billing/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: configName,
          calculationMethod: calcMethod,
          ratePerSqFt:
            calcMethod === CalculationMethod.PER_SQFT_AREA ? parseFloat(ratePerSqFt) : undefined,
          fixedAmount:
            calcMethod === CalculationMethod.FIXED_PER_FLAT ? parseFloat(fixedAmount) : undefined,
          sinkingFundAmount: parseFloat(sinkingFund) || 0,
          parkingChargePerSlot: parseFloat(parkingFee) || 0,
          dueDaysFromIssue: parseInt(dueDays) || 15,
          gracePeriodDays: parseInt(graceDays) || 5,
          lateFeeValue: parseFloat(lateFeePct) || 5,
          gstApplicable,
          autoBillingEnabled,
          autoBillingDay,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSavedSuccess('Maintenance Calculation Rules & Policy updated successfully!');
        setTimeout(() => setSavedSuccess(null), 3500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Preview Calculations
  const baseRateNum = parseFloat(ratePerSqFt) || 3.5;
  const sinkingFundNum = parseFloat(sinkingFund) || 500;
  const parkingFeeNum = parseFloat(parkingFee) || 250;

  const example2BHK =
    calcMethod === CalculationMethod.PER_SQFT_AREA
      ? Math.round(1350 * baseRateNum + sinkingFundNum + parkingFeeNum)
      : parseFloat(fixedAmount) || 5000;

  const example3BHK =
    calcMethod === CalculationMethod.PER_SQFT_AREA
      ? Math.round(1750 * baseRateNum + sinkingFundNum + parkingFeeNum * 2)
      : parseFloat(fixedAmount) || 5000;

  return (
    <PortalLayout>
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-brand-600" />
            Society Settings & Governance
          </h1>
          <p className="text-sm text-slate-500">
            Manage your society legal profile, maintenance calculation rules, and active modules.
          </p>
        </div>

        {/* Global Success Notification */}
        {savedSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center text-emerald-800 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-600" />
            {savedSuccess}
          </div>
        )}

        {/* 2-Column Layout with Internal Settings Sidebar */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Internal Settings Navigation Sidebar */}
          <div className="w-full md:w-64 bg-white rounded-2xl border border-slate-200 p-2.5 shadow-sm shrink-0 space-y-1">
            <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Settings Sections
            </div>

            {/* Option 1: Society Identity */}
            <button
              type="button"
              onClick={() => setSettingsTab('identity')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left text-xs font-bold transition-all ${
                settingsTab === 'identity'
                  ? 'bg-brand-50 text-brand-700 border border-brand-200 ring-2 ring-brand-500/10 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Building
                  className={`w-4 h-4 ${
                    settingsTab === 'identity' ? 'text-brand-600' : 'text-slate-400'
                  }`}
                />
                <div>
                  <div className="font-bold text-xs">Society Identity</div>
                  <div className="text-[10px] font-normal text-slate-400">
                    Legal profile & address
                  </div>
                </div>
              </div>
              {settingsTab === 'identity' && (
                <ChevronRight className="w-3.5 h-3.5 text-brand-600" />
              )}
            </button>

            {/* Option 2: Billing Configuration */}
            <button
              type="button"
              onClick={() => setSettingsTab('billing')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left text-xs font-bold transition-all ${
                settingsTab === 'billing'
                  ? 'bg-brand-50 text-brand-700 border border-brand-200 ring-2 ring-brand-500/10 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Calculator
                  className={`w-4 h-4 ${
                    settingsTab === 'billing' ? 'text-brand-600' : 'text-slate-400'
                  }`}
                />
                <div>
                  <div className="font-bold text-xs">Billing Configuration</div>
                  <div className="text-[10px] font-normal text-slate-400">
                    Maintenance rules & rates
                  </div>
                </div>
              </div>
              {settingsTab === 'billing' && (
                <ChevronRight className="w-3.5 h-3.5 text-brand-600" />
              )}
            </button>

            {/* Option 3: Active Modules */}
            <button
              type="button"
              onClick={() => setSettingsTab('modules')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left text-xs font-bold transition-all ${
                settingsTab === 'modules'
                  ? 'bg-brand-50 text-brand-700 border border-brand-200 ring-2 ring-brand-500/10 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Shield
                  className={`w-4 h-4 ${
                    settingsTab === 'modules' ? 'text-brand-600' : 'text-slate-400'
                  }`}
                />
                <div>
                  <div className="font-bold text-xs">Active Modules</div>
                  <div className="text-[10px] font-normal text-slate-400">
                    Feature catalog & access
                  </div>
                </div>
              </div>
              {settingsTab === 'modules' && (
                <ChevronRight className="w-3.5 h-3.5 text-brand-600" />
              )}
            </button>
          </div>

          {/* Settings Content Area */}
          <div className="flex-1 w-full">
            {/* ============================================================== */}
            {/* SECTION 1: SOCIETY IDENTITY                                    */}
            {/* ============================================================== */}
            {settingsTab === 'identity' && (
              <form onSubmit={handleSaveIdentity} className="space-y-6 animate-in fade-in">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                        <Building className="w-4 h-4 text-brand-600" />
                        Society Identity & Legal Profile
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Official registration details printed on invoices, notices, and receipts.
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                      Code: {society?.code || 'GHRWA'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Society / RWA Legal Name
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Registration Number
                      </label>
                      <input
                        type="text"
                        value={registrationNumber}
                        onChange={(e) => setRegistrationNumber(e.target.value)}
                        placeholder="e.g. REG/BLR/2022/4819"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        GSTIN (GST Number)
                      </label>
                      <input
                        type="text"
                        value={gstNumber}
                        onChange={(e) => setGstNumber(e.target.value)}
                        placeholder="e.g. 29AABCG1234F1Z8"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Official Contact Mobile
                      </label>
                      <input
                        type="tel"
                        required
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Official Society Email
                      </label>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                      />
                    </div>
                  </div>

                  <div className="text-xs pt-1">
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Full Physical Address
                    </label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        required
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Pincode
                      </label>
                      <input
                        type="text"
                        required
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save Society Identity'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* ============================================================== */}
            {/* SECTION 2: BILLING CONFIGURATION                               */}
            {/* ============================================================== */}
            {settingsTab === 'billing' && (
              <form onSubmit={handleSaveBilling} className="space-y-6 animate-in fade-in">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-brand-600" />
                        Maintenance Calculation Rules & Policy
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Mathematical rules applied when generating bulk monthly invoices for flats.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Active Policy
                    </span>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Policy Name
                      </label>
                      <input
                        type="text"
                        required
                        value={configName}
                        onChange={(e) => setConfigName(e.target.value)}
                        placeholder="e.g. Standard FY2026-27 Rate Structure"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Calculation Method
                        </label>
                        <select
                          value={calcMethod}
                          onChange={(e) => setCalcMethod(e.target.value as any)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                        >
                          <option value="PER_SQFT_AREA">
                            Per Sq. Ft Area Rate (Super Built-up)
                          </option>
                          <option value="FIXED_PER_FLAT">
                            Fixed Flat Rate (Equal for all flats)
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          {calcMethod === 'PER_SQFT_AREA'
                            ? 'Rate per Sq. Ft (INR)'
                            : 'Fixed Amount per Flat (INR)'}
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={calcMethod === 'PER_SQFT_AREA' ? ratePerSqFt : fixedAmount}
                          onChange={(e) =>
                            calcMethod === 'PER_SQFT_AREA'
                              ? setRatePerSqFt(e.target.value)
                              : setFixedAmount(e.target.value)
                          }
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Sinking Fund / Month (INR)
                        </label>
                        <input
                          type="number"
                          required
                          value={sinkingFund}
                          onChange={(e) => setSinkingFund(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-semibold"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Reserve capital fund for major repairs & painting.
                        </span>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Parking Slot Fee / Month (INR)
                        </label>
                        <input
                          type="number"
                          required
                          value={parkingFee}
                          onChange={(e) => setParkingFee(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-semibold"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Applied per allocated vehicle parking slot.
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Payment Due Window
                        </label>
                        <div className="flex items-center">
                          <input
                            type="number"
                            required
                            value={dueDays}
                            onChange={(e) => setDueDays(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-semibold"
                          />
                          <span className="ml-2 text-slate-500 text-[11px]">days</span>
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Grace Period
                        </label>
                        <div className="flex items-center">
                          <input
                            type="number"
                            required
                            value={graceDays}
                            onChange={(e) => setGraceDays(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-semibold"
                          />
                          <span className="ml-2 text-slate-500 text-[11px]">days</span>
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Late Fee %
                        </label>
                        <div className="flex items-center">
                          <input
                            type="number"
                            step="0.5"
                            required
                            value={lateFeePct}
                            onChange={(e) => setLateFeePct(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-semibold"
                          />
                          <span className="ml-2 text-slate-500 text-[11px]">%</span>
                        </div>
                      </div>
                    </div>

                    {/* Automated Recurring Billing Scheduler Card */}
                    <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-indigo-600" />
                            Auto-Recurring Monthly Billing Scheduler (Cron Engine)
                          </span>
                          <p className="text-[11px] text-indigo-700 mt-0.5">
                            Automatically generates invoices on the 1st of every month, auto-deducts advance wallets, and sends notices.
                          </p>
                        </div>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoBillingEnabled}
                            onChange={(e) => setAutoBillingEnabled(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-indigo-100 text-[11px]">
                        <span className="text-slate-600 font-medium">
                          Next Scheduled Run: <strong>Day 1 of Month @ 00:00 IST</strong>
                        </span>
                        <button
                          type="button"
                          onClick={handleTriggerCron}
                          disabled={runningCron}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                        >
                          {runningCron ? 'Executing...' : 'Trigger Scheduled Run Now'}
                        </button>
                      </div>
                    </div>

                    {/* Live Preview Card */}
                    <div className="p-4 bg-brand-50/50 rounded-xl border border-brand-100 mt-2 space-y-2">
                      <div className="font-bold text-xs text-brand-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                        Live Calculated Bill Preview Under Current Rules:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 bg-white rounded-lg border border-brand-100">
                          <span className="text-[11px] text-slate-500 block">
                            2BHK (1,350 sq. ft &bull; 1 Parking Slot)
                          </span>
                          <span className="text-base font-black text-slate-900">
                            {formatINR(example2BHK)} / month
                          </span>
                        </div>
                        <div className="p-3 bg-white rounded-lg border border-brand-100">
                          <span className="text-[11px] text-slate-500 block">
                            3BHK (1,750 sq. ft &bull; 2 Parking Slots)
                          </span>
                          <span className="text-base font-black text-slate-900">
                            {formatINR(example3BHK)} / month
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving Policy...' : 'Save Billing Configuration'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* ============================================================== */}
            {/* SECTION 3: ACTIVE SYSTEM MODULES                               */}
            {/* ============================================================== */}
            {settingsTab === 'modules' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-brand-600" />
                    Active System Modules Manifest
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Subscribed modules and granular tenant feature entitlements.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {MODULE_CATALOG.map((mod) => (
                    <div
                      key={mod.key}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{mod.name}</span>
                        <p className="text-[11px] text-slate-500 mt-0.5">{mod.description}</p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800 shrink-0 ml-2">
                        ACTIVE
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  Receipt,
  AlertCircle,
  ShieldCheck,
  Megaphone,
  Vote,
  UserCheck,
  Wrench,
  FileText,
  Settings,
  History,
  ShieldAlert,
  ArrowRightLeft,
  PieChart,
  TrendingDown,
  FolderArchive,
} from 'lucide-react';
import { AuthUser } from '@localos/types';

interface AppSidebarProps {
  user: AuthUser;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();

  const getNavItems = () => {
    if (user.isSuperAdmin && pathname.startsWith('/admin')) {
      return [
        { label: 'Platform Overview', href: '/admin', icon: LayoutDashboard },
        { label: 'Societies Directory', href: '/admin/societies', icon: Building2 },
        { label: 'Subscription Plans', href: '/admin/plans', icon: Receipt },
        { label: 'Platform Analytics', href: '/admin/analytics', icon: PieChart },
        { label: 'Global Audit Trail', href: '/admin/audit', icon: History },
      ];
    }

    if (user.role === 'GUARD') {
      return [
        { label: 'Gate Console', href: '/guard', icon: ShieldCheck },
        { label: 'Deliveries', href: '/guard/deliveries', icon: FileText },
        { label: 'Staff Attendance', href: '/guard/attendance', icon: UserCheck },
      ];
    }

    if (user.role === 'SOCIETY_ADMIN' || user.role === 'COMMITTEE_MEMBER' || user.role === 'ACCOUNTANT') {
      return [
        { label: 'Dashboard', href: '/society-admin', icon: LayoutDashboard },
        { label: 'Flats & Directory', href: '/society-admin/flats', icon: Building2 },
        { label: 'Residents', href: '/society-admin/residents', icon: Users },
        { label: 'Billing & Invoices', href: '/society-admin/billing', icon: Receipt },
        { label: 'Expenses & Vendor Bills', href: '/society-admin/expenses', icon: TrendingDown },
        { label: 'Defaulters Report', href: '/society-admin/defaulters', icon: FileText },
        { label: 'Society Documents', href: '/society-admin/documents', icon: FolderArchive },
        { label: 'Complaints', href: '/society-admin/complaints', icon: AlertCircle },
        { label: 'Gate & Visitors', href: '/society-admin/visitors', icon: ShieldCheck },
        { label: 'Notices & Polls', href: '/society-admin/notices', icon: Megaphone },
        { label: 'Staff Attendance', href: '/society-admin/staff', icon: UserCheck },
        { label: 'Verified Vendors', href: '/society-admin/vendors', icon: Wrench },
        { label: 'Settings', href: '/society-admin/settings', icon: Settings },
        { label: 'Audit Logs', href: '/society-admin/audit', icon: History },
      ];
    }

    // Default: Resident / Tenant Portal
    return [
      { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Maintenance Dues', href: '/dues', icon: Receipt },
      { label: 'Complaints', href: '/complaints', icon: AlertCircle },
      { label: 'Visitors & Gate', href: '/visitors', icon: ShieldCheck },
      { label: 'Notices', href: '/notices', icon: Megaphone },
      { label: 'Community Polls', href: '/polls', icon: Vote },
      { label: 'Society Documents', href: '/documents', icon: FolderArchive },
      { label: 'Local Services', href: '/services', icon: Wrench },
    ];
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between hidden md:flex">
      <div className="space-y-1">
        <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Navigation
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                isActive
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 mr-3 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Switch Portal Quick Actions for Admins */}
      <div className="pt-4 border-t border-slate-200 space-y-2">
        {user.isSuperAdmin && (
          <Link
            href="/admin"
            className="flex items-center px-3 py-2 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <ShieldAlert className="w-4 h-4 mr-2" />
            Super Admin Panel
          </Link>
        )}

        {(user.role === 'SOCIETY_ADMIN' || user.role === 'COMMITTEE_MEMBER') && (
          <Link
            href="/dashboard"
            className="flex items-center px-3 py-2 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Switch to Resident View
          </Link>
        )}
      </div>
    </aside>
  );
}


'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, AlertCircle, ShieldCheck, Megaphone } from 'lucide-react';
import { AuthUser } from '@localos/types';

export function MobileNav({ user }: { user: AuthUser }) {
  const pathname = usePathname();

  const getLinks = () => {
    if (user.role === 'GUARD') {
      return [
        { label: 'Gate', href: '/guard', icon: ShieldCheck },
        { label: 'Deliveries', href: '/guard/deliveries', icon: Receipt },
        { label: 'Attendance', href: '/guard/attendance', icon: AlertCircle },
      ];
    }
    if (user.role === 'SOCIETY_ADMIN' || user.role === 'COMMITTEE_MEMBER') {
      return [
        { label: 'Admin', href: '/society-admin', icon: LayoutDashboard },
        { label: 'Flats', href: '/society-admin/flats', icon: Receipt },
        { label: 'Billing', href: '/society-admin/billing', icon: Receipt },
        { label: 'Tickets', href: '/society-admin/complaints', icon: AlertCircle },
        { label: 'Gate', href: '/society-admin/visitors', icon: ShieldCheck },
      ];
    }
    return [
      { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Dues', href: '/dues', icon: Receipt },
      { label: 'Tickets', href: '/complaints', icon: AlertCircle },
      { label: 'Gate', href: '/visitors', icon: ShieldCheck },
      { label: 'Notices', href: '/notices', icon: Megaphone },
    ];
  };

  const links = getLinks();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 py-2 px-4 flex justify-around items-center md:hidden shadow-lg">
      {links.map((link) => {
        const isActive = pathname === link.href;
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-xs font-medium transition-colors ${
              isActive ? 'text-brand-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
            <span className="mt-1 text-[10px]">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}


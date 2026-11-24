'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppNavbar } from './AppNavbar';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav';
import { AuthUser } from '@localos/types';

interface PortalLayoutProps {
  children: React.ReactNode;
}

export function PortalLayout({ children }: PortalLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch('/api/v1/auth/me');
        const json = await res.json();
        if (json.success && json.data?.user) {
          setUser(json.data.user);
        } else {
          router.push('/login');
        }
      } catch (e) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    async function fetchNotifications() {
      try {
        const res = await fetch('/api/v1/notifications');
        const json = await res.json();
        if (json.success && json.data) {
          setUnreadCount(json.data.unreadCount || 0);
        }
      } catch (e) {}
    }

    fetchMe();
    fetchNotifications();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-500">Loading LocalOS...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <AppNavbar user={user} unreadCount={unreadCount} />
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <AppSidebar user={user} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 overflow-y-auto max-w-full">
          {children}
        </main>
      </div>
      <MobileNav user={user} />
    </div>
  );
}

